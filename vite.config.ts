import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  base: '/teambridge-automation/',
  plugins: [react()],
  resolve: {
    alias: {
      '@alloy': resolve(__dirname, '../Alloy/src'),
      '@': resolve(__dirname, 'src'),
    },
  },
  css: {
    preprocessorOptions: {},
  },
  // Serve node_modules font files as static assets during dev.
  // Respect PORT env variable so the preview harness can assign a specific
  // port; default to 5183 because 5173 collides with sibling worktrees
  // (every worktree's Vite tries 5173 by default, so the second to start
  // hits EADDRINUSE). `strictPort: false` lets Vite walk to the next free
  // port if even the chosen one is taken.
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5183,
    strictPort: false,
    fs: {
      allow: ['..'],
    },
  },
});
