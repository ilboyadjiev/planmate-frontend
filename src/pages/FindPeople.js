import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import api from '../api/client';
import { AuthContext } from '../context/AuthContext';
import SocialTabs from '../components/SocialTabs';
import AddFriendButton from '../components/AddFriendButton';
import useFriendships from '../hooks/useFriendships';
import ProfileModal from '../components/profile/ProfileModal';
import GlassPanel from '../components/GlassPanel';
import { MIN_SEARCH, suggestionReason, Section, UserListItem } from './socialShared';
import './FriendGroups.css';

/**
 * Finding new people (the "Find" tab): a search across everyone on PlanMate, plus "People you may know" suggestions.
 * Managing the people you already know lives on the Friends tab.
 */
const FindPeople = () => {
    const { user } = useContext(AuthContext);
    const friendships = useFriendships();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');
    const [profileId, setProfileId] = useState(null); // the profile open in the pop-up

    const loadSuggestions = useCallback(async () => {
        try {
            const res = await api.get('/v1/friends/suggestions');
            setSuggestions(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            setSuggestions([]);
        }
    }, []);

    // Loaded once per visit: people you add stay in the list, showing "Requested"
    useEffect(() => { if (user?.id) loadSuggestions(); }, [user, loadSuggestions]);

    // Search as you type (after a short pause), by username or name, across everyone
    const latestSearch = useRef(0);
    const search = useCallback(async (text) => {
        const requestId = ++latestSearch.current;
        if (text.trim().length < MIN_SEARCH) {
            setSearchResults([]);
            setSearching(false);
            return;
        }
        setSearching(true);
        try {
            const response = await api.get('/v1/users/search', { params: { term: text.trim() } });
            if (requestId !== latestSearch.current) return; // a newer search won
            setSearchResults(response.data.filter(u => u.id !== user.id));
            setError(null);
        } catch (err) {
            if (requestId === latestSearch.current) setError('Error searching for users.');
        } finally {
            if (requestId === latestSearch.current) setSearching(false);
        }
    }, [user]);

    useEffect(() => {
        const timer = setTimeout(() => search(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm, search]);

    const trimmed = searchTerm.trim();

    return (
        <div className="groups-page social-page">
            <GlassPanel tall className="social-panel">

                <SocialTabs />
                <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '0.95rem' }}>
                    Search everyone on PlanMate and see people you may know.
                </p>

                <form onSubmit={(e) => { e.preventDefault(); search(searchTerm); }} style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
                    <label htmlFor="people-search" className="visually-hidden">Search people by name or username</label>
                    <input
                        id="people-search"
                        type="text"
                        placeholder="Search by name or username..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ flexGrow: 1 }}
                    />
                    <button type="submit" className="pm-glass-button" style={{ minHeight: '44px', padding: '0 24px', fontSize: '14px' }}>
                        Search
                    </button>
                </form>

                {error && <div className="availability-message msg-error" role="alert" style={{ marginBottom: '24px' }}>{error}</div>}
                {successMsg && <div className="availability-message msg-success" role="status" style={{ marginBottom: '24px' }}>{successMsg}</div>}

                {trimmed.length >= MIN_SEARCH && !searching && searchResults.length === 0 && !error && (
                    <p style={{ color: 'var(--text-muted)', marginTop: '-16px', marginBottom: '32px' }}>
                        No one found for "{trimmed}".
                    </p>
                )}

                {searchResults.length > 0 && (
                    <Section title="Search Results" color="var(--primary)">
                        {searchResults.map(result => (
                            <UserListItem onOpen={setProfileId} key={result.id} userData={result} subText={suggestionReason(result)}
                                actionButton={friendships.relationOf(result.id).state === 'friend'
                                    ? <span className="add-friend-status">Friend</span>
                                    : <AddFriendButton person={result} friendships={friendships} />} />
                        ))}
                    </Section>
                )}

                {suggestions.length > 0 && (
                    <Section title="People you may know" color="var(--text-main)">
                        {suggestions.map(s => (
                            <UserListItem onOpen={setProfileId} key={s.id} userData={s} subText={suggestionReason(s)}
                                actionButton={<AddFriendButton person={s} friendships={friendships} />} />
                        ))}
                    </Section>
                )}

                {trimmed.length < MIN_SEARCH && suggestions.length === 0 && (
                    <p style={{ color: 'var(--text-muted)' }}>
                        Search for someone by name or username to add them as a friend.
                    </p>
                )}

            </GlassPanel>

            <ProfileModal personId={profileId} onHide={() => setProfileId(null)}
                onPlanned={(event, person) => setSuccessMsg(`"${event.title}" is planned and ${person.firstName || person.username} is invited. It's in your calendar.`)} />
        </div>
    );
};

export default FindPeople;
