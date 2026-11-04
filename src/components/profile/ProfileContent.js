import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import AddFriendButton from '../AddFriendButton';
import FeedEventCard from '../feed/FeedEventCard';
import useFriendships from '../../hooks/useFriendships';
import { avatarColor, initials } from '../feed/feedText';
import '../../pages/FriendGroups.css';
import '../feed/DiscoveryFeed.css';

const displayName = (person) => [person.firstName, person.lastName].filter(Boolean).join(' ') || person.username;

/**
 * Someone's profile: who they are, what you have in common (mutual friends, shared groups) and their upcoming
 * public events. Events they joined are only shown to their friends; the server leaves them out for everyone else.
 *
 * Used in the profile pop-up and on the /people/:id page. onOpenPerson(id), when given, opens mutual friends in
 * place (the pop-up); without it they are links to their pages. onLoaded(profile) reports the loaded profile.
 * onPlan(profile), when given, shows "Plan something with ..." on friends' profiles.
 */
const ProfileContent = ({ personId: id, onOpenPerson, onLoaded, onPlan }) => {
    const friendships = useFriendships();
    const [profile, setProfile] = useState(null);
    const [status, setStatus] = useState('loading'); // loading | ready | notFound | error
    const [pendingId, setPendingId] = useState(null);
    const [actionError, setActionError] = useState('');

    const load = useCallback(async () => {
        setStatus('loading');
        try {
            const res = await api.get(`/v1/people/${id}`);
            setProfile(res.data);
            setStatus('ready');
            if (onLoaded) onLoaded(res.data);
        } catch (err) {
            setStatus(err?.response?.status === 404 ? 'notFound' : 'error');
        }
    }, [id, onLoaded]);

    useEffect(() => { load(); }, [load]);

    // Join or leave one of their public events, right from the profile
    const toggleGoing = async (event) => {
        setPendingId(event.id);
        setActionError('');
        try {
            const url = `/v2/events/${event.id}/attendance`;
            const res = event.going ? await api.delete(url) : await api.post(url);
            const replace = list => (list || []).map(e => (e.id === event.id ? res.data : e));
            setProfile(prev => ({ ...prev, hosting: replace(prev.hosting), going: replace(prev.going) }));
        } catch (err) {
            setActionError(event.going ? 'Could not leave the event. Please try again.' : 'Could not join the event. Please try again.');
        } finally {
            setPendingId(null);
        }
    };

    if (status === 'loading') return <p className="profile-status">Loading profile…</p>;
    if (status === 'notFound') return <p className="profile-status">This person could not be found.</p>;
    if (status === 'error') {
        return (
            <p className="profile-status" role="alert">
                The profile could not be loaded. <button type="button" className="group-link" onClick={load}>Try again</button>
            </p>
        );
    }

    const name = displayName(profile);
    const relation = friendships.relationOf(profile.id);
    const eventList = (events, empty) => (events.length === 0 ? <p className="group-muted">{empty}</p> : (
        <div className="profile-events">
            {events.map(event => (
                <FeedEventCard key={event.id} event={event} loggedIn pending={pendingId === event.id} onToggleGoing={toggleGoing} />
            ))}
        </div>
    ));

    return (
        <div className="profile-content">
            <header className="profile-header">
                <span className="profile-avatar" style={{ background: avatarColor(profile.id) }} aria-hidden="true">
                    {initials(profile.firstName, profile.lastName, profile.username)}
                </span>
                <div className="profile-identity">
                    <h2 className="profile-name" id={`profile-name-${profile.id}`}>{name}</h2>
                    <span className="profile-handle">@{profile.username}</span>
                </div>
                <div className="profile-action">
                    {profile.self && <Link to="/profile/edit" className="group-button">Edit profile</Link>}
                    {!profile.self && relation.state === 'friend' && <span className="pm-chip">Friends</span>}
                    {!profile.self && <AddFriendButton person={profile} friendships={friendships} />}
                </div>
            </header>

            {profile.self && <p className="group-muted">This is how others see your profile.</p>}

            {!profile.self && (profile.mutualFriends.length > 0 || profile.sharedGroups.length > 0) && (
                <section className="profile-section" aria-labelledby={`in-common-${profile.id}`}>
                    <h3 id={`in-common-${profile.id}`}>In common</h3>
                    {profile.mutualFriends.length > 0 && (
                        <p>
                            <strong>{profile.mutualFriends.length} mutual {profile.mutualFriends.length === 1 ? 'friend' : 'friends'}:</strong>{' '}
                            {profile.mutualFriends.map((f, i) => (
                                <React.Fragment key={f.id}>
                                    {i > 0 && ', '}
                                    {onOpenPerson ? (
                                        <button type="button" className="person-link person-link-button" onClick={() => onOpenPerson(f.id)}>
                                            {displayName(f)}
                                        </button>
                                    ) : (
                                        <Link to={`/people/${f.id}`} className="person-link">{displayName(f)}</Link>
                                    )}
                                </React.Fragment>
                            ))}
                        </p>
                    )}
                    {profile.sharedGroups.length > 0 && (
                        <p>
                            <strong>Your groups together:</strong>{' '}
                            <Link to="/profile/groups" className="person-link">{profile.sharedGroups.join(', ')}</Link>
                        </p>
                    )}
                </section>
            )}

            {actionError && <p className="field-error" role="alert">{actionError}</p>}

            <section className="profile-section" aria-labelledby={`hosting-${profile.id}`}>
                <h3 id={`hosting-${profile.id}`}>{profile.self ? 'Public events you host' : `Public events ${profile.firstName || name} hosts`}</h3>
                {eventList(profile.hosting, 'No upcoming public events.')}
            </section>

            <section className="profile-section" aria-labelledby={`going-${profile.id}`}>
                <h3 id={`going-${profile.id}`}>{profile.self ? 'Public events you are going to' : `${profile.firstName || name} is going to`}</h3>
                {profile.self || profile.friend
                    ? eventList(profile.going, 'No upcoming public events.')
                    : <p className="group-muted">Only {profile.firstName || name}'s friends can see which events they are going to.</p>}
            </section>

            {!profile.self && onPlan && (profile.friend || relation.state === 'friend') && (
                <button type="button" className="plan-with-button" onClick={() => onPlan(profile)}>
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" />
                    </svg>
                    Plan something with {profile.firstName || name}
                </button>
            )}
        </div>
    );
};

export default ProfileContent;
