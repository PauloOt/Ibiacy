import { defineConfig } from 'vite';

// base relativa: o mesmo build funciona no GitHub Pages (/Ibiacy/) e na Vercel (/)
export default defineConfig({
  base: './',
  server: { port: 5180 },
});
