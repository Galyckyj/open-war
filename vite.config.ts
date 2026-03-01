import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true, // слухає на 0.0.0.0 — доступно з телефону в локальній мережі
    proxy: {
      '/ws': {
        target: 'ws://127.0.0.1:3001',
        ws: true,
        rewrite: (path) => path, // залишаємо /ws як є
      },
    },
  },
});
