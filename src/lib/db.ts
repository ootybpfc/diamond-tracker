import { AIQueueEntry, ContentType } from '../types/database';
import { hashString } from './utils';

const DB_NAME = 'diamond-tracker';
const DB_VERSION = 1;
const STORE_CACHE = 'ai_cache';
const STORE_QUEUE = 'ai_queue';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB upgrade blocked by another tab'));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'id' });
      }
    };
  });

  // Never cache a rejected handle — otherwise a single transient failure
  // permanently disables the AI cache and offline queue for the session.
  dbPromise = dbPromise.catch((err) => {
    dbPromise = null;
    throw err;
  });

  return dbPromise;
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(store, mode);
        const objectStore = transaction.objectStore(store);
        const request = fn(objectStore);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        // A transaction can abort without the request firing onerror, which
        // would leave the returned promise pending forever.
        transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
        transaction.onerror = () => reject(transaction.error);
      })
  );
}

// ---- Cache operations ----

interface CacheEntry {
  key: string;
  result: string | string[];
  created_at: string;
}

export async function getCachedResult(text: string, type?: string): Promise<string | string[] | null> {
  try {
    const key = hashString(text + (type || ''));
    const entry = await tx<CacheEntry>(STORE_CACHE, 'readonly', (s) => s.get(key));
    return entry?.result ?? null;
  } catch {
    return null;
  }
}

export async function setCachedResult(text: string, result: string | string[], type?: string): Promise<void> {
  try {
    const key = hashString(text + (type || ''));
    const entry: CacheEntry = { key, result, created_at: new Date().toISOString() };
    await tx(STORE_CACHE, 'readwrite', (s) => s.put(entry));
  } catch {
    // IndexedDB might be blocked — silently ignore
  }
}

// ---- Queue operations ----

export async function enqueueAI(entry: Omit<AIQueueEntry, 'id' | 'created_at'>): Promise<AIQueueEntry> {
  const full: AIQueueEntry = {
    ...entry,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  try {
    await tx(STORE_QUEUE, 'readwrite', (s) => s.add(full));
  } catch {
    // If IndexedDB is blocked, the entry is just lost — acceptable degradation
  }
  return full;
}

export async function getQueuedItems(): Promise<AIQueueEntry[]> {
  try {
    const items = await tx<AIQueueEntry[]>(STORE_QUEUE, 'readonly', (s) => s.getAll());
    return items.sort((a, b) => a.created_at.localeCompare(b.created_at));
  } catch {
    return [];
  }
}

export async function dequeueAI(id: string): Promise<void> {
  try {
    await tx(STORE_QUEUE, 'readwrite', (s) => s.delete(id));
  } catch {
    // ignore
  }
}

export async function updateQueueEntry(id: string, updates: Partial<AIQueueEntry>): Promise<void> {
  try {
    const existing = await tx<AIQueueEntry>(STORE_QUEUE, 'readonly', (s) => s.get(id));
    if (existing) {
      await tx(STORE_QUEUE, 'readwrite', (s) => s.put({ ...existing, ...updates }));
    }
  } catch {
    // ignore
  }
}
