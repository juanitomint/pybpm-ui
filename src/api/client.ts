import axios from 'axios';

const api = axios.create({
  baseURL: process.env.PYBPM_API_URL || 'http://localhost:5000',
});

// Request interceptor - add auth token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  console.log('[API Client] →', config.method?.toUpperCase(), config.url);
  console.log('[API Client] Token in localStorage:', !!token, token ? `(${token.substring(0, 20)}...)` : '');

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('[API Client] ✓ Authorization header added');
  } else {
    console.warn('[API Client] ✗ No token found - request will be unauthenticated');
  }

  return config;
});

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('[API Client] 401 Unauthorized - clearing token and redirecting to login');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
