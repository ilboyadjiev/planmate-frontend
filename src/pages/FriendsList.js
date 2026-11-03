import React, { useState, useEffect, useContext, useCallback } from 'react';
import api from '../api/client';
import { AuthContext } from '../context/AuthContext';
import SocialTabs from '../components/SocialTabs';
import AddFriendButton from '../components/AddFriendButton';
import useFriendships from '../hooks/useFriendships';
import './FriendGroups.css';

const displayName = (person) => [person.firstName, person.lastName].filter(Boolean).join(' ') || person.username;

/** Why someone is suggested: shared groups first, then mutual friends. */
export const suggestionReason = (suggestion) => {
    const reasons = [];
    const groups = suggestion.sharedGroups || [];
    if (groups.length === 1) reasons.push(`In ${groups[0]} with you`);
    else if (groups.length > 1) reasons.push(`In ${groups.length} of your groups`);

    const count = suggestion.mutualFriendCount || 0;
    if (count > 0) {
        const names = (suggestion.mutualFriends || []).map(f => f.firstName || f.username);
        const others = count - names.length;
        const named = others > 0 ? `${names.join(', ')} and ${others} more` : names.join(' and ');
        reasons.push(`${count} mutual ${count === 1 ? 'friend' : 'friends'}: ${named}`);
    }
    return reasons.join(' · ');
};

const FriendsList = () => {
    const { user } = useContext(AuthContext);
    const friendships = useFriendships();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');
    const [busyId, setBusyId] = useState(null);
    const [confirmRemoveId, setConfirmRemoveId] = useState(null);

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

    const handleSearch = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg('');
        if (!searchTerm.trim()) {
            setSearchResults([]);
            return;
        }
        try {
            const response = await api.get('/v1/users/search', { params: { term: searchTerm } });
            const results = response.data.filter(u => u.id !== user.id);
            setSearchResults(results);
            if (results.length === 0) setError('No users found matching that search.');
        } catch (err) {
            setError('Error searching for users.');
        }
    };

    const run = async (id, action, success, failure) => {
        setBusyId(id);
        setError(null);
        setSuccessMsg('');
        try {
            await action();
            if (success) setSuccessMsg(success);
        } catch (err) {
            setError(failure);
        } finally {
            setBusyId(null);
            setConfirmRemoveId(null);
        }
    };

    if (!friendships.loaded) return <div style={{ textAlign: 'center', marginTop: '50px', color: 'var(--text-muted)' }}>Loading network...</div>;

    const all = friendships.friendships;
    const other = (f) => (f.userA.id === user.id ? f.userB : f.userA);
    const friends = all.filter(f => f.status === 'accepted');
    const received = all.filter(f => f.status !== 'accepted' && f.userA.id !== user.id);
    const sent = all.filter(f => f.status !== 'accepted' && f.userA.id === user.id);

    return (
        <div style={{ padding: '40px 20px', display: 'flex', justifyContent: 'center' }}>
            <div className="form-container" style={{ maxWidth: '800px', width: '100%', margin: 0 }}>

                <SocialTabs />
                <h2 style={{ marginBottom: '8px', fontWeight: '700' }}>Network</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '0.95rem' }}>
                    Find friends and manage your connections.
                </p>

                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
                    <label htmlFor="friend-search" className="visually-hidden">Search people by username</label>
                    <input
                        id="friend-search"
                        type="text"
                        placeholder="Search by username..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ flexGrow: 1 }}
                    />
                    <button type="submit" className="btn-modern-secondary" style={{ padding: '10px 24px' }}>
                        Search
                    </button>
                </form>

                {error && <div className="availability-message msg-error" role="alert" style={{ marginBottom: '24px' }}>{error}</div>}
                {successMsg && <div className="availability-message msg-success" role="status" style={{ marginBottom: '24px' }}>{successMsg}</div>}

                {searchResults.length > 0 && (
                    <Section title="Search Results" color="var(--primary)">
                        {searchResults.map(result => (
                            <UserListItem key={result.id} userData={result}
                                actionButton={friendships.relationOf(result.id).state === 'friend'
                                    ? <span className="add-friend-status">Friend</span>
                                    : <AddFriendButton person={result} friendships={friendships} />} />
                        ))}
                    </Section>
                )}

                {received.length > 0 && (
                    <Section title={`Friend requests (${received.length})`} color="#F59E0B">
                        {received.map(f => (
                            <UserListItem key={f.id} userData={other(f)} subText="Wants to be your friend"
                                actionButton={(
                                    <div className="friend-actions">
                                        <button type="button" className="btn-modern-primary friend-action" disabled={busyId === f.id}
                                            onClick={() => run(f.id, () => friendships.accept(f.id), `You and ${displayName(other(f))} are now friends.`, 'Could not accept the request.')}>
                                            Accept
                                        </button>
                                        <button type="button" className="friend-action friend-action-quiet" disabled={busyId === f.id}
                                            aria-label={`Decline ${displayName(other(f))}'s request`}
                                            onClick={() => run(f.id, () => friendships.remove(f.id), null, 'Could not decline the request.')}>
                                            Decline
                                        </button>
                                    </div>
                                )} />
                        ))}
                    </Section>
                )}

                {suggestions.length > 0 && (
                    <Section title="People you may know" color="var(--text-main)">
                        {suggestions.map(s => (
                            <UserListItem key={s.id} userData={s} subText={suggestionReason(s)}
                                actionButton={<AddFriendButton person={s} friendships={friendships} />} />
                        ))}
                    </Section>
                )}

                {sent.length > 0 && (
                    <Section title="Requests you sent" color="var(--text-muted)">
                        {sent.map(f => (
                            <UserListItem key={f.id} userData={other(f)} subText="Waiting for an answer"
                                actionButton={(
                                    <button type="button" className="friend-action friend-action-quiet" disabled={busyId === f.id}
                                        aria-label={`Cancel your request to ${displayName(other(f))}`}
                                        onClick={() => run(f.id, () => friendships.remove(f.id), null, 'Could not cancel the request.')}>
                                        Cancel request
                                    </button>
                                )} />
                        ))}
                    </Section>
                )}

                <Section title={`My Friends (${friends.length})`} color="var(--text-main)" empty={friends.length === 0 && (
                    <div style={{ padding: '32px', textAlign: 'center', backgroundColor: 'var(--bg-color)', borderRadius: '12px', color: 'var(--text-muted)' }}>
                        You don't have any friends added yet. Search above or add someone from "People you may know".
                    </div>
                )}>
                    {friends.map(f => {
                        const friend = other(f);
                        return (
                            <UserListItem key={f.id} userData={friend}
                                actionButton={confirmRemoveId === f.id ? (
                                    <div className="friend-actions" role="group" aria-label={`Remove ${displayName(friend)}?`}>
                                        <span className="friend-confirm-text">Remove {displayName(friend)}?</span>
                                        <button type="button" className="friend-action friend-action-danger" disabled={busyId === f.id}
                                            onClick={() => run(f.id, () => friendships.remove(f.id), `${displayName(friend)} was removed from your friends.`, 'Could not remove this friend.')}>
                                            Remove
                                        </button>
                                        <button type="button" className="friend-action friend-action-quiet" onClick={() => setConfirmRemoveId(null)}>
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <button type="button" className="friend-action friend-action-quiet"
                                        aria-label={`Remove ${displayName(friend)} from your friends`}
                                        onClick={() => setConfirmRemoveId(f.id)}>
                                        Remove
                                    </button>
                                )} />
                        );
                    })}
                </Section>

            </div>
        </div>
    );
};

const Section = ({ title, color, children, empty }) => {
    const headingId = `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    return (
    <section aria-labelledby={headingId} style={{ marginBottom: '40px' }}>
        <h4 id={headingId} style={{ fontSize: '1.1rem', marginBottom: '16px', color }}>{title}</h4>
        {empty || (
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>{children}</div>
        )}
    </section>
    );
};

const UserListItem = ({ userData, subText, actionButton }) => {
    const initial = (userData.firstName || userData.username || '?').charAt(0).toUpperCase();

    return (
        <div className="user-list-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
                <div style={{
                    width: '40px', height: '40px', borderRadius: '50%', flex: '0 0 auto',
                    backgroundColor: 'var(--primary)', color: '#1A0B02',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold', fontSize: '1.1rem'
                }} aria-hidden="true">
                    {initial}
                </div>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                        {userData.firstName} {userData.lastName} <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>@{userData.username}</span>
                    </div>
                    {/* Emails are never shown in the list, only name and @username */}
                    {subText && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{subText}</div>
                    )}
                </div>
            </div>
            {actionButton && <div style={{ flex: '0 0 auto' }}>{actionButton}</div>}
        </div>
    );
};

export default FriendsList;
