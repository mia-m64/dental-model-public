import { defineConfig, loadEnv } from 'vite';

// Strict Content-Security-Policy for the built site. GitHub Pages cannot send
// custom headers, so it goes in a <meta> tag. Not applied in dev because Vite's
// dev server injects inline styles for hot reload.
const csp = (supabaseUrl) => [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'", // wasm: Draco mesh decoder
  "worker-src 'self' blob:", // Draco decodes in a Web Worker created from a blob
  "style-src 'self'",
  "img-src 'self' data: blob:",
  `connect-src 'self' data: blob:${supabaseUrl ? ' ' + new URL(supabaseUrl).origin : ''}`, // + Supabase (sign-in, notes)
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    base: './',
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
      rolldownOptions: {
        input: { home: 'index.html', model: 'model.html', learn: 'learn.html', tooth: 'tooth.html', sources: 'sources.html' },
      },
    },
    plugins: [
      {
        name: 'csp-meta',
        apply: 'build',
        transformIndexHtml: () => [
          {
            tag: 'meta',
            attrs: { 'http-equiv': 'Content-Security-Policy', content: csp(env.VITE_SUPABASE_URL) },
            injectTo: 'head-prepend',
          },
        ],
      },
    ],
  };
});
