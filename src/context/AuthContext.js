import React, { createContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import config from '../config/config';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [authToken, setAuthToken] = useState(localStorage.getItem('authToken') || null);
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
    
    const interceptorId = useRef(null);

    useEffect(() => {
        if (authToken) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }

        if (interceptorId.current !== null) {
            axios.interceptors.response.eject(interceptorId.current);
        }

        // Variables for concurrency handling
        let isRefreshing = false;
        let failedQueue = [];

        const processQueue = (error, token = null) => {
            failedQueue.forEach(prom => {
                if (error) {
                    prom.reject(error);
                } else {
                    prom.resolve(token);
                }
            });
            failedQueue = [];
        };

        interceptorId.current = axios.interceptors.response.use(
            (response) => response, 
            async (error) => {
                const originalRequest = error.config;

                if (error.response?.status === 401 && !originalRequest._retry) {
                    
                    if (originalRequest.url.includes('/auth/refresh')) {
                        logout();
                        return Promise.reject(error);
                    }

                    // If a refresh is already in progress, queue this request until it finishes
                    if (isRefreshing) {
                        return new Promise(function(resolve, reject) {
                            failedQueue.push({ resolve, reject });
                        }).then(token => {
                            originalRequest.headers['Authorization'] = `Bearer ${token}`;
                            return axios(originalRequest);
                        }).catch(err => Promise.reject(err));
                    }

                    originalRequest._retry = true; 
                    isRefreshing = true;

                    try {
                        const currentRefreshToken = localStorage.getItem('refreshToken');
                        if (!currentRefreshToken) throw new Error("No refresh token available");

                        const cleanAxios = axios.create();
                        const res = await cleanAxios.post(`${config.baseUrl}/api/v1/auth/refresh`, { 
                            refreshToken: currentRefreshToken 
                        });

                        const newAccessToken = res.data.accessToken || res.data.jwt;
                        const newRefreshToken = res.data.refreshToken || currentRefreshToken;

                        setAuthToken(newAccessToken);
                        localStorage.setItem('authToken', newAccessToken);
                        localStorage.setItem('refreshToken', newRefreshToken);

                        axios.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
                        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

                        // Release the queued requests
                        processQueue(null, newAccessToken);
                        isRefreshing = false;

                        return axios(originalRequest);
                    } catch (refreshError) {
                        console.error("Session expired entirely. Logging out.");
                        processQueue(refreshError, null);
                        isRefreshing = false;
                        logout();
                        return Promise.reject(refreshError);
                    }
                }

                return Promise.reject(error);
            }
        );

        return () => {
            if (interceptorId.current !== null) {
                axios.interceptors.response.eject(interceptorId.current);
            }
        };
    }, [authToken]); 

    const fetchUserData = async (email, fallbackUser) => {
        try {
            const response = await axios.get(`${config.baseUrl}/api/v1/users/profile`, { params: { email: email } });
            if (response.data && typeof response.data === 'object' && Object.keys(response.data).length > 0) {
                setUser(response.data); 
                localStorage.setItem('user', JSON.stringify(response.data)); 
            } else {
                throw new Error("Server returned empty user data");
            }
        } catch (error) {
            console.warn('Using fallback user data.');
            if (fallbackUser) {
                setUser(fallbackUser);
                localStorage.setItem('user', JSON.stringify(fallbackUser));
            }
        }
    };

    const handleAuthSuccess = async (response, providedEmail = null) => {
        const access = response.data.accessToken || response.data.jwt;
        const refresh = response.data.refreshToken;
        
        setAuthToken(access);
        localStorage.setItem('authToken', access);
        if (refresh) localStorage.setItem('refreshToken', refresh);
        
        axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
        
        const finalEmail = response.data.email || response.data.username || providedEmail;
        
        const fallbackUser = {
            id: response.data.id || null,
            email: finalEmail,
            username: response.data.username || finalEmail, 
            firstName: response.data.firstName || 'User'
        };
        
        await fetchUserData(finalEmail, fallbackUser);

        const guestId = localStorage.getItem('planmate_guest_id');
        if (guestId) {
            try {
                await axios.post(`${config.baseUrl}/api/v2/events/merge`, null, {
                    params: { guestId: guestId, realUserId: finalEmail }
                });
                localStorage.removeItem('planmate_guest_id'); 
            } catch (mergeError) {
                console.error("Failed to merge guest events:", mergeError);
            }
        }
    };

    const login = async (email, password) => {
        const response = await axios.post(`${config.baseUrl}/api/v1/auth/login`, { 
            username: email, email: email, password: password 
        });
        await handleAuthSuccess(response, email);
    };

    const googleLogin = async (googleCredential) => {
        const response = await axios.post(`${config.baseUrl}/api/v1/auth/google`, { token: googleCredential });
        await handleAuthSuccess(response);
    };

    const register = async (submissionData) => {
        await axios.post(`${config.baseUrl}/api/v1/auth/register`, submissionData);
        await login(submissionData.email, submissionData.password);
    };

    const logout = () => {
        setAuthToken(null);
        setUser(null); 
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
        
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ authToken, user, login, register, logout, googleLogin }}>
            {children}
        </AuthContext.Provider>
    );
};