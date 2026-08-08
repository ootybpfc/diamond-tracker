// Vercel Serverless Function: /api/polish-content
// Calls GitHub Models API server-side — token never exposed to client.
// Uses Node.js runtime with standard Vercel (req, res) handler.

import type { VercelRequest, VercelResponse } from '@vercel/node';

const GITHUB_MODELS_URL = 'https://models.inference.ai.azure.com/chat/completions';
const MODEL = 'meta-llama-3.1-8b-instruct';
const TIMEOUT_MS = 10000;

interface RequestBody {
  text: string;
  type: 'reading' | 'podcast';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'GITHUB_TOKEN not configured' });
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
    const apiRes = await fetch(GITHUB_MODELS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 200,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!apiRes.ok) {
      return res.status(502).json({ error: `GitHub Models API error: ${apiRes.status}` });
    }

    const data = await apiRes.json();
    const polished = data.choices?.[0]?.message?.content?.trim();

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
