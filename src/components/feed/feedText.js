import moment from 'moment';

const AVATAR_COLORS = ['#FDBA74', '#A5B4FC', '#6EE7B7', '#F9A8D4', '#93C5FD', '#FCD34D', '#C4B5FD'];

/** Stable pastel per person, so the same friend keeps the same colour on every card. */
export const avatarColor = (key) => {
    const text = String(key ?? '');
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

export const initials = (first, last, fallback) => {
    const letters = [first, last].filter(Boolean).map(part => part.trim()[0]).join('');
    return (letters || (fallback || '?').trim()[0] || '?').toUpperCase();
};

export const friendName = (friend) => friend.firstName || friend.username || 'A friend';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/**
 * The two lines next to the avatars: who is going (headline) and the total (detail).
 * Only friends are ever named; everyone else is part of the count.
 */
export const socialProof = ({ friendsGoing = [], attendeeCount = 0, going = false }, loggedIn) => {
    const names = [...(going ? ['You'] : []), ...friendsGoing.map(friendName)];
    const detail = names.length > 0 && attendeeCount > names.length
        ? `${attendeeCount} going in total`
        : loggedIn ? (attendeeCount > 0 && names.length === 0 ? 'None of your friends yet' : '') : 'Log in to see which friends';

    if (names.length === 0) {
        return { headline: attendeeCount > 0 ? `${plural(attendeeCount, 'person', 'people')} going` : 'Be the first to go', detail };
    }
    if (names.length === 1) {
        return { headline: going ? "You're going" : `${names[0]} is going`, detail };
    }
    if (names.length === 2) {
        return { headline: `${names[0]} and ${names[1]} are going`, detail };
    }
    return { headline: `${names[0]}, ${names[1]} + ${plural(names.length - 2, 'friend', 'friends')} going`, detail };
};

/**
 * From midnight to a later midnight (local time): a whole day or several, like a film's release day or an
 * exhibition. Such events show dates without times.
 */
export const isAllDay = (start, end) => {
    const s = moment(start);
    const e = moment(end);
    const midnight = (m) => m.isValid() && m.hours() === 0 && m.minutes() === 0 && m.seconds() === 0;
    return midnight(s) && midnight(e) && e.isAfter(s);
};

/** The last day of an all-day event (its end is the midnight after it). */
const lastDay = (end) => moment(end).subtract(1, 'day');

/** "Fri, 19:00 – 23:00" (or "Fri, 7:00 PM – 11:00 PM"), with both dates when the event runs past midnight. */
export const formatWhen = (start, end, timeFormat = '24h') => {
    const s = moment(start);
    const e = moment(end);
    const t = timeFormat === '12h' ? 'h:mm A' : 'HH:mm';
    if (!s.isValid()) return '';
    if (isAllDay(start, end)) {
        const last = lastDay(end);
        return s.isSame(last, 'day') ? `${s.format('ddd D MMM')}, all day` : `${s.format('ddd D MMM')} – ${last.format('ddd D MMM')}`;
    }
    if (!e.isValid()) return s.format(`ddd, ${t}`);
    return s.isSame(e, 'day')
        ? `${s.format(`ddd, ${t}`)} – ${e.format(t)}`
        : `${s.format(`ddd D MMM, ${t}`)} – ${e.format(`ddd D MMM, ${t}`)}`;
};

/** The Discover link that shows events with this tag (tags in an event's details link here). */
export const tagFeedPath = (tag) => `/dashboard?tag=${encodeURIComponent(tag)}`;

export const formatPlace = (location) => (location ? location.name || location.city || '' : '');
