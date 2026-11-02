import axios from 'axios';
import config from '../config/config';

/**
 * Single HTTP client for the PlanMate backend.
 *
 * - Every request goes to `${config.baseUrl}/api` and carries the current access token.
 * - A 401 on an authenticated request triggers exactly one refresh, no matter how many
 *   requests failed concurrently; all of them are retried with the new token.
 * - If the refresh fails, tokens are cleared and the registered `onSessionExpired`
 *   handler runs (AuthProvider uses it to reset state and redirect).
 *
 * Interceptors are registered once at module load, never from React effects.
 */

const ACCESS_KEY = 'authToken';
const REFRESH_KEY = 'refreshToken';
const AUTH_PATH_PREFIX = '/v1/auth/';

export const tokenStore = {
    getAccess: () => localStorage.getItem(ACCESS_KEY),
    getRefresh: () => localStorage.getItem(REFRESH_KEY),
    set: (access, refresh) => {
        localStorage.setItem(ACCESS_KEY, access);
        if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
    },
    clear: () => {
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(REFRESH_KEY);
    },
};

const handlers = {
    onTokenRefreshed: () => {},
    onSessionExpired: () => {},
};

export const configureAuthHandlers = ({ onTokenRefreshed, onSessionExpired }) => {
    if (onTokenRefreshed) handlers.onTokenRefreshed = onTokenRefreshed;
    if (onSessionExpired) handlers.onSessionExpired = onSessionExpired;
};

/** Extracts the access token regardless of which field name the backend used. */
export const accessTokenFrom = (data) => data?.accessToken || data?.jwt;

const api = axios.create({ baseURL: `${config.baseUrl}/api` });

api.interceptors.request.use((request) => {
    const token = tokenStore.getAccess();
    if (token && !request.headers.Authorization) {
        request.headers.Authorization = `Bearer ${token}`;
    }
    return request;
});

let refreshPromise = null;

const refreshAccessToken = () => {
    if (!refreshPromise) {
        refreshPromise = (async () => {
            const refreshToken = tokenStore.getRefresh();
            if (!refreshToken) throw new Error('No refresh token available');

            const res = await api.post(`${AUTH_PATH_PREFIX}refresh`, { refreshToken });
            const newAccess = accessTokenFrom(res.data);
            if (!newAccess) throw new Error('Refresh response contained no access token');

            tokenStore.set(newAccess, res.data.refreshToken || refreshToken);
            handlers.onTokenRefreshed(newAccess);
            return newAccess;
        })().finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;
        const isAuthEndpoint = original?.url?.startsWith(AUTH_PATH_PREFIX);
        const wasAuthenticated = Boolean(original?.headers?.Authorization);

        // Only authenticated, non-auth-endpoint requests are eligible for a refresh.
        // A 401 from /auth/login means bad credentials; a 401 on a guest request has no session to refresh.
        if (error.response?.status !== 401 || !original || original._retry || isAuthEndpoint || !wasAuthenticated) {
            return Promise.reject(error);
        }

        original._retry = true;
        try {
            const newAccess = await refreshAccessToken();
            original.headers.Authorization = `Bearer ${newAccess}`;
            return api(original);
        } catch (refreshError) {
            tokenStore.clear();
            handlers.onSessionExpired();
            return Promise.reject(refreshError);
        }
    }
);

export default api;
