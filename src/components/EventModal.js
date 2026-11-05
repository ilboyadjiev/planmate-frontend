import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import api from '../api/client';
import { AuthContext } from '../context/AuthContext';
import DateTimePicker from './DateTimePicker/index';
import VisibilityToggle from './VisibilityToggle';
import LocationSearch from './LocationSearch';
import { RESPONSES } from './calendarStatus';
import AddFriendButton from './AddFriendButton';
import PersonPill from './PersonPill';
import { usePreferences } from '../services/preferences';
import { useNavigate } from 'react-router-dom';
import { tagFeedPath } from './feed/feedText';
import ShareButton from './share/ShareButton';
import { eventUrl } from '../services/shareLinks';
import useFriendships from '../hooks/useFriendships';

const labelStyle = { fontWeight: '600', color: 'var(--text-main)' };

const formatRange = (start, end, timeFormat = '24h') => {
    const opts = { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
        hour12: timeFormat === '12h' };
    return `${new Date(start).toLocaleString([], opts)} – ${new Date(end).toLocaleString([], opts)}`;
};

const formatLocation = (location) => {
    if (!location) return null;
    const address = [location.street, [location.zipcode, location.city].filter(Boolean).join(' '), location.country]
        .filter(Boolean)
        .join(', ');
    return address && address !== location.name ? `${location.name} (${address})` : location.name;
};

// Maps a failed save to the field it concerns; "form" is for errors that belong to no single field
const saveErrors = (err, hasParticipants) => {
    const status = err?.response?.status;
    if (status === 400 && hasParticipants) {
        return { participants: 'Some of these people or groups can no longer be invited. Remove them and try again.' };
    }
    if (status === 404) return { form: 'This event no longer exists or you are not allowed to change it.' };
    return { form: 'The event could not be saved. Please try again.' };
};

// Which error a changed field clears
const ERROR_KEY_FOR_FIELD = { title: 'title', start: 'time', end: 'time', participants: 'participants' };

const FieldError = ({ id, message }) => (message ? <div id={id} className="field-error" role="alert">{message}</div> : null);

const Section = ({ label, children }) => (
    <div style={{ marginBottom: '16px' }}>
        <div style={{ ...labelStyle, fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
        <div style={{ color: 'var(--text-main)' }}>{children}</div>
    </div>
);

const ANSWER_ORDER = ['accepted', 'maybe', 'declined', 'pending'];
const ANSWER_HEADINGS = { accepted: 'Going', maybe: 'Maybe', declined: "Can't go", pending: 'Not answered yet' };

/**
 * Who answered what, for saved events: counts first, then the names per answer.
 * people: [{ id, name }], responses: { userId: answer }.
 */
const AnswersSummary = ({ people, responses }) => {
    const byAnswer = Object.fromEntries(ANSWER_ORDER.map(a => [a, []]));
    people.forEach(p => byAnswer[responses[String(p.id)] || 'pending'].push(p));
    const counts = ANSWER_ORDER.filter(a => byAnswer[a].length > 0)
        .map(a => `${byAnswer[a].length} ${a === 'pending' ? 'not answered' : ANSWER_HEADINGS[a].toLowerCase()}`);
    return (
        <section className="answers-summary" aria-labelledby="answers-heading">
            <div className="answers-header">
                <h3 id="answers-heading">Answers</h3>
                <span className="answers-counts">{counts.join(' · ')}</span>
            </div>
            <dl className="answers-list">
                {ANSWER_ORDER.filter(a => byAnswer[a].length > 0).map(a => (
                    <div key={a} className="answers-row">
                        <dt className={`participant-response response-${a}`}>{ANSWER_HEADINGS[a]} ({byAnswer[a].length})</dt>
                        <dd>{byAnswer[a].map(p => p.name).join(', ')}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
};

/** A section that opens and closes; closed by default unless defaultOpen. */
const Collapsible = ({ id, title, count, defaultOpen = false, children }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="pm-collapsible">
            <button type="button" className="pm-collapsible-toggle" aria-expanded={open} aria-controls={id}
                onClick={() => setOpen(o => !o)}>
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`pm-chevron${open ? ' is-open' : ''}`}>
                    <path d="M9 6l6 6-6 6" />
                </svg>
                {title}
                {count != null && <span className="pm-collapsible-count">{count}</span>}
            </button>
            <div id={id} hidden={!open} className="pm-collapsible-body">{children}</div>
        </div>
    );
};


/**
 * Create/edit form for the event creator, or a read-only details view (readOnly) for invited participants.
 * onSave may return a promise; if it rejects, the error is shown in the modal and the form stays open.
 * onRespond(response), given for invitees, records their answer (accepted, maybe, declined) and may reject.
 * availabilityCheck(start, end) -> { youFree, theyFree }, when planning with a friend (availabilityName):
 * the form then says whether you are both free at the chosen time.
 */
const EventModal = ({ show, onHide, initialData, onSave, isNewEvent, readOnly = false, onRespond,
    availabilityCheck, availabilityName }) => {
    const { user } = useContext(AuthContext);
    const { timeFormat } = usePreferences();
    const navigate = useNavigate();

    const [formData, setFormData] = useState(initialData);
    const [tagInput, setTagInput] = useState('');
    const friendships = useFriendships();
    const friends = friendships.friends;
    const [myGroups, setMyGroups] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [errors, setErrors] = useState({}); // { title, time, participants, form }
    const [saving, setSaving] = useState(false);
    const [responding, setResponding] = useState(false);
    const [respondError, setRespondError] = useState('');
    const [availability, setAvailability] = useState(null); // { youFree, theyFree } | 'checking' | null

    useEffect(() => {
        if (show) {
            setFormData(initialData);
            setTagInput('');
            setSearchQuery('');
            setErrors({});
            setRespondError('');

            if (user && user.id) {
                api.get('/v1/groups')
                    .then(res => setMyGroups(Array.isArray(res.data) ? res.data : []))
                    .catch(err => console.error('Could not fetch friend groups', err));
            }
        }
    }, [show, initialData, user]);

    // Planning with a friend: check, shortly after the time changes, whether you are both still free
    const startTime = formData?.start ? new Date(formData.start).getTime() : null;
    const endTime = formData?.end ? new Date(formData.end).getTime() : null;
    useEffect(() => {
        if (!show || !availabilityCheck || !startTime || !endTime || endTime <= startTime) {
            setAvailability(null);
            return undefined;
        }
        let cancelled = false;
        setAvailability('checking');
        const timer = setTimeout(() => {
            availabilityCheck(startTime, endTime)
                .then(result => { if (!cancelled) setAvailability(result); })
                .catch(() => { if (!cancelled) setAvailability(null); });
        }, 400);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [show, availabilityCheck, startTime, endTime]);

    // Everyone whose name we know: friends, plus members of your groups (who need not be your friends)
    const peopleById = useMemo(() => {
        const people = new Map();
        myGroups.forEach(g => (g.members || []).forEach(m => people.set(String(m.id), m)));
        friends.forEach(f => people.set(String(f.id), f));
        return people;
    }, [friends, myGroups]);

    // Invited groups. Inviting a group invites all its members; the server adds them to the participants.
    const isMe = (person) => user && String(person.id) === String(user.id);
    const selectedGroups = (formData?.groups || []).map(g =>
        myGroups.find(mine => String(mine.id) === String(g.id)) || { id: g.id, name: null, members: [] });
    const membersOf = (group) => (group.members || []).filter(m => !isMe(m));
    const coveredIds = new Set(selectedGroups.flatMap(g => membersOf(g).map(m => String(m.id))));
    const availableGroups = myGroups.filter(g => !selectedGroups.some(sel => String(sel.id) === String(g.id)));

    const addGroup = (group) => handleChange('groups', [...(formData.groups || []), { id: group.id }]);

    const removeGroup = (group) => {
        const remaining = (formData.groups || []).filter(g => String(g.id) !== String(group.id));
        const stillCovered = new Set(selectedGroups
            .filter(g => String(g.id) !== String(group.id))
            .flatMap(g => membersOf(g).map(m => String(m.id))));
        const leaving = new Set(membersOf(group).map(m => String(m.id)));
        handleChange('groups', remaining);
        // Uninvite the group's members, unless another invited group still includes them
        handleChange('participants', (formData.participants || [])
            .filter(p => !leaving.has(String(p.id)) || stillCovered.has(String(p.id))));
    };

    // Saved events carry every invitee's name from the server; people just added come from friends and groups
    const participantName = (p) => {
        if (isMe(p)) return 'You';
        const known = p.username || p.firstName ? p : peopleById.get(String(p.id)) || {};
        const fullName = [known.firstName, known.lastName].filter(Boolean).join(' ');
        if (fullName) return fullName;
        return known.username ? `@${known.username}` : 'Someone you invited';
    };

    // Answers are about the saved invite list, not people added in this edit who have not been asked yet
    const answersSummary = !isNewEvent && initialData?.responses && (initialData.participants || []).length > 0 ? (
        <AnswersSummary
            people={(initialData.participants || []).map(p => ({ id: p.id, name: participantName(p) }))}
            responses={initialData.responses}
        />
    ) : null;

    // Everything we know about someone (their name and username), for their pill
    const personData = (p) => (isMe(p) ? { ...user, ...p, id: p.id } : { ...peopleById.get(String(p.id)), ...p });

    // Answers are only known for saved events; people added in this edit have not been asked yet
    const responseOf = (p) => (formData?.responses ? formData.responses[String(p.id)] || 'pending' : null);

    const handleRespond = async (response) => {
        setResponding(true);
        setRespondError('');
        try {
            await onRespond(response);
        } catch (err) {
            setRespondError('Your answer could not be saved. Please try again.');
        } finally {
            setResponding(false);
        }
    };

    const organizerName = () => {
        const creator = formData?.creatorId;
        const friend = creator && friends.find(f => f.email === creator);
        if (friend) return `${friend.firstName || ''} @${friend.username}`.trim();
        // Events joined from the feed only carry the host's display name, never their email
        return formData?.hostName || 'Unknown';
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        const errorKey = ERROR_KEY_FOR_FIELD[field];
        if (errorKey) setErrors(prev => (prev[errorKey] || prev.form ? { ...prev, [errorKey]: undefined, form: undefined } : prev));
    };

    const normalizeTag = (raw) => {
        let tag = raw.trim().toLowerCase().replace(/,/g, '');
        if (tag && !tag.startsWith('#')) tag = '#' + tag;
        return tag;
    };

    const handleAddTag = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const newTag = normalizeTag(tagInput);
            if (newTag && !(formData.tags || []).includes(newTag)) {
                handleChange('tags', [...(formData.tags || []), newTag]);
            }
            setTagInput('');
        }
    };

    const toggleParticipant = (friend) => {
        const current = formData.participants || [];
        const isSelected = current.some(p => String(p.id) === String(friend.id));
        handleChange('participants', isSelected
            ? current.filter(p => String(p.id) !== String(friend.id))
            : [...current, friend]);
        setSearchQuery('');
    };

    const handleSaveClick = async () => {
        // Validate every field at once, so all problems are visible together
        const validation = {};
        if (!formData.title || !formData.title.trim()) {
            validation.title = 'Please give the event a title.';
        }
        if (new Date(formData.start) >= new Date(formData.end)) {
            validation.time = 'The end must be after the start.';
        }
        setErrors(validation);
        if (Object.keys(validation).length > 0) return;

        let finalTags = formData.tags || [];
        const pendingTag = normalizeTag(tagInput);
        if (pendingTag && !finalTags.includes(pendingTag)) finalTags = [...finalTags, pendingTag];

        setSaving(true);
        try {
            await onSave({ ...formData, tags: finalTags });
        } catch (err) {
            setErrors(saveErrors(err, (formData.participants || []).length > 0 || (formData.groups || []).length > 0));
        } finally {
            setSaving(false);
        }
    };

    const filteredFriends = friends.filter(f =>
        (f.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         f.firstName?.toLowerCase().includes(searchQuery.toLowerCase())) &&
        !(formData?.participants || []).some(sf => String(sf.id) === String(f.id)) &&
        !coveredIds.has(String(f.id))
    );

    // People invited one by one (group members are listed under their group)
    const individualParticipants = (formData?.participants || []).filter(p => !coveredIds.has(String(p.id)));

    const groupMembersList = (group, removable) => (
        <div key={group.id} className="invited-group">
            <div className="invited-group-header">
                <strong>{group.name || 'A friend group'}</strong>
                <span className="invited-group-count">{membersOf(group).length} invited</span>
                {removable && (
                    <button type="button" className="pm-chip-remove invited-group-remove"
                        aria-label={`Remove group ${group.name || ''}`.trim()} onClick={() => removeGroup(group)}>×</button>
                )}
            </div>
            <ul className="person-lines">
                {membersOf(group).map(m => (
                    <li key={m.id} className="person-line">
                        <PersonPill person={personData(m)} answer={!isNewEvent ? responseOf(m) : null} />
                        <AddFriendButton person={personData(m)} friendships={friendships} />
                    </li>
                ))}
            </ul>
        </div>
    );

    if (!formData) return null;

    if (readOnly) {
        // Everyone invited except you. Each person appears once:
        // 1. inside an invited group you are in (the server only sends those; first group alphabetically),
        // 2. else under your friends, 3. else under other people invited.
        const others = (formData.participants || []).filter(p => !isMe(p));
        const invitedIds = new Set(others.map(p => String(p.id)));
        const organizerId = formData.organizer ? String(formData.organizer.id) : null;
        const isFriend = (p) => friendships.relationOf(p.id).state === 'friend';
        const answerRank = (p) => ({ accepted: 0, maybe: 1, pending: 2, declined: 3 }[responseOf(p) || 'pending']);
        const byAnswer = (a, b) => answerRank(a) - answerRank(b) || participantName(a).localeCompare(participantName(b));
        const asInvitee = (member) => ({ ...member, ...(others.find(o => String(o.id) === String(member.id)) || {}), id: member.id });

        const placed = new Set();
        const groupBlocks = selectedGroups
            .filter(g => g.name)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(group => {
                const members = (group.members || [])
                    .filter(m => !isMe(m) && !placed.has(String(m.id))
                        && (invitedIds.has(String(m.id)) || String(m.id) === organizerId))
                    .map(asInvitee);
                members.forEach(m => placed.add(String(m.id)));
                // Organizer first, then by answer
                members.sort((a, b) => (String(b.id) === organizerId) - (String(a.id) === organizerId) || byAnswer(a, b));
                return { group, members };
            })
            .filter(block => block.members.length > 0);
        const friendsOutside = others.filter(p => !placed.has(String(p.id)) && isFriend(p)).sort(byAnswer);
        const notFriends = friendships.loaded
            ? others.filter(p => !placed.has(String(p.id)) && !isFriend(p)).sort(byAnswer) : [];
        const friendsCount = groupBlocks.reduce((n, b) => n + b.members.length, 0) + friendsOutside.length;

        // One person per line: their bubble (name and answer), with "Add friend" next to it when they aren't yet
        const personLine = (person) => (
            <li key={person.id} className="person-line">
                <PersonPill person={personData(person)}
                    note={String(person.id) === organizerId ? 'organizer' : null}
                    answer={String(person.id) === organizerId ? null : responseOf(person)} />
                <AddFriendButton person={personData(person)} friendships={friendships} />
            </li>
        );
        return (
            <Modal show={show} onHide={onHide} contentClassName="modern-modal" centered aria-labelledby="event-modal-title">
                <Modal.Header closeButton>
                    <Modal.Title id="event-modal-title" style={{ color: 'var(--text-main)' }}>{formData.title || 'Event'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="pm-chip pm-chip-banner">
                        {{ going: "You're going", invited: "You're invited" }[formData.viewerRole] || 'Public event'} · only the organizer can make changes
                    </div>
                    {onRespond && (
                        <div className="rsvp-block">
                            <div id="rsvp-label" className="rsvp-question">Will you be there?</div>
                            <div className="rsvp-buttons" role="group" aria-labelledby="rsvp-label">
                                {RESPONSES.map(({ value, label }) => (
                                    <button key={value} type="button" className={`rsvp-button rsvp-${value}`}
                                        aria-pressed={formData.myResponse === value} disabled={responding}
                                        onClick={() => handleRespond(value)}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <FieldError id="rsvp-error" message={respondError} />
                        </div>
                    )}
                    {formData.responses && (formData.participants || []).length > 0 && (
                        <AnswersSummary
                            people={(formData.participants || []).map(p => ({ id: p.id, name: participantName(p) }))}
                            responses={formData.responses}
                        />
                    )}
                    <Section label="When">{formatRange(formData.start, formData.end, timeFormat)}</Section>
                    <Section label="Organizer">{organizerName()}</Section>
                    {formData.location && <Section label="Location">{formatLocation(formData.location)}</Section>}
                    {formData.description && (
                        <Section label="Description"><span style={{ whiteSpace: 'pre-wrap' }}>{formData.description}</span></Section>
                    )}
                    {friendsCount > 0 && (
                        <Collapsible id="invited-friends" title="Friends" count={friendsCount} defaultOpen>
                            {groupBlocks.map(({ group, members }) => (
                                <div key={group.id} className="group-bubble" role="group" aria-label={`Group: ${group.name}`}>
                                    <span className="group-bubble-label">{group.name}</span>
                                    <ul className="person-lines">{members.map(personLine)}</ul>
                                </div>
                            ))}
                            {friendsOutside.length > 0 && <ul className="person-lines">{friendsOutside.map(personLine)}</ul>}
                        </Collapsible>
                    )}
                    {notFriends.length > 0 && (
                        <Collapsible id="other-invitees" title="Other people invited" count={notFriends.length}>
                            <ul className="person-lines">{notFriends.map(personLine)}</ul>
                        </Collapsible>
                    )}
                    {(formData.tags || []).length > 0 && (
                        <Section label="Tags">
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {formData.tags.map(tag => (
                                    // Shows more events like this one: closes the details and filters Discover by the tag
                                    <button key={tag} type="button" className="pm-chip pm-chip-action"
                                        onClick={() => { onHide(); navigate(tagFeedPath(tag)); }}
                                        aria-label={`Show more ${tag} events`}>
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </Section>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    {formData.id && <ShareButton url={eventUrl(formData.id)} title={formData.title} className="me-auto" />}
                    <Button variant="primary" onClick={onHide} className="btn-modern-primary">Close</Button>
                </Modal.Footer>
            </Modal>
        );
    }

    return (
        <Modal show={show} onHide={onHide} contentClassName="modern-modal" centered aria-labelledby="event-modal-title">
            <Modal.Header closeButton>
                <Modal.Title id="event-modal-title" style={{ color: 'var(--text-main)' }}>{isNewEvent ? 'Create New Event' : 'Edit Event'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {answersSummary}
                <Form onSubmit={e => e.preventDefault()}>
                    <Form.Group controlId="formTitle" style={{ marginBottom: '16px' }}>
                        <Form.Label style={labelStyle}>Event Title</Form.Label>
                        <Form.Control
                            type="text"
                            value={formData.title}
                            onChange={e => handleChange('title', e.target.value)}
                            placeholder="e.g., Weekend Hike"
                            className={errors.title ? 'field-invalid' : undefined}
                            aria-invalid={!!errors.title}
                            aria-describedby={errors.title ? 'title-error' : undefined}
                        />
                        <FieldError id="title-error" message={errors.title} />
                    </Form.Group>

                    <Form.Group controlId="formIsPublic" style={{ marginBottom: '24px' }}>
                        <Form.Label style={{ ...labelStyle, display: 'block' }}>Event Visibility</Form.Label>
                        <VisibilityToggle
                            isPublic={formData.isPublic}
                            onChange={(val) => handleChange('isPublic', val)}
                        />
                    </Form.Group>

                    <DateTimePicker
                        start={formData.start}
                        end={formData.end}
                        error={errors.time}
                        onChange={(newStart, newEnd) => {
                            handleChange('start', newStart);
                            handleChange('end', newEnd);
                        }}
                    />
                    {availability && (
                        <p className={`availability-note ${availability === 'checking' ? 'is-checking'
                            : availability.youFree && availability.theyFree ? 'is-free' : 'is-busy'}`} role="status">
                            {availability === 'checking' && 'Checking if you are both free…'}
                            {availability !== 'checking' && availability.youFree && availability.theyFree && `✓ You and ${availabilityName} are both free then`}
                            {availability !== 'checking' && !availability.theyFree && `${availabilityName} has something else then`}
                            {availability !== 'checking' && availability.theyFree && !availability.youFree && 'You have something else then'}
                        </p>
                    )}

                    <Form.Group controlId="formDescription" style={{ marginBottom: '24px' }}>
                        <Form.Label style={labelStyle}>Description</Form.Label>
                        <Form.Control as="textarea" rows={3} value={formData.description || ''} onChange={e => handleChange('description', e.target.value)} />
                    </Form.Group>

                    <Form.Group controlId="formLocation" style={{ marginBottom: '16px' }}>
                        <Form.Label style={labelStyle}>Location</Form.Label>
                        <LocationSearch
                            initialQuery={initialData.location?.name}
                            onSelectLocation={(loc) => handleChange('location', loc)}
                            enableSuggestions={!!user}
                        />
                    </Form.Group>

                    {user && (
                        <Form.Group controlId="formParticipants" style={{ position: 'relative', marginBottom: '16px' }}>
                            <Form.Label style={labelStyle}>Participants</Form.Label>
                            {availableGroups.length > 0 && (
                                <Collapsible id="invite-groups" title="Invite a group" count={availableGroups.length}>
                                    <div className="invite-groups" role="group" aria-label="Invite a friend group">
                                        {availableGroups.map(g => (
                                            <button key={g.id} type="button" className="pm-chip pm-chip-action" onClick={() => addGroup(g)}>
                                                + {g.name} <span className="invite-group-size">({membersOf(g).length})</span>
                                            </button>
                                        ))}
                                    </div>
                                </Collapsible>
                            )}
                            {myGroups.length === 0 && (
                                <p className="invite-groups-hint">
                                    Tip: <a href="/profile/groups">create a friend group</a> to invite several friends with one click.
                                </p>
                            )}
                            {selectedGroups.map(g => groupMembersList(g, true))}
                            <div className="person-lines" style={{ marginBottom: '10px' }}>
                                {individualParticipants.map(p => (
                                    <div key={p.id} className="person-line">
                                        <PersonPill person={personData(p)} answer={!isNewEvent ? responseOf(p) : null} />
                                        <button type="button" className="pm-chip-remove" aria-label={`Remove ${participantName(p)}`} onClick={() => toggleParticipant(p)}>×</button>
                                    </div>
                                ))}
                            </div>
                            <Form.Control
                                type="text"
                                placeholder="Search friends..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                autoComplete="off"
                                className={errors.participants ? 'field-invalid' : undefined}
                                aria-invalid={!!errors.participants}
                                aria-describedby={errors.participants ? 'participants-error' : undefined}
                            />
                            <FieldError id="participants-error" message={errors.participants} />
                            {searchQuery && (
                                <div className="friend-search-results">
                                    {filteredFriends.map(f => (
                                        <div key={f.id} className="friend-search-item" role="button" tabIndex={0}
                                            onClick={() => toggleParticipant(f)}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); toggleParticipant(f); } }}>
                                            <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{f.firstName}</span> <span style={{ color: 'var(--text-muted)' }}>@{f.username}</span>
                                        </div>
                                    ))}
                                    {filteredFriends.length === 0 && <div style={{ padding: '10px', color: 'var(--text-muted)' }}>No friends found.</div>}
                                </div>
                            )}
                        </Form.Group>
                    )}

                    <Form.Group controlId="formTags">
                        <Form.Label style={labelStyle}>Tags</Form.Label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                            {(formData.tags || []).map(tag => (
                                <div key={tag} className="pm-chip">
                                    {tag}
                                    <button type="button" className="pm-chip-remove" aria-label={`Remove tag ${tag}`} onClick={() => handleChange('tags', formData.tags.filter(t => t !== tag))}>×</button>
                                </div>
                            ))}
                        </div>
                        <Form.Control type="text" placeholder="Type tag and press Enter" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleAddTag} />
                    </Form.Group>
                </Form>

                {errors.form && <div className="field-error" role="alert" style={{ marginTop: '16px' }}>{errors.form}</div>}
            </Modal.Body>
            <Modal.Footer>
                {!isNewEvent && formData.id && <ShareButton url={eventUrl(formData.id)} title={formData.title} className="me-auto" />}
                <Button variant="secondary" onClick={onHide} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}>Cancel</Button>
                <Button variant="primary" onClick={handleSaveClick} className="btn-modern-primary" disabled={saving}>
                    {saving ? 'Saving...' : isNewEvent ? 'Create Event' : 'Save Changes'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default EventModal;
