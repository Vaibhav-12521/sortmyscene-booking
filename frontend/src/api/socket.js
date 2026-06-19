import { io } from 'socket.io-client';

// In dev we connect to the same origin and let Vite proxy /socket.io to the
// backend (see vite.config.js). For a split deployment, set VITE_SOCKET_URL to
// the backend origin.
const url = import.meta.env.VITE_SOCKET_URL || undefined;

export const socket = io(url, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});
