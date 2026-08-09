/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface WindowEventMap {
  'vite:preloadError': CustomEvent<{ payload: Error }>;
}
