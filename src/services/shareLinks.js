/** Links people can share, and getting back to where you were after logging in. */

/** The page of one event, e.g. https://www.planmate.org/events/abc123 */
export const eventPath = (id) => `/events/${encodeURIComponent(id)}`;
export const eventUrl = (id) => `${window.location.origin}${eventPath(id)}`;

/** The login page, returning to `path` afterwards (e.g. a shared event the person wants to join). */
export const loginPathTo = (path) => `/login?next=${encodeURIComponent(path)}`;

/**
 * Where to go after logging in: the ?next= path if it is one of ours ("/events/abc"), else the dashboard.
 * Only plain app paths are accepted, so a crafted link cannot send people to another site after they log in.
 */
export const nextPathFrom = (search, fallback = '/dashboard') => {
    const next = new URLSearchParams(search).get('next');
    return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : fallback;
};

/** Copies text to the clipboard. Resolves to true when it worked. */
export const copyText = async (text) => {
    try {
        if (navigator.clipboard && window.isSecureContext !== false) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        // fall through to the older way
    }
    try {
        const field = document.createElement('textarea');
        field.value = text;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        const copied = document.execCommand && document.execCommand('copy');
        field.remove();
        return !!copied;
    } catch {
        return false;
    }
};

/** Phones and tablets get the system share sheet (WhatsApp, Messages, …); computers copy the link. */
export const prefersShareSheet = () => typeof navigator.share === 'function'
    && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
