/**
 * How an event looks in the calendar, from the viewer's point of view:
 * - own: events you created (solid indigo)
 * - accepted: invitations you accepted and public events you joined from the feed (green)
 * - maybe / pending: invitations you answered with maybe or not at all (dashed blue; pending adds a dot)
 * - declined: invitations you declined (subtle red, struck through so it does not rely on colour alone)
 */
export const RESPONSES = [
    { value: 'accepted', label: 'Going' },
    { value: 'maybe', label: 'Maybe' },
    { value: 'declined', label: "Can't go" },
];

export const RESPONSE_LABELS = {
    accepted: 'Going', maybe: 'Maybe', declined: "Can't go", pending: 'Not answered yet',
};

/** The viewer's own answer to an invitation, or null when the viewer was not invited. */
export const myResponse = (event, userId) => {
    if (event.viewerRole !== 'invited' || userId == null) return null;
    return (event.responses || {})[String(userId)] || 'pending';
};

export const eventStatus = (event) => {
    if (event.isOwn) return 'own';
    if (event.viewerRole === 'going') return 'accepted';
    return event.myResponse || 'pending';
};

const BASE = { borderRadius: '6px' };
const INVITED_STYLE = { ...BASE, backgroundColor: 'rgba(79, 70, 229, 0.15)', border: '1px dashed #818cf8', color: '#c7d2fe' };

export const STATUS_STYLES = {
    own: { ...BASE, backgroundColor: '#4F46E5', border: 'none', color: '#FFFFFF' },
    accepted: { ...BASE, backgroundColor: '#10B981', border: '1px solid #10B981', color: '#052E1C', fontWeight: 600 },
    maybe: INVITED_STYLE,
    pending: INVITED_STYLE,
    declined: {
        ...BASE, backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.35)',
        color: '#FCA5A5', textDecoration: 'line-through',
    },
};

export const STATUS_LEGEND = [
    { status: 'own', label: 'Mine' },
    { status: 'accepted', label: 'Going' },
    { status: 'maybe', label: 'Maybe' },
    { status: 'pending', label: 'Not answered' },
    { status: 'declined', label: "Can't go" },
];

export const statusLabel = (status) => (status === 'own' ? 'your event' : RESPONSE_LABELS[status]);
