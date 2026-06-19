import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The frontend talks to the backend via VITE_API_BASE_URL (see .env.example).
// In dev we also proxy /api to the backend so you can run cross-origin-free.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      // Proxy the Socket.IO websocket to the backend so the client can connect
      // same-origin in development.
      '/socket.io': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
