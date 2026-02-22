import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/20k-10mil-challenge/',
  plugins: [react(), tailwindcss()],
  server: { open: true }
});
