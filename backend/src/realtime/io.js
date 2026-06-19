import { Server } from 'socket.io';
import { config } from '../config/env.js';

let io = null;

/**
 * Attach a Socket.IO server to the given HTTP server. Clients join a per-event
 * room (`event:<id>`) and receive `seats:changed` broadcasts whenever seat
 * statuses move (reserve / book / release / expire).
 */
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

/**
 * Broadcast seat status changes to everyone viewing an event. No-ops when the
 * realtime server isn't initialized (e.g. during unit tests), so callers can
 * emit unconditionally.
 *
 * @param {string} eventId
 * @param {{ seatNumber: string, status: string }[]} seats
 */
export function emitSeatStatus(eventId, seats) {
  if (!io || !eventId || !seats?.length) return;
  io.to(`event:${String(eventId)}`).emit('seats:changed', {
    eventId: String(eventId),
    seats: seats.map((s) => ({ seatNumber: s.seatNumber, status: s.status })),
  });
}
