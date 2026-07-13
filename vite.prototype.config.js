import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  publicDir: 'prototype/public',
  server: { host: '127.0.0.1', port: 4180 },
  preview: { host: '127.0.0.1', port: 4181 },
  build: {
    outDir: 'dist-prototype',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: resolve(process.cwd(), 'prototype.html'),
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
});
