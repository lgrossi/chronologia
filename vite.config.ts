/// <reference types="vitest" />
import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * GitHub Pages has no SPA rewrite: a hard refresh or external deep link to a
 * client route (e.g. /chronologia/linha or /chronologia/resumo?month=…) hits a
 * file that doesn't exist and returns the Pages 404. Emitting a byte-copy of
 * index.html as 404.html makes Pages serve the SPA shell for unknown paths, and
 * the router resolves the route client-side. The service worker's nav fallback
 * only helps after a prior visit; this covers the cold first load too.
 */
function spaFallback(): Plugin {
  return {
    name: 'spa-404',
    apply: 'build',
    closeBundle() {
      const dist = resolve(process.cwd(), 'dist');
      copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'));
    },
  };
}

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [
    react(),
    spaFallback(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Chronologia',
        short_name: 'Chronologia',
        lang: 'pt-BR',
        description: 'Diário de Crohn',
        theme_color: '#3F5A43',
        background_color: '#F4EEE0',
        display: 'standalone',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
