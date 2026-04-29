import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api/v1';

export const apiClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

interface AuthGetters {
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  setTokens(access: string, refresh: string): void;
  clearTokens(): void;
}

let authGetters: AuthGetters | null = null;

export function bindAuthClient(getters: AuthGetters): void {
  authGetters = getters;
}

interface QueuedRequest {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}

let isRefreshing = false;
let queue: QueuedRequest[] = [];

function flushQueue(error: unknown, token: string | null): void {
  for (const { resolve, reject } of queue) {
    if (token) resolve(token);
    else reject(error);
  }
  queue = [];
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = authGetters?.getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

interface RetriableConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const url = original?.url ?? '';

    const isAuthEndpoint =
      url.includes('/auth/login') || url.includes('/auth/refresh');

    if (status !== 401 || !original || original._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    if (!authGetters) {
      return Promise.reject(error);
    }

    const refreshToken = authGetters.getRefreshToken();
    if (!refreshToken) {
      authGetters.clearTokens();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // File d'attente : attendre la fin du refresh en cours et rejouer.
      return new Promise((resolve, reject) => {
        queue.push({
          resolve: (newToken) => {
            original.headers = original.headers ?? {};
            (original.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
            original._retry = true;
            apiClient.request(original).then(resolve).catch(reject);
          },
          reject,
        });
      });
    }

    isRefreshing = true;
    original._retry = true;

    try {
      const { data } = await axios.post<{
        accessToken: string;
        refreshToken: string;
      }>(`${baseURL}/auth/refresh`, { refreshToken });
      authGetters.setTokens(data.accessToken, data.refreshToken);
      flushQueue(null, data.accessToken);
      original.headers = original.headers ?? {};
      (original.headers as Record<string, string>).Authorization = `Bearer ${data.accessToken}`;
      return apiClient.request(original);
    } catch (refreshError) {
      flushQueue(refreshError, null);
      authGetters.clearTokens();
      // Redirection : le store + ProtectedRoute s'en chargent au prochain render.
      window.location.assign('/login');
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
