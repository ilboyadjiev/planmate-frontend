import React, { createContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import config from './config';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [authToken, setAuthToken] = useState(localStorage.getItem('authToken') || null);
    const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken') || null);
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

        interceptorId.current = axios.interceptors.response.use(
            (response) => response, 
            async (error) => {
                const originalRequest = error.config;

                if (error.response?.status === 401 && !originalRequest._retry) {
                    
                    if (originalRequest.url.includes('/auth/refresh')) {
                        logout();
                        return Promise.reject(error);
                    }

                    originalRequest._retry = true; 

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
                        setRefreshToken(newRefreshToken);
                        localStorage.setItem('authToken', newAccessToken);
                        localStorage.setItem('refreshToken', newRefreshToken);

                        axios.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
                        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

                        return axios(originalRequest);
                    } catch (refreshError) {
                        console.error("Session expired entirely. Logging out.");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authToken]); 

    const login = async (email, password) => {
        const response = await axios.post(`${config.baseUrl}/api/v1/auth/login`, { 
            username: email, 
            email: email, 
            password: password 
        });
        
        const access = response.data.accessToken || response.data.jwt;
        const refresh = response.data.refreshToken;
        
        setAuthToken(access);
        setRefreshToken(refresh);
        localStorage.setItem('authToken', access);
        localStorage.setItem('refreshToken', refresh);
        
        axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
        
        const fallbackUser = {
            id: response.data.id || null,
            email: email,
            username: response.data.username || email, 
            firstName: response.data.firstName || 'User'
        };
        
        setUser(fallbackUser);
        localStorage.setItem('user', JSON.stringify(fallbackUser));

        await fetchUserData(email, fallbackUser);
    };

    const register = async (submissionData) => {
        await axios.post(`${config.baseUrl}/api/v1/auth/register`, submissionData);
        await login(submissionData.email, submissionData.password);
    };

    const logout = () => {
        setAuthToken(null);
        setRefreshToken(null);
        setUser(null); 
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
        
        window.location.href = '/login';
    };

    const fetchUserData = async (email, fallbackUser) => {
        try {
            const response = await axios.get(`${config.baseUrl}/api/v1/users/${encodeURIComponent(email)}`);
            setUser(response.data); 
            localStorage.setItem('user', JSON.stringify(response.data)); 
        } catch (error) {
            console.warn('Using fallback user data.');
        }
    };

    return (
        <AuthContext.Provider value={{ authToken, user, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};