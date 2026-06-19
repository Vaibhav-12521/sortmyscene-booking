import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

export const api = axios.create({ baseURL });

const TOKEN_KEY = 'sms_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// Attach the bearer token to every request when present.
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Normalize axios errors into a consistent shape so UI code can rely on
 * `err.message`, `err.status`, and `err.details` (e.g. taken seat numbers).
 */
export function toApiError(error) {
  if (error.response) {
    const { status, data } = error.response;
    return {
      status,
      message: data?.error?.message || 'Request failed',
      details: data?.error?.details,
    };
  }
  if (error.request) {
    return { status: 0, message: 'Cannot reach the server. Is the backend running?' };
  }
  return { status: 0, message: error.message || 'Unexpected error' };
}
