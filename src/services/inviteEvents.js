import api from '../api/client';

// Lets the navbar badge refresh as soon as an invitation is answered anywhere in the app.
export const INVITES_CHANGED = 'planmate:invites-changed';

export const notifyInvitesChanged = () => window.dispatchEvent(new Event(INVITES_CHANGED));

/** How many invitations the logged-in user has not answered yet (upcoming, not cancelled). */
export const countUnansweredInvites = async () => {
    const res = await api.get('/v2/events/invitations/count');
    return Number(res.data?.count) || 0;
};
