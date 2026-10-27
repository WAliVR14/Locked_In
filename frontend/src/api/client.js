import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
});

// Interceptor: Automatically injects the JWT token into every outgoing request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('locked_in_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;