
const GUEST_KEY = 'planmate_guest_id';

export const getGuestId = () => {
    let guestId = localStorage.getItem(GUEST_KEY);
    
    if (!guestId) {
        guestId = 'guest_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem(GUEST_KEY, guestId);
    }
    
    return guestId;
};