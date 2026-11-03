// Lets the navbar badge refresh as soon as a friend request is accepted elsewhere in the app.
export const FRIENDS_CHANGED = 'planmate:friends-changed';

export const notifyFriendsChanged = () => window.dispatchEvent(new Event(FRIENDS_CHANGED));

/** Friend requests other people sent to this user that are still waiting for an answer. */
export const countIncomingRequests = (friendships, userId) =>
    (friendships || []).filter(f => f.status === 'pending' && f.userA && f.userA.id !== userId).length;
