/**
 * Storage that cannot throw.
 *
 * `window.localStorage` is not a plain property — reading it invokes a getter
 * that throws a SecurityError outright when the browser is blocking site data.
 * That happens in more situations than it sounds: "Block all cookies" in
 * Chrome/Edge, Safari with cross-site tracking prevention in some embedded
 * contexts, Firefox's "Never remember history", enterprise policy, and most
 * in-app webviews (WhatsApp, Instagram, LinkedIn, Gmail).
 *
 * Crucially, guarding with `typeof localStorage === 'undefined'` does NOT help:
 * the operand still has to be evaluated, so the guard throws before any
 * surrounding try/catch that was written a line too late. Every access has to
 * be inside a try block, which is what this module exists to enforce.
 *
 * When real storage is unavailable we fall back to an in-memory map. The app
 * then works normally for the length of the session and simply forgets on
 * close, which is a far better outcome than a crash.
 */

type StorageKind = 'local' | 'session';

/** Per-kind memory fallback, used when the real store is unreachable. */
const memory: Record<StorageKind, Map<string, string>> = {
  local: new Map(),
  session: new Map(),
};

/** Cached so we probe once rather than on every read. */
const available: Partial<Record<StorageKind, boolean>> = {};

/**
 * Reading the property AND round-tripping a value. Some browsers expose the
 * object but throw on write, so presence alone is not enough of a test.
 */
function probe(kind: StorageKind): boolean {
  try {
    const store = kind === 'local' ? window.localStorage : window.sessionStorage;
    if (!store) return false;
    const probeKey = '__dt_probe__';
    store.setItem(probeKey, '1');
    store.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

function isAvailable(kind: StorageKind): boolean {
  if (available[kind] === undefined) available[kind] = probe(kind);
  return available[kind]!;
}

function raw(kind: StorageKind): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function storageAvailable(kind: StorageKind = 'local'): boolean {
  return isAvailable(kind);
}

export function readItem(key: string, kind: StorageKind = 'local'): string | null {
  if (isAvailable(kind)) {
    try {
      return raw(kind)?.getItem(key) ?? null;
    } catch {
      // Permissions can change mid-session; fall through to memory.
    }
  }
  return memory[kind].get(key) ?? null;
}

export function writeItem(key: string, value: string, kind: StorageKind = 'local'): void {
  memory[kind].set(key, value);
  if (!isAvailable(kind)) return;
  try {
    raw(kind)?.setItem(key, value);
  } catch {
    // Quota exceeded or storage revoked. The memory copy above still stands.
  }
}

export function removeItem(key: string, kind: StorageKind = 'local'): void {
  memory[kind].delete(key);
  if (!isAvailable(kind)) return;
  try {
    raw(kind)?.removeItem(key);
  } catch {
    // Nothing useful to do.
  }
}
