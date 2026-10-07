import axios from 'axios';

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) {
    return 'http://localhost:5000/api/v1';
  }
  const clean = envUrl.trim().replace(/\/+$/, '');
  // If configured URL does not end with /api/v1 or /api, append /api/v1 automatically
  if (!/\/api(\/v1)?$/.test(clean)) {
    return `${clean}/api/v1`;
  }
  return clean;
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('futsal_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('futsal_token');
      localStorage.removeItem('futsal_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
