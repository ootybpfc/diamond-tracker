import { ContentType } from '../types/database';
import { getCachedResult, setCachedResult, enqueueAI, getQueuedItems, dequeueAI } from './db';
import { aiHeaders } from './settings';

export type AIStatus = 'idle' | 'loading' | 'done' | 'error' | 'queued' | 'cached';

export interface AIResult {
  polished?: string;
  actions?: string[];
  status: AIStatus;
  cached?: boolean;
  queued?: boolean;
}

/**
 * Call /api/polish-content with offline resilience.
 * 1. If offline, check IndexedDB cache first. If cached, return cached.
 * 2. If no cache and offline, queue the request and return queued status.
 * 3. If online, call the API. Cache successful results.
 */
export async function polishContent(
  text: string,
  type: ContentType,
  options?: { contentEntryId?: string; onQueue?: () => void }
): Promise<AIResult> {
  const cache = await getCachedResult(text, type);
  const isOnline = navigator.onLine;

  if (!isOnline) {
    if (cache && typeof cache === 'string') {
      return { polished: cache, status: 'cached', cached: true };
    }
    await enqueueAI({
      type: 'polish',
      payload: { text, type },
      contentEntryId: options?.contentEntryId,
    });
    options?.onQueue?.();
    return { status: 'queued', queued: true };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch('/api/polish-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...aiHeaders() },
      body: JSON.stringify({ text, type }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      if (cache && typeof cache === 'string') {
        return { polished: cache, status: 'cached', cached: true };
      }
      return { status: 'error' };
    }

    const data = await res.json();
    const polished = data.polished as string;

    await setCachedResult(text, polished, type);

    return { polished, status: 'done' };
  } catch {
    if (cache && typeof cache === 'string') {
      return { polished: cache, status: 'cached', cached: true };
    }
    return { status: 'error' };
  }
}

/**
 * Call /api/extract-actions with offline resilience.
 */
export async function extractActions(
  notes: string,
  options?: { coachSessionId?: string; onQueue?: () => void }
): Promise<AIResult> {
  const cache = await getCachedResult(notes, 'extract');
  const isOnline = navigator.onLine;

  if (!isOnline) {
    if (cache && Array.isArray(cache)) {
      return { actions: cache, status: 'cached', cached: true };
    }
    await enqueueAI({
      type: 'extract',
      payload: { notes },
      coachSessionId: options?.coachSessionId,
    });
    options?.onQueue?.();
    return { status: 'queued', queued: true };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch('/api/extract-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...aiHeaders() },
      body: JSON.stringify({ notes }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      if (cache && Array.isArray(cache)) {
        return { actions: cache, status: 'cached', cached: true };
      }
      return { status: 'error' };
    }

    const data = await res.json();
    const actions = data.actions as string[];

    await setCachedResult(notes, actions, 'extract');

    return { actions, status: 'done' };
  } catch {
    if (cache && Array.isArray(cache)) {
      return { actions: cache, status: 'cached', cached: true };
    }
    return { status: 'error' };
  }
}

/**
 * Process the offline AI queue when connectivity returns.
 * Calls the provided callbacks to update Supabase with results.
 */
export async function processQueue(callbacks: {
  onPolish?: (entry: { text: string; type: ContentType; contentEntryId?: string; result: string }) => Promise<void>;
  onExtract?: (entry: { notes: string; coachSessionId?: string; result: string[] }) => Promise<void>;
}): Promise<void> {
  const queue = await getQueuedItems();
  for (const item of queue) {
    try {
      if (item.type === 'polish') {
        const payload = item.payload as { text: string; type: ContentType };
        const result = await polishContent(payload.text, payload.type);
        if (result.status === 'done' && result.polished && callbacks.onPolish) {
          await callbacks.onPolish({
            text: payload.text,
            type: payload.type,
            contentEntryId: item.contentEntryId,
            result: result.polished,
          });
        }
      } else if (item.type === 'extract') {
        const payload = item.payload as { notes: string };
        const result = await extractActions(payload.notes);
        if (result.status === 'done' && result.actions && callbacks.onExtract) {
          await callbacks.onExtract({
            notes: payload.notes,
            coachSessionId: item.coachSessionId,
            result: result.actions,
          });
        }
      }
      await dequeueAI(item.id);
    } catch {
      // Leave in queue for next retry
    }
  }
}

/** Convert a recorded blob to base64 without blowing the stack on large files. */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the recording'));
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Transcribe recorded audio via /api/transcribe (Gemini).
 * Requires connectivity — audio is too large to queue offline usefully.
 */
export async function transcribeAudio(
  blob: Blob,
  mimeType: string,
  options?: { language?: string; context?: string }
): Promise<{ text: string; error?: string }> {
  if (!navigator.onLine) {
    return { text: '', error: 'Voice notes need a connection. Type it for now, or try again once you are back online.' };
  }

  try {
    const audio = await blobToBase64(blob);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    const res = await fetch('/api/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...aiHeaders() },
      body: JSON.stringify({
        audio,
        mimeType,
        language: options?.language,
        context: options?.context,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      return { text: '', error: (detail as { error?: string }).error || `Transcription failed (${res.status})` };
    }

    const data = (await res.json()) as { text?: string };
    return { text: data.text ?? '' };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { text: '', error: 'Transcription timed out. Try a shorter recording.' };
    }
    return { text: '', error: 'Could not reach the transcription service.' };
  }
}
