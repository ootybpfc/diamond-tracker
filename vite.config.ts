import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registration is handled in src/lib/pwa.ts so updates can be applied
      // and recovered from; the auto-injected script only ever registered.
      injectRegister: null,
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Diamond Tracker',
        short_name: 'Diamond',
        description: 'Daily business activity tracker for solo entrepreneurs',
        theme_color: '#12151A',
        background_color: '#12151A',
        display: 'standalone',
        orientation: 'portrait',
        // The app is built with `base: './'` and uses HashRouter, so absolute
        // paths break the installed PWA when it isn't served from the domain root.
        start_url: './',
        scope: './',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: 'index.html',
        // API routes are server functions, never the SPA shell.
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  base: './',
});
