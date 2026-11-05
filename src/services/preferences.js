import { useSyncExternalStore } from 'react';
import moment from 'moment';

/**
 * The settings that change how the app looks for you (Settings page): calendar and time preferences and your
 * Discover topics. Loaded from the server after login (components/PreferencesLoader) and kept in the browser, so
 * the right week start and time format show straight away on the next visit. Components read them with
 * usePreferences() and re-render when they change.
 */

export const DEFAULT_PREFERENCES = Object.freeze({
    weekStart: 'monday', // or 'sunday'
    timeFormat: '24h', // or '12h'
    calendarView: 'auto', // 'auto' (day on phones, month on larger screens), 'month', 'week', 'day', 'agenda'
    likedTags: [],
    hiddenTags: [],
    aiGamePlan: true, // false hides the AI Game plan everywhere
});

const STORAGE_KEY = 'planmate.preferences';
const KEYS = Object.keys(DEFAULT_PREFERENCES);

const pick = (source) => {
    const result = {};
    KEYS.forEach(key => {
        if (source && source[key] !== undefined && source[key] !== null) result[key] = source[key];
    });
    return result;
};

const readStored = () => {
    try {
        return { ...DEFAULT_PREFERENCES, ...pick(JSON.parse(localStorage.getItem(STORAGE_KEY))) };
    } catch {
        return { ...DEFAULT_PREFERENCES };
    }
};

let current = readStored();
const listeners = new Set();

const publish = (next) => {
    current = next;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {
        // Storage unavailable (private mode): preferences still apply for this visit
    }
    listeners.forEach(listener => listener());
};

export const getPreferences = () => current;

/** Takes the preference fields from a settings response (other fields are ignored). */
export const setPreferences = (settings) => publish({ ...current, ...pick(settings) });

/** Back to the defaults, e.g. on logout, so the next person on this browser does not inherit them. */
export const resetPreferences = () => publish({ ...DEFAULT_PREFERENCES });

const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export const usePreferences = () => useSyncExternalStore(subscribe, getPreferences, getPreferences);

/** "18:30" or "6:30 PM". */
export const timePattern = (timeFormat) => (timeFormat === '12h' ? 'h:mm A' : 'HH:mm');

export const formatTime = (date, timeFormat) => moment(date).format(timePattern(timeFormat));

/** Hour labels in the calendar's time grid: "08:00" or "8 AM". */
export const formatHour = (hour, timeFormat) => (timeFormat === '12h'
    ? moment().startOf('day').hour(hour).format('h A')
    : `${String(hour).padStart(2, '0')}:00`);
