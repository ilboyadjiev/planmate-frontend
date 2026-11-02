
const GUEST_KEY = 'planmate_guest_id';

export const getGuestId = () => {
    let guestId = localStorage.getItem(GUEST_KEY);
    
    if (!guestId) {
        // The guest id is the only credential for a guest's events, so it must be unguessable.
        guestId = 'guest_' + crypto.randomUUID();
        localStorage.setItem(GUEST_KEY, guestId);
    }
    
    return guestId;
};