// Vercel Serverless Function: /api/polish-content
// Calls the Google Generative Language API (Gemini) server-side — key never exposed to client.
// Uses Node.js runtime with standard Vercel (req, res) handler.

import type { VercelRequest, VercelResponse } from '@vercel/node';

// AI provider: Google Gemini `generateContent` REST API (GitHub Models was retired 2026-07-30).
// Override the model via GEMINI_MODEL_NAME; the request URL is derived from GEMINI_API_BASE + model.
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

const TIMEOUT_MS = 10000;

interface RequestBody {
  text: string;
  type: 'reading' | 'podcast';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const model = process.env.GEMINI_MODEL_NAME || process.env.AI_MODEL_NAME || DEFAULT_MODEL;
  const { apiKey, source } = resolveApiKey(req);
  const aiUrl = process.env.AI_ENDPOINT_URL || `${GEMINI_API_BASE}/${model}:generateContent`;
  if (!apiKey) {
    return res.status(500).json({ error: NO_KEY_MESSAGE });
  }

  const { text, type } = (req.body || {}) as RequestBody;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing text field' });
  }

  const systemPrompt =
    'You are a concise copywriter. Turn the user\'s raw note into 3–5 short WhatsApp-ready bullet points. Use emoji sparingly. Keep it under 80 words total. No preamble, no greeting, just the bullets.';

  const userPrompt = `Type: ${type || 'reading'}\n\nRaw note:\n${text}`;

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
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 200 },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!apiRes.ok) {
      const detail = await apiRes.text().catch(() => '');
      return res.status(502).json({ error: describeProviderError(apiRes.status, detail, source) });
    }

    const data = await apiRes.json();
    const polished = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!polished) {
      return res.status(502).json({ error: 'Empty response from model' });
    }

    return res.status(200).json({ polished });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === 'AbortError') {
      return res.status(504).json({ error: 'Model timed out' });
    }
    return res.status(502).json({ error: 'Failed to reach AI service' });
  }
}
