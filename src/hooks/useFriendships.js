import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { FRIENDS_CHANGED, notifyFriendsChanged } from '../services/friendEvents';

/**
 * The logged-in user's friendships, and how they relate to anyone else:
 * relationOf(personId) -> { state: 'self' | 'friend' | 'sent' | 'received' | 'none', friendshipId }
 * Changes made here (or anywhere that calls notifyFriendsChanged) reload it everywhere it is used.
 */
const useFriendships = () => {
    const { user } = useContext(AuthContext);
    const [friendships, setFriendships] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const userId = user?.id;

    const reload = useCallback(async () => {
        if (!userId) {
            setFriendships([]);
            setLoaded(true);
            return;
        }
        try {
            const res = await api.get(`/v1/users/${userId}/friends`);
            setFriendships(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            setFriendships([]);
        } finally {
            setLoaded(true);
        }
    }, [userId]);

    useEffect(() => {
        reload();
        window.addEventListener(FRIENDS_CHANGED, reload);
        return () => window.removeEventListener(FRIENDS_CHANGED, reload);
    }, [reload]);

    const byPerson = useMemo(() => {
        const map = new Map();
        friendships.forEach(f => {
            if (!f.userA || !f.userB) return;
            const iSent = f.userA.id === userId;
            const other = iSent ? f.userB : f.userA;
            let state = 'friend';
            if (f.status !== 'accepted') state = iSent ? 'sent' : 'received';
            map.set(String(other.id), { state, friendshipId: f.id, person: other });
        });
        return map;
    }, [friendships, userId]);

    const relationOf = useCallback((personId) => {
        if (personId == null) return { state: 'none' };
        if (String(personId) === String(userId)) return { state: 'self' };
        return byPerson.get(String(personId)) || { state: 'none' };
    }, [byPerson, userId]);

    const friends = useMemo(() => [...byPerson.values()].filter(r => r.state === 'friend').map(r => r.person), [byPerson]);

    const changed = async (request) => {
        await request();
        notifyFriendsChanged(); // reloads this hook and every other user of it (and the navbar badge)
    };

    return {
        loaded,
        friendships,
        friends,
        relationOf,
        sendRequest: (personId) => changed(() => api.post(`/v1/friends/request/${personId}`, {})),
        accept: (friendshipId) => changed(() => api.put(`/v1/friends/accept/${friendshipId}`, {})),
        // Declines a received request, cancels a sent one, or unfriends
        remove: (friendshipId) => changed(() => api.delete(`/v1/friends/${friendshipId}`)),
    };
};

export default useFriendships;
