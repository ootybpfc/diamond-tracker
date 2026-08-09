// Vercel Serverless Function: /api/transcribe
// Transcribes recorded audio with Gemini. Far more accurate than the browser's
// built-in Web Speech API, especially for accents and domain jargon, and it
// works on iOS Safari where Web Speech is unavailable.

import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-1.5-flash';

// --- Key resolution (inlined) ---
// This was briefly a shared ./_ai module, but package.json sets "type": "module",
// so the extensionless relative import failed to resolve at runtime on Vercel and
// crashed the function with FUNCTION_INVOCATION_FAILED before any handler code ran.
// Keeping it inline avoids that class of failure entirely.

/**
 * Users can bring their own Gemini key from Google AI Studio, sent per-request
 * in `x-user-api-key` and never stored server-side. Otherwise fall back to the
 * project's shared key.
 */
function resolveApiKey(req: VercelRequest): { apiKey?: string; source: 'user' | 'shared' } {
  const header = req.headers['x-user-api-key'];
  const userKey = (Array.isArray(header) ? header[0] : header)?.trim();
  if (userKey) return { apiKey: userKey, source: 'user' };
  return { apiKey: process.env.GEMINI_API_KEY || process.env.AI_API_KEY, source: 'shared' };
}

/** Turn provider failures into something the user can act on. */
function describeProviderError(status: number, detail: string, source: 'user' | 'shared'): string {
  if (status === 400 && /API key not valid|API_KEY_INVALID/i.test(detail)) {
    return source === 'user'
      ? 'Your Gemini API key was rejected. Check it in Settings.'
      : "The app's Gemini API key was rejected. The owner needs to update it.";
  }
  if (status === 403) {
    return `${source === 'user' ? 'Your' : "The app's"} Gemini API key does not have access to this model.`;
  }
  if (status === 429) {
    return source === 'user'
      ? 'Your Gemini quota is exhausted. Try again later.'
      : "The app's Gemini quota is exhausted. Add your own key in Settings to keep going.";
  }
  return `AI provider error: ${status}${detail ? ` — ${detail.slice(0, 200)}` : ''}`;
}

const NO_KEY_MESSAGE =
  'No Gemini API key available. Add your own key under Settings, or ask the owner to set GEMINI_API_KEY.';

const TIMEOUT_MS = 55000;
// Vercel caps request bodies at 4.5MB, and base64 inflates bytes by ~33%.
// Staying at 4M chars keeps us safely under that while still allowing roughly
// 12 minutes of Opus audio at the 32kbps the client records at.
const MAX_BASE64_CHARS = 4_000_000;

const ALLOWED_MIME = [
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/aac',
  'audio/flac',
];

interface RequestBody {
  audio: string;
  mimeType: string;
  language?: string;
  context?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { apiKey, source } = resolveApiKey(req);
  if (!apiKey) {
    return res.status(500).json({ error: NO_KEY_MESSAGE });
  }

  const { audio, mimeType, language, context } = (req.body || {}) as RequestBody;

  if (!audio || typeof audio !== 'string') {
    return res.status(400).json({ error: 'Missing audio field' });
  }
  if (audio.length > MAX_BASE64_CHARS) {
    return res.status(413).json({ error: 'Recording is too long. Keep it under about 10 minutes.' });
  }

  // Strip any data-URL prefix and normalise the codec suffix ("audio/webm;codecs=opus").
  const base64 = audio.includes(',') ? audio.slice(audio.indexOf(',') + 1) : audio;
  const baseMime = (mimeType || 'audio/webm').split(';')[0].trim().toLowerCase();
  if (!ALLOWED_MIME.includes(baseMime)) {
    return res.status(400).json({ error: `Unsupported audio format: ${baseMime}` });
  }

  const languageLine =
    language && language !== 'auto'
      ? `The speaker is talking in ${language}. Transcribe in that language.`
      : 'Detect the spoken language and transcribe in that same language.';

  const systemPrompt = [
    'You are a precise audio transcriber.',
    'Return ONLY the verbatim transcript of the speech in the audio.',
    languageLine,
    'Apply sensible punctuation, capitalisation and paragraph breaks.',
    'Remove filler sounds such as "um" and "uh", plus stutters and false starts.',
    'Do not summarise, translate, answer, or add commentary of any kind.',
    'Do not add speaker labels or timestamps unless multiple distinct speakers are clearly present.',
    'If the audio contains no intelligible speech, return exactly: [no speech detected]',
  ].join(' ');

  const userParts: Array<Record<string, unknown>> = [];
  if (context) {
    // Proper nouns and jargon in the prompt measurably improve accuracy.
    userParts.push({ text: `Helpful context for spelling names and jargon: ${context}` });
  }
  userParts.push({ text: 'Transcribe this audio.' });
  userParts.push({ inline_data: { mime_type: baseMime, data: base64 } });

  const model = process.env.GEMINI_MODEL_NAME || process.env.AI_MODEL_NAME || DEFAULT_MODEL;
  const aiUrl = process.env.AI_ENDPOINT_URL || `${GEMINI_API_BASE}/${model}:generateContent`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const apiRes = await fetch(aiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: userParts }],
        // Deterministic output — this is transcription, not creative writing.
        generationConfig: { temperature: 0, maxOutputTokens: 4096 },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!apiRes.ok) {
      const detail = await apiRes.text().catch(() => '');
      return res.status(502).json({ error: describeProviderError(apiRes.status, detail, source) });
    }

    const data = await apiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text || text === '[no speech detected]') {
      return res.status(200).json({ text: '', empty: true });
    }

    return res.status(200).json({ text });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === 'AbortError') {
      return res.status(504).json({ error: 'Transcription timed out. Try a shorter recording.' });
    }
    return res.status(502).json({ error: 'Failed to reach the transcription service' });
  }
}
