import { act, render, screen } from '@testing-library/react';
import {
    DEFAULT_PREFERENCES, formatHour, formatTime, getPreferences, resetPreferences, setPreferences, usePreferences,
} from './preferences';

beforeEach(() => {
    localStorage.clear();
    resetPreferences();
});

test('starts with the defaults, which are how the app always looked', () => {
    expect(getPreferences()).toEqual(DEFAULT_PREFERENCES);
});

test('takes only preference fields from a settings response and keeps them for the next visit', () => {
    setPreferences({ timeFormat: '12h', weekStart: 'sunday', searchable: false, homeCity: 'Munich', likedTags: ['#music'] });
    expect(getPreferences()).toEqual({ ...DEFAULT_PREFERENCES, timeFormat: '12h', weekStart: 'sunday', likedTags: ['#music'] });
    expect(JSON.parse(localStorage.getItem('planmate.preferences')).timeFormat).toBe('12h');

    resetPreferences();
    expect(getPreferences()).toEqual(DEFAULT_PREFERENCES);
});

test('components re-render when a preference changes', () => {
    const Clock = () => <span>{formatTime(new Date(2026, 10, 6, 18, 30), usePreferences().timeFormat)}</span>;
    render(<Clock />);
    expect(screen.getByText('18:30')).toBeInTheDocument();
    act(() => setPreferences({ timeFormat: '12h' }));
    expect(screen.getByText('6:30 PM')).toBeInTheDocument();
});

test('hour labels for the time grid', () => {
    expect(formatHour(8)).toBe('08:00');
    expect(formatHour(0, '12h')).toBe('12 AM');
    expect(formatHour(15, '12h')).toBe('3 PM');
});
