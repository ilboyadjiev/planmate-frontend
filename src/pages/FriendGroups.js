import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api from '../api/client';
import { AuthContext } from '../context/AuthContext';
import SocialTabs from '../components/SocialTabs';
import GlassPanel from '../components/GlassPanel';
import AddFriendButton from '../components/AddFriendButton';
import PersonPill from '../components/PersonPill';
import EventModal from '../components/EventModal';
import ProfileModal from '../components/profile/ProfileModal';
import useFriendships from '../hooks/useFriendships';
import { blankEvent, createEvent } from '../services/eventService';
import './FriendGroups.css';

const MAX_NAME_LENGTH = 60;

const displayName = (person) => [person.firstName, person.lastName].filter(Boolean).join(' ') || person.username;

const errorMessage = (err, fallback) => {
    const status = err?.response?.status;
    if (status === 404) return 'This group was changed by someone else. Showing the latest version.';
    if (status === 400) return err.response?.data?.message || 'Please check your input and try again.';
    return fallback;
};


/** One group: rename, see members, add your friends, remove members, leave. */
const GroupCard = ({ group, me, friends, friendships, autoOpenAdd, onChanged, onGone, onReload, onPlan, onOpenProfile }) => {
    const [renaming, setRenaming] = useState(false);
    const [name, setName] = useState(group.name);
    const [adding, setAdding] = useState(autoOpenAdd);
    const [query, setQuery] = useState('');
    const [confirmLeave, setConfirmLeave] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const searchRef = useRef(null);

    useEffect(() => { if (adding && searchRef.current) searchRef.current.focus(); }, [adding]);

    const memberIds = new Set(group.members.map(m => m.id));
    const others = group.members.filter(m => m.id !== me.id);
    const addable = friends
        .filter(f => !memberIds.has(f.id))
        .filter(f => `${displayName(f)} ${f.username}`.toLowerCase().includes(query.trim().toLowerCase()));
    const headingId = `group-${group.id}-name`;

    const run = async (request, fallback) => {
        setBusy(true);
        setError('');
        try {
            const res = await request();
            return res;
        } catch (err) {
            setError(errorMessage(err, fallback));
            // Someone else changed the group meanwhile (removed you or the person): show the current state
            if (err?.response?.status === 404) onReload();
            return null;
        } finally {
            setBusy(false);
        }
    };

    const saveName = async (e) => {
        e.preventDefault();
        if (!name.trim()) { setError('Give the group a name.'); return; }
        const res = await run(() => api.patch(`/v1/groups/${group.id}`, { name }), 'The group could not be renamed.');
        if (res) { onChanged(res.data); setRenaming(false); }
    };

    const addFriend = async (friend) => {
        const res = await run(() => api.post(`/v1/groups/${group.id}/members`, { userIds: [friend.id] }),
            `${displayName(friend)} could not be added.`);
        if (res) { onChanged(res.data); setQuery(''); }
    };

    const removeMember = async (person) => {
        const res = await run(() => api.delete(`/v1/groups/${group.id}/members/${person.id}`),
            `${displayName(person)} could not be removed.`);
        if (res) onChanged(res.data);
    };

    const leave = async () => {
        const res = await run(() => api.delete(`/v1/groups/${group.id}/members/${me.id}`), 'You could not leave the group.');
        if (res) onGone(group.id);
    };

    return (
        <article className="group-card" aria-labelledby={headingId}>
            <header className="group-card-header">
                {renaming ? (
                    <form className="group-rename" onSubmit={saveName}>
                        <label htmlFor={`rename-${group.id}`} className="visually-hidden">Group name</label>
                        <input id={`rename-${group.id}`} type="text" value={name} maxLength={MAX_NAME_LENGTH} autoFocus
                            onChange={e => setName(e.target.value)} />
                        <button type="submit" className="group-button group-button-primary" disabled={busy}>Save</button>
                        <button type="button" className="group-button" onClick={() => { setRenaming(false); setName(group.name); setError(''); }}>
                            Cancel
                        </button>
                    </form>
                ) : (
                    <>
                        <div>
                            <h2 id={headingId} className="group-name">{group.name}</h2>
                            <span className="group-count">{group.members.length} {group.members.length === 1 ? 'member' : 'members'}</span>
                        </div>
                        <button type="button" className="group-button" onClick={() => setRenaming(true)}
                            aria-label={`Rename ${group.name}`}>
                            Rename
                        </button>
                    </>
                )}
            </header>

            <ul className="group-members" aria-label={`Members of ${group.name}`}>
                {group.members.map(person => (
                    <li key={person.id} className="group-member-line">
                        <PersonPill person={person} label={person.id === me.id ? 'You' : null}
                            onClick={() => onOpenProfile(person.id)} ariaLabel={`Open ${displayName(person)}'s profile`} />
                        {person.id !== me.id && <AddFriendButton person={person} friendships={friendships} />}
                        {person.id !== me.id && (
                            <button type="button" className="pm-chip-remove group-remove" disabled={busy}
                                aria-label={`Remove ${displayName(person)} from ${group.name}`}
                                onClick={() => removeMember(person)}>
                                ×
                            </button>
                        )}
                    </li>
                ))}
            </ul>

            {adding ? (
                <div className="group-add">
                    <label htmlFor={`add-${group.id}`} className="group-add-label">Add friends</label>
                    <input id={`add-${group.id}`} ref={searchRef} type="text" placeholder="Search your friends…"
                        value={query} onChange={e => setQuery(e.target.value)} autoComplete="off" />
                    {friends.length === 0 ? (
                        <p className="group-muted">Add friends first, then you can put them in groups.</p>
                    ) : addable.length === 0 ? (
                        <p className="group-muted">{query ? 'No matching friends.' : 'All your friends are already in this group.'}</p>
                    ) : (
                        <ul className="group-add-list">
                            {addable.map(friend => (
                                <li key={friend.id} className="group-member-line">
                                    <PersonPill person={friend} />
                                    <button type="button" className="group-button group-button-small" disabled={busy}
                                        onClick={() => addFriend(friend)} aria-label={`Add ${displayName(friend)} to ${group.name}`}>
                                        Add
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <button type="button" className="group-link" onClick={() => { setAdding(false); setQuery(''); }}>Done</button>
                </div>
            ) : null}

            {error && <p className="field-error" role="alert">{error}</p>}

            <footer className="group-card-footer">
                <button type="button" className="group-button group-button-primary" onClick={() => onPlan(group)}
                    aria-label={`Plan something with ${group.name}`}>
                    Plan something
                </button>
                {!adding && (
                    <button type="button" className="group-button" onClick={() => setAdding(true)}>
                        + Add friends
                    </button>
                )}
                {confirmLeave ? (
                    <div className="group-leave-confirm" role="group" aria-label="Confirm leaving">
                        <span>{others.length === 0 ? `Leave and delete "${group.name}"?` : `Leave "${group.name}"?`}</span>
                        <button type="button" className="group-button group-button-danger" disabled={busy} onClick={leave}>Leave</button>
                        <button type="button" className="group-button" onClick={() => setConfirmLeave(false)}>Cancel</button>
                    </div>
                ) : (
                    <button type="button" className="group-link group-link-danger" onClick={() => setConfirmLeave(true)}>
                        Leave group
                    </button>
                )}
            </footer>
        </article>
    );
};

/**
 * Friend groups, e.g. "Sports team" or "Board games". Groups have no owner: every member can rename the group
 * and add or remove people. You can only add your own friends, and the same friend can be in many groups.
 */
const FriendGroups = () => {
    const { user } = useContext(AuthContext);
    const [groups, setGroups] = useState([]);
    const friendships = useFriendships();
    const friends = useMemo(() => [...friendships.friends].sort((a, b) => displayName(a).localeCompare(displayName(b))),
        [friendships.friends]);
    const [planning, setPlanning] = useState(null); // the new event being planned for a group
    const [planNotice, setPlanNotice] = useState('');
    const [profileId, setProfileId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [newName, setNewName] = useState('');
    const [createError, setCreateError] = useState('');
    const [creating, setCreating] = useState(false);
    const [justCreatedId, setJustCreatedId] = useState(null);

    const me = useMemo(() => ({ id: user?.id }), [user]);

    const load = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        setLoadError(false);
        try {
            const groupsRes = await api.get('/v1/groups');
            setGroups(groupsRes.data);
        } catch (err) {
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { load(); }, [load]);

    const createGroup = async (e) => {
        e.preventDefault();
        if (!newName.trim()) { setCreateError('Give the group a name.'); return; }
        setCreating(true);
        setCreateError('');
        try {
            const res = await api.post('/v1/groups', { name: newName, memberIds: [] });
            setGroups(prev => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
            setJustCreatedId(res.data.id);
            setNewName('');
        } catch (err) {
            setCreateError(errorMessage(err, 'The group could not be created. Please try again.'));
        } finally {
            setCreating(false);
        }
    };

    // "Plan something": the new-event form with the group already invited
    const planFor = (group) => {
        setPlanNotice('');
        setPlanning({ group, event: blankEvent(null, null, { groups: [{ id: group.id }] }) });
    };

    const savePlan = async (formData) => {
        await createEvent(formData); // errors propagate to the form
        const invited = (formData.groups || []).map(g => groups.find(x => x.id === g.id)?.name).filter(Boolean);
        setPlanNotice(`"${formData.title}" is planned${invited.length ? ` and ${invited.join(', ')} invited` : ''}. It's in your calendar.`);
        setPlanning(null);
    };

    const replaceGroup = (updated) => setGroups(prev => prev.map(g => (g.id === updated.id ? updated : g)));
    const dropGroup = (id) => setGroups(prev => prev.filter(g => g.id !== id));

    return (
        <div className="groups-page">
            <GlassPanel tall className="social-panel">
            <SocialTabs />
            <h1>Friend Groups</h1>
            <p className="groups-intro">
                Put your friends into groups like "Sports team" or "Board games". A friend can be in as many groups as you
                like. Groups have no owner: everyone in a group can rename it and add or remove people. New members are
                automatically invited to the group's upcoming events.
            </p>

            <form className="group-create" onSubmit={createGroup} noValidate>
                <label htmlFor="new-group-name" className="visually-hidden">New group name</label>
                <input id="new-group-name" type="text" placeholder="New group name, e.g. Sports team" value={newName}
                    maxLength={MAX_NAME_LENGTH} onChange={e => { setNewName(e.target.value); setCreateError(''); }}
                    aria-invalid={!!createError} aria-describedby={createError ? 'new-group-error' : undefined} />
                <button type="submit" className="group-button group-button-primary group-create-button" disabled={creating}>
                    {creating ? 'Creating…' : 'Create group'}
                </button>
            </form>
            {createError && <p id="new-group-error" className="field-error" role="alert">{createError}</p>}
            {planNotice && <p className="group-plan-notice" role="status">{planNotice}</p>}

            {loading && <p className="group-muted">Loading your groups…</p>}
            {!loading && loadError && (
                <p className="field-error" role="alert">
                    Your groups could not be loaded.{' '}
                    <button type="button" className="group-link" onClick={load}>Try again</button>
                </p>
            )}
            {!loading && !loadError && groups.length === 0 && (
                <div className="groups-empty">
                    <p><strong>No groups yet.</strong></p>
                    <p className="group-muted">Create your first group above, then add friends to it.</p>
                </div>
            )}

            <div className="groups-list">
                {groups.map(group => (
                    <GroupCard key={group.id} group={group} me={me} friends={friends} friendships={friendships} onPlan={planFor} onOpenProfile={setProfileId}
                        autoOpenAdd={group.id === justCreatedId} onChanged={replaceGroup} onGone={dropGroup} onReload={load} />
                ))}
            </div>
            </GlassPanel>

            <ProfileModal personId={profileId} onHide={() => setProfileId(null)}
                onPlanned={(event, person) => setPlanNotice(`"${event.title}" is planned and ${person.firstName || person.username} is invited. It's in your calendar.`)} />

            {planning && (
                <EventModal show initialData={planning.event} onSave={savePlan} onHide={() => setPlanning(null)} isNewEvent />
            )}
        </div>
    );
};

export default FriendGroups;
