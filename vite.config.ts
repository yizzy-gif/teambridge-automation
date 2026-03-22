import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@alloy': resolve(__dirname, 'node_modules/alloy-design-system/src'),
      '@': resolve(__dirname, 'src'),
    },
  },
  css: {
    preprocessorOptions: {},
  },
  // Serve node_modules font files as static assets during dev
  // Respect PORT env variable so preview tools can assign a specific port
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    strictPort: true,
    fs: {
      allow: ['..'],
    },
  },
});
