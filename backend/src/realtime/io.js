import { Server } from 'socket.io';
import { config } from '../config/env.js';

let io = null;

export function initRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: config.clientOrigins.length ? config.clientOrigins : true,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    socket.on('event:join', (eventId) => {
      if (typeof eventId === 'string' && eventId) socket.join(`event:${eventId}`);
    });
    socket.on('event:leave', (eventId) => {
      if (typeof eventId === 'string' && eventId) socket.leave(`event:${eventId}`);
    });
  });

  return io;
}

export function emitSeatStatus(eventId, seats) {
  if (!io || !eventId || !seats?.length) return;
  io.to(`event:${String(eventId)}`).emit('seats:changed', {
    eventId: String(eventId),
    seats: seats.map((s) => ({ seatNumber: s.seatNumber, status: s.status })),
  });
}
