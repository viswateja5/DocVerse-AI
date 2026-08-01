import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
});

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000;

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (config.method?.toLowerCase() === 'get') {
      const cachedResponse = cache.get(config.url || '');
      if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_TTL) {
        config.adapter = async () => ({
          data: cachedResponse.data,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          request: {}
        });
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    if (response.config.method?.toLowerCase() === 'get') {
      cache.set(response.config.url || '', { data: response.data, timestamp: Date.now() });
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retryAuth) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retryAuth = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        console.log('[Axios] Attempting token refresh...');
        const { data } = await axios.post('/api/v1/auth/refresh', { refresh_token: refreshToken });
        
        console.log('[Axios] Token refresh successful');
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        
        processQueue(null, data.access_token);
        return api(originalRequest);
      } catch (refreshError) {
        console.error('[Axios] Token refresh failed:', refreshError);
        processQueue(refreshError, null);
        
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        
        if (window.location.pathname !== '/login') {
          console.log('[Axios] Redirecting to login due to auth failure');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status >= 500 || error.code === 'ECONNABORTED') {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      if (originalRequest._retryCount <= 2) {
        await new Promise(resolve => setTimeout(resolve, 1000 * originalRequest._retryCount));
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
