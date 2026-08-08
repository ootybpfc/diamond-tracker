// Vercel Serverless Function: /api/extract-actions
// Calls the Google Generative Language API (Gemini) server-side — key never exposed to client.
// Uses Node.js runtime with standard Vercel (req, res) handler.

import type { VercelRequest, VercelResponse } from '@vercel/node';

// AI provider: Google Gemini `generateContent` REST API (GitHub Models was retired 2026-07-30).
// Override the model via GEMINI_MODEL_NAME; the request URL is derived from GEMINI_API_BASE + model.
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-1.5-flash';
const TIMEOUT_MS = 10000;

interface RequestBody {
  notes: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const model = process.env.GEMINI_MODEL_NAME || process.env.AI_MODEL_NAME || DEFAULT_MODEL;
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  const aiUrl = process.env.AI_ENDPOINT_URL || `${GEMINI_API_BASE}/${model}:generateContent`;
  if (!apiKey) {
    return res.status(500).json({ error: 'AI API key not configured (set GEMINI_API_KEY)' });
  }

  const { notes } = (req.body || {}) as RequestBody;
  if (!notes || typeof notes !== 'string') {
    return res.status(400).json({ error: 'Missing notes field' });
  }

  const systemPrompt =
    'Extract only concrete, actionable to-do items from the following coaching notes. Respond with ONLY a valid JSON array of short imperative strings. Use [] if none found. No markdown fences, no explanation.';

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
        contents: [{ role: 'user', parts: [{ text: notes }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 300 },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!apiRes.ok) {
      const detail = await apiRes.text().catch(() => '');
      return res.status(502).json({ error: `AI provider error: ${apiRes.status}${detail ? ` — ${detail.slice(0, 200)}` : ''}` });
    }

    const data = await apiRes.json();
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    // Defensive JSON parsing
    let actions: string[] = [];

    // Strip markdown code fences if present
    const cleaned = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        actions = parsed
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .map((item: string) => item.trim());
      }
    } catch {
      // JSON parse failed — fall back to line splitting
      actions = cleaned
        .split('\n')
        .map((line: string) => line.replace(/^[-*•]\s*/, '').trim())
        .filter((line: string) => line.length > 0 && !line.startsWith('[') && !line.startsWith(']'));
    }

    return res.status(200).json({ actions });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === 'AbortError') {
      return res.status(504).json({ error: 'Model timed out' });
    }
    return res.status(502).json({ error: 'Failed to reach AI service' });
  }
}
