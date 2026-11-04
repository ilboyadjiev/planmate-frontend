import { useContext, useEffect } from 'react';
import api from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { resetPreferences, setPreferences } from '../services/preferences';

/**
 * Loads your settings once you are logged in, so the calendar, times and Discover follow them everywhere
 * (services/preferences). Logging out puts the defaults back. Renders nothing.
 */
const PreferencesLoader = () => {
    const { authToken } = useContext(AuthContext);

    useEffect(() => {
        if (!authToken) {
            resetPreferences();
            return undefined;
        }
        let cancelled = false;
        api.get('/v1/settings')
            .then(({ data }) => { if (!cancelled) setPreferences(data); })
            .catch(() => { /* keep the preferences from the last visit */ });
        return () => { cancelled = true; };
    }, [authToken]);

    return null;
};

export default PreferencesLoader;
