import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Points at the deployed backend so the app works in Expo Go out of the box.
// Override for local dev by changing this to your machine's LAN IP, e.g.
// http://192.168.1.5:4000/api
export const API_BASE = 'https://sortmyscene-api.onrender.com/api';
// Web app base - the ticket QR opens this app's /checkin page when scanned.
export const WEB_BASE = 'https://sortmyscene-booking-three.vercel.app';

export const TOKEN_KEY = 'sms_token';
export const api = axios.create({ baseURL: API_BASE, timeout: 20000 });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function apiError(error) {
  if (error.response) {
    const { status, data } = error.response;
    return { status, message: data?.error?.message || 'Request failed', details: data?.error?.details };
  }
  if (error.request) {
    return { status: 0, message: 'Cannot reach the server. It may be waking up - try again in a moment.' };
  }
  return { status: 0, message: error.message || 'Unexpected error' };
}

export const authApi = {
  login: (body) => api.post('/auth/login', body).then((r) => r.data),
  register: (body) => api.post('/auth/register', body).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};

export const eventApi = {
  list: () => api.get('/events').then((r) => r.data),
  get: (id) => api.get(`/events/${id}`).then((r) => r.data),
};

export const bookingApi = {
  reserve: (eventId, seatNumbers) => api.post('/reserve', { eventId, seatNumbers }).then((r) => r.data),
  confirm: (reservationId) => api.post('/bookings', { reservationId }).then((r) => r.data),
  mine: () => api.get('/bookings/me').then((r) => r.data),
};
