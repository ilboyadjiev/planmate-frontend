import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import SocialTabs from '../components/SocialTabs';
import useFriendships from '../hooks/useFriendships';
import ProfileModal from '../components/profile/ProfileModal';
import './FriendGroups.css';
import GlassPanel from '../components/GlassPanel';
import CalendarLoader from '../components/CalendarLoader';
import { displayName, Section, UserListItem } from './socialShared';

// suggestionReason lives in socialShared now; re-exported so existing imports keep working
export { suggestionReason } from './socialShared';

const matches = (person, term) =>
    displayName(person).toLowerCase().includes(term) || (person.username || '').toLowerCase().includes(term);

/**
 * The people you already know (the "Friends" tab): your friends, plus the requests you have received or sent. The
 * search box filters your own friends; finding new people is the "Find" tab.
 */
const FriendsList = () => {
    const { user } = useContext(AuthContext);
    const friendships = useFriendships();
    const [filter, setFilter] = useState('');
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');
    const [busyId, setBusyId] = useState(null);
    const [confirmRemoveId, setConfirmRemoveId] = useState(null);
    const [profileId, setProfileId] = useState(null); // the profile open in the pop-up

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

    if (!friendships.loaded) return <CalendarLoader label="Loading your friends…" size={88} className="is-page" />;

    const all = friendships.friendships;
    const other = (f) => (f.userA.id === user.id ? f.userB : f.userA);
    const friends = all.filter(f => f.status === 'accepted');
    const received = all.filter(f => f.status !== 'accepted' && f.userA.id !== user.id);
    const sent = all.filter(f => f.status !== 'accepted' && f.userA.id === user.id);

    const term = filter.trim().toLowerCase();
    const shownFriends = term ? friends.filter(f => matches(other(f), term)) : friends;

    return (
        <div className="groups-page social-page">
            <GlassPanel tall className="social-panel">

                <SocialTabs />

                {friends.length > 0 && (
                    <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
                        <label htmlFor="friend-filter" className="visually-hidden">Search your friends</label>
                        <input
                            id="friend-filter"
                            type="text"
                            placeholder="Search your friends..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            style={{ flexGrow: 1 }}
                        />
                    </form>
                )}

                {error && <div className="availability-message msg-error" role="alert" style={{ marginBottom: '24px' }}>{error}</div>}
                {successMsg && <div className="availability-message msg-success" role="status" style={{ marginBottom: '24px' }}>{successMsg}</div>}

                {received.length > 0 && (
                    <Section title={`Friend requests (${received.length})`} color="#F59E0B">
                        {received.map(f => (
                            <UserListItem onOpen={setProfileId} key={f.id} userData={other(f)} subText="Wants to be your friend"
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

                {sent.length > 0 && (
                    <Section title="Requests you sent" color="var(--text-muted)">
                        {sent.map(f => (
                            <UserListItem onOpen={setProfileId} key={f.id} userData={other(f)} subText="Waiting for an answer"
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
                        You don't have any friends added yet. Use the <strong>Find</strong> tab to search for people or add someone from "People you may know".
                    </div>
                )}>
                    {term && shownFriends.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>None of your friends match "{filter.trim()}".</p>
                    ) : shownFriends.map(f => {
                        const friend = other(f);
                        return (
                            <UserListItem onOpen={setProfileId} key={f.id} userData={friend}
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

            </GlassPanel>

            <ProfileModal personId={profileId} onHide={() => setProfileId(null)}
                onPlanned={(event, person) => setSuccessMsg(`"${event.title}" is planned and ${person.firstName || person.username} is invited. It's in your calendar.`)} />
        </div>
    );
};

export default FriendsList;
