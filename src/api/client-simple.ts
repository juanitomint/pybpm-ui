import axios from 'axios';

// Use environment variable for API base URL (direct backend access, bypassing Next.js proxy)
const BACKEND_URL = process.env.NEXT_PUBLIC_PYBPM_API_URL || 'http://localhost:5000';

console.log('API Client configured with baseURL:', `${BACKEND_URL}/api/v1`);

const api = axios.create({
  baseURL: `${BACKEND_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - add auth token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log(`[API Client] ✓ Authorization header added for: ${config.method} ${config.url}`);
  } else {
    console.warn(`[API Client] ✗ No token found for: ${config.method} ${config.url}`);
  }

  return config;
});

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('[API Client] 401 Unauthorized - clearing token');
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  },
);

export default api;
