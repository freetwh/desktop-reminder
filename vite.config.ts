import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Tauri serves the production bundle from its custom protocol. Relative
  // URLs keep JS, CSS, and public assets resolvable in both dev and packaged builds.
  base: './',
  clearScreen: false,
  server: {
    host: '127.0.0.1',
    port: 1420,
    strictPort: true,
  },
});
