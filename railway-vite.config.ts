import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'server/_core/index.ts'),
      },
      output: {
        entryFileNames: 'index.js',
        format: 'es',
      },
    },
    copyPublicDir: true, // ينسخ public → dist
  },
  publicDir: 'public',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'server'),
    },
  },
});
