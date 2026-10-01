import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: Record<string, any>;
  error?: string;
  code?: string;
  details?: any;
}

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// Attach JWT to every request after login
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ilms_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, attempt refresh once, otherwise logout
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest: any = error.config;
    const refreshToken = localStorage.getItem('ilms_refresh_token');

    if (error.response?.status === 401 && !originalRequest._retry && refreshToken) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        localStorage.setItem('ilms_access_token', data.data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('ilms_access_token');
        localStorage.removeItem('ilms_refresh_token');
        localStorage.removeItem('ilms_user');
        window.dispatchEvent(new Event('ilms:logout'));
      }
    }

    return Promise.reject(error);
  }
);

export async function request<T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  body?: any,
  config?: any
): Promise<T> {
  const res = await api.request<T>({ method, url, data: body, ...config });
  return res.data;
}

export const parseError = (err: any): string => {
  const e = err?.response?.data;
  if (e?.error) return e.error;
  if (e?.message) return e.message;
  return err?.message || 'Terjadi kesalahan pada server';
};

export default api;