import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const base = process.env.VITE_BASE_PATH || '/';

const readSharedCapability = () => {
  if (process.env.TRADEVAULT_SHARED_CAPABILITY) {
    return process.env.TRADEVAULT_SHARED_CAPABILITY.trim();
  }

  try {
    const values = Object.fromEntries(
      readFileSync(resolve('tmp/tradevault-production.local'), 'utf8')
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(line => {
          const separator = line.indexOf('=');
          return separator === -1
            ? [line, '']
            : [line.slice(0, separator), line.slice(separator + 1)];
        })
    );
    if (values.TRADEVAULT_VAULT_ID && values.TRADEVAULT_VAULT_SECRET) {
      return `${values.TRADEVAULT_VAULT_ID}.${values.TRADEVAULT_VAULT_SECRET}`;
    }
  } catch {}

  return '';
};

const sharedCapability = readSharedCapability();

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  define: {
    __TRADEVAULT_SHARED_CAPABILITY__: JSON.stringify(sharedCapability),
  },
  server: { open: true },
  build: {
    sourcemap: false,
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('recharts') || id.includes('/d3-') || id.includes('victory-vendor')) return 'charts';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('lucide-react')) return 'icons';
          return 'vendor';
        },
      },
    },
  },
});
