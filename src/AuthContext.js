import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import config from './config';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [authToken, setAuthToken] = useState(localStorage.getItem('authToken') || null);
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);

    useEffect(() => {
        if (authToken) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
        }
    }, [authToken]);

    const login = async (email, password) => {
        console.log("API URL: " + config.baseUrl);
        const response = await axios.post(`${config.baseUrl}/api/v1/auth/authenticate`, { email, password });
        setAuthToken(response.data.jwt);
        localStorage.setItem('authToken', response.data.jwt);
        await fetchUserData(email);
    };

    const register = async (submissionData) => {
        console.log("API URL: " + config.baseUrl);
        await axios.post(`${config.baseUrl}/api/v1/auth/register`, submissionData);
        await login(submissionData.email, submissionData.password);
    };

    const logout = () => {
        setAuthToken(null);
        localStorage.removeItem('authToken');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null); 
    };

    const fetchUserData = async (email) => {
        try {
            const response = await axios.get(`${config.baseUrl}/api/v1/users/${email}`);
            setUser(response.data); 
            localStorage.setItem('user', JSON.stringify(response.data)); // Store user data in local storage
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    return (
        <AuthContext.Provider value={{ authToken, user, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
