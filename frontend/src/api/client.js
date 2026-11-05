import axios from 'axios';

const rawBaseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const baseURL = rawBaseURL.endsWith('/api/v1')
  ? rawBaseURL
  : `${rawBaseURL.replace(/\/+$/, '')}/api/v1`;

const api = axios.create({
  baseURL,
});

// Interceptor: Automatically injects the JWT token into every outgoing request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('locked_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
