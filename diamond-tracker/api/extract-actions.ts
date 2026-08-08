// Vercel Serverless Function: /api/extract-actions
// Calls GitHub Models API server-side — token never exposed to client.
// Uses Node.js runtime with standard Vercel (req, res) handler.

import type { VercelRequest, VercelResponse } from '@vercel/node';

const GITHUB_MODELS_URL = 'https://models.inference.ai.azure.com/chat/completions';
const MODEL = 'meta-llama-3.1-8b-instruct';
const TIMEOUT_MS = 10000;

interface RequestBody {
  notes: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'GITHUB_TOKEN not configured' });
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
          { role: 'user', content: notes },
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!apiRes.ok) {
      return res.status(502).json({ error: `GitHub Models API error: ${apiRes.status}` });
    }

    const data = await apiRes.json();
    const rawContent = data.choices?.[0]?.message?.content?.trim() || '';

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
