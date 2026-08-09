/**
 * Service worker registration and recovery.
 *
 * The previous setup could leave the installed PWA in a dead state after a
 * deploy. The generated worker uses skipWaiting + clientsClaim and precaches
 * index.html behind a NavigationRoute, while cleanupOutdatedCaches drops the
 * previous precache. But the injected registerSW.js only ever called
 * `navigator.serviceWorker.register(...)` — it never reacted to a new worker
 * taking control.
 *
 * So an already-open app would suddenly be controlled by the new worker while
 * still running the old build's JavaScript, with the old hashed assets deleted
 * from the cache and gone from the server (Vercel only serves the current
 * deployment). Anything the page loaded from that point 404'd, leaving a blank,
 * frozen screen that only a full close-and-reopen fixed.
 *
 * Two guarantees here:
 *   1. When a new worker takes over, reload once so the running code and the
 *      cached assets are always from the same build.
 *   2. If an asset fails to load anyway, purge caches and workers and reload —
 *      once — rather than sitting there broken.
 */

import { registerSW } from 'virtual:pwa-register';

/** Survives reloads within the tab, so recovery can never become a loop. */
const RECOVERY_FLAG = 'dt.sw.recovering';
const UPDATE_CHECK_MS = 60 * 60 * 1000;

/** Nuke every cache and worker, then reload. Guarded to run at most once. */
async function hardRecover(reason: string): Promise<void> {
  if (sessionStorage.getItem(RECOVERY_FLAG)) {
    // Already tried this. Reloading again would just spin.
    console.error(`[pwa] recovery already attempted, not retrying (${reason})`);
    return;
  }
  sessionStorage.setItem(RECOVERY_FLAG, '1');
  console.warn(`[pwa] recovering from broken cache state: ${reason}`);

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch (err) {
    console.error('[pwa] cache teardown failed', err);
  }

  window.location.reload();
}

/**
 * Detect the "page is running stale code" failure. A missing bundle surfaces as
 * a resource error on a <script>/<link>, or as a Vite preload rejection.
 */
function watchForStaleAssets(): void {
  window.addEventListener(
    'error',
    (event) => {
      const el = event.target as HTMLElement | null;
      if (!el || el === (window as unknown as HTMLElement)) return;

      const tag = el.tagName;
      if (tag !== 'SCRIPT' && tag !== 'LINK') return;

      const url =
        (el as HTMLScriptElement).src || (el as HTMLLinkElement).href || '';
      // Only our own build output. Third-party embeds failing is not our problem.
      if (!url.startsWith(window.location.origin)) return;
      if (!url.includes('/assets/')) return;

      void hardRecover(`failed to load ${url}`);
    },
    true, // capture: resource errors do not bubble
  );

  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    void hardRecover('vite preload error');
  });
}

export function setupPWA(): void {
  if (import.meta.env.DEV) return;

  watchForStaleAssets();

  if (!('serviceWorker' in navigator)) return;

  // A worker calling skipWaiting will claim this page mid-session. Reload so the
  // DOM and the cache agree on which build we are running.
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // registerType is 'autoUpdate', so apply it straight away rather than
      // waiting for a prompt the UI never shows.
      void updateSW(true);
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Long-lived installed PWAs can go days without a navigation, so poll.
      setInterval(() => void registration.update(), UPDATE_CHECK_MS);
      // And check whenever the user brings the app back to the foreground.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration.update();
      });
    },
    onRegisterError(err) {
      console.error('[pwa] service worker registration failed', err);
    },
  });

  // Made it to a working render, so any earlier recovery clearly succeeded.
  window.addEventListener('load', () => {
    sessionStorage.removeItem(RECOVERY_FLAG);
  });
}
