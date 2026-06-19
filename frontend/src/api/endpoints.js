import { api } from './client.js';

export const authApi = {
  register: (payload) => api.post('/auth/register', payload).then((r) => r.data),
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};

export const eventApi = {
  list: () => api.get('/events').then((r) => r.data),
  get: (id) => api.get(`/events/${id}`).then((r) => r.data),
};

export const bookingApi = {
  reserve: (eventId, seatNumbers) =>
    api.post('/reserve', { eventId, seatNumbers }).then((r) => r.data),
  confirm: (reservationId) =>
    api.post('/bookings', { reservationId }).then((r) => r.data),
  mine: () => api.get('/bookings/me').then((r) => r.data),
  get: (id) => api.get(`/bookings/${id}`).then((r) => r.data),
  checkin: (id) => api.post(`/bookings/${id}/checkin`).then((r) => r.data),
};
