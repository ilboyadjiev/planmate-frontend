import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { tokenStore, configureAuthHandlers, accessTokenFrom } from '../api/client';

export const AuthContext = createContext();

const USER_KEY = 'user';
const GUEST_KEY = 'planmate_guest_id';

const readStoredUser = () => {
    try {
        return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
        return null;
    }
};

// Must be rendered inside <Router> (uses useNavigate).
export const AuthProvider = ({ children }) => {
    const [authToken, setAuthToken] = useState(tokenStore.getAccess());
    const [user, setUser] = useState(readStoredUser);
    const navigate = useNavigate();

    const clearSession = useCallback(() => {
        tokenStore.clear();
        localStorage.removeItem(USER_KEY);
        setAuthToken(null);
        setUser(null);
    }, []);

    const logout = useCallback(() => {
        clearSession();
        navigate('/login');
    }, [clearSession, navigate]);

    useEffect(() => {
        configureAuthHandlers({
            onTokenRefreshed: setAuthToken,
            onSessionExpired: logout,
        });
    }, [logout]);

    /** Replaces the cached profile, e.g. after the user edited it. */
    const updateCurrentUser = useCallback((updatedUser) => {
        setUser(updatedUser);
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    }, []);

    const fetchUserData = async (fallbackUser) => {
        try {
            // The server returns the profile of the token's owner
            const response = await api.get('/v1/users/profile');
            if (response.data && typeof response.data === 'object' && Object.keys(response.data).length > 0) {
                setUser(response.data);
                localStorage.setItem(USER_KEY, JSON.stringify(response.data));
            } else {
                throw new Error('Server returned empty user data');
            }
        } catch (error) {
            console.warn('Using fallback user data.');
            if (fallbackUser) {
                setUser(fallbackUser);
                localStorage.setItem(USER_KEY, JSON.stringify(fallbackUser));
            }
        }
    };

    const handleAuthSuccess = async (response, providedEmail = null) => {
        const access = accessTokenFrom(response.data);
        tokenStore.set(access, response.data.refreshToken);
        setAuthToken(access);

        const finalEmail = response.data.email || response.data.username || providedEmail;
        const fallbackUser = {
            id: response.data.id || null,
            email: finalEmail,
            username: response.data.username || finalEmail,
            firstName: response.data.firstName || 'User',
        };

        await fetchUserData(fallbackUser);

        const guestId = localStorage.getItem(GUEST_KEY);
        if (guestId) {
            try {
                // The server merges into the logged-in account
                await api.post('/v2/events/merge', null, { params: { guestId } });
                localStorage.removeItem(GUEST_KEY);
            } catch (mergeError) {
                console.error('Failed to merge guest events:', mergeError);
            }
        }
    };

    const login = async (email, password) => {
        const response = await api.post('/v1/auth/login', { username: email, email, password });
        await handleAuthSuccess(response, email);
    };

    const googleLogin = async (googleCredential) => {
        const response = await api.post('/v1/auth/google', { token: googleCredential });
        await handleAuthSuccess(response);
    };

    const register = async (submissionData) => {
        await api.post('/v1/auth/register', submissionData);
        await login(submissionData.email, submissionData.password);
    };

    return (
        <AuthContext.Provider value={{ authToken, user, login, register, logout, googleLogin, updateCurrentUser }}>
            {children}
        </AuthContext.Provider>
    );
};
