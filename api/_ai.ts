// Shared Gemini config for the serverless functions.
// Files prefixed with "_" are not turned into routes by Vercel.

import type { VercelRequest } from '@vercel/node';

export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
export const DEFAULT_MODEL = 'gemini-1.5-flash';

/**
 * Resolve which Gemini key to use for this request.
 *
 * Users can bring their own key from Google AI Studio, sent per-request in the
 * `x-user-api-key` header and never stored server-side. If they haven't set
 * one, we fall back to the project's shared key from the environment.
 */
export function resolveApiKey(req: VercelRequest): { apiKey?: string; source: 'user' | 'shared' | 'none' } {
  const header = req.headers['x-user-api-key'];
  const userKey = (Array.isArray(header) ? header[0] : header)?.trim();

  if (userKey) return { apiKey: userKey, source: 'user' };

  const sharedKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  if (sharedKey) return { apiKey: sharedKey, source: 'shared' };

  return { source: 'none' };
}

export function resolveModel(): string {
  return process.env.GEMINI_MODEL_NAME || process.env.AI_MODEL_NAME || DEFAULT_MODEL;
}

export function resolveUrl(model: string): string {
  return process.env.AI_ENDPOINT_URL || `${GEMINI_API_BASE}/${model}:generateContent`;
}

/**
 * Gemini returns 400 INVALID_ARGUMENT for a malformed key and 429 for quota.
 * Surface those distinctly so the UI can tell the user to check their own key
 * rather than showing a generic failure.
 */
export function describeProviderError(status: number, detail: string, source: 'user' | 'shared'): string {
  const whose = source === 'user' ? 'your' : "the app's";

  if (status === 400 && /API key not valid|API_KEY_INVALID/i.test(detail)) {
    return `${source === 'user' ? 'Your' : "The app's"} Gemini API key was rejected. Check it in Settings.`;
  }
  if (status === 403) {
    return `${whose} Gemini API key does not have access to this model.`;
  }
  if (status === 429) {
    return `${whose} Gemini quota is exhausted. Try again later${source === 'shared' ? ' or add your own key in Settings' : ''}.`;
  }
  return `AI provider error: ${status}${detail ? ` — ${detail.slice(0, 200)}` : ''}`;
}
