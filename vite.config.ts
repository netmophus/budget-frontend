/// <reference types="vitest/config" />
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Vitest ne doit pas charger les specs Playwright (Lot 6.2.B) :
    // `test.describe` de @playwright/test entre en conflit avec
    // l'API Vitest. Les Playwright tests sont lancés via leur propre
    // runner (`npm run test:e2e:playwright`).
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/playwright/**'],
  },
});
