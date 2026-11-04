import { useCallback, useEffect, useState } from 'react';

export const MAX_HISTORY = 8;

/** Separate per account (and one for guests), so people sharing a device do not see each other's searches. */
export const historyKey = (userId) => `planmate.searchHistory.${userId ?? 'guest'}`;

const read = (key) => {
    try {
        const stored = JSON.parse(window.localStorage.getItem(key));
        return Array.isArray(stored) ? stored.filter(q => typeof q === 'string' && q.trim()).slice(0, MAX_HISTORY) : [];
    } catch (err) {
        return []; // storage blocked (private mode) or damaged: start empty
    }
};

const write = (key, history) => {
    try {
        if (history.length) window.localStorage.setItem(key, JSON.stringify(history));
        else window.localStorage.removeItem(key);
    } catch (err) {
        // storage blocked: history then lasts until the page is reloaded
    }
};

/**
 * Recent event searches, newest first, at most MAX_HISTORY. Kept only in this browser's local storage: never
 * sent to the server.
 */
const useSearchHistory = (userId) => {
    const key = historyKey(userId);
    const [history, setHistory] = useState(() => read(key));

    useEffect(() => { setHistory(read(key)); }, [key]);

    const update = useCallback((change) => {
        setHistory(prev => {
            const next = change(prev);
            write(key, next);
            return next;
        });
    }, [key]);

    /** Puts a search at the top; searching "Jazz" again replaces an older "jazz". */
    const remember = useCallback((query) => update(prev => [
        query,
        ...prev.filter(q => q.toLowerCase() !== query.toLowerCase()),
    ].slice(0, MAX_HISTORY)), [update]);

    const forget = useCallback((query) => update(prev => prev.filter(q => q !== query)), [update]);

    const clearAll = useCallback(() => update(() => []), [update]);

    return { history, remember, forget, clearAll };
};

export default useSearchHistory;
