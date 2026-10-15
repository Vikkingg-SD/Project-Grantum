import axios from 'axios';
import { ENV } from '@/config/env';

export const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: ENV.API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Structured warn log for terminal and Expo debugging
    console.warn(
      `[API INTERCEPTOR WARN] ${error.config?.method?.toUpperCase()} ${error.config?.url}:`,
      error.message
    );
    return Promise.reject(error);
  }
);
