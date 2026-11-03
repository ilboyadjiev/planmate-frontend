import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import api from '../api/client';
import { AuthContext } from '../context/AuthContext';
import DateTimePicker from './DateTimePicker/index';
import VisibilityToggle from './VisibilityToggle';
import LocationSearch from './LocationSearch';

const labelStyle = { fontWeight: '600', color: 'var(--text-main)' };
const chipStyle = {
    background: 'rgba(79, 70, 229, 0.2)', color: '#a5b4fc', padding: '4px 12px', borderRadius: '16px',
    fontSize: '0.85rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px',
    border: '1px solid rgba(79, 70, 229, 0.3)',
};
const tagChipStyle = {
    background: 'rgba(240, 106, 37, 0.15)', color: 'var(--primary)', padding: '4px 12px', borderRadius: '16px',
    fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px',
    border: '1px solid rgba(240, 106, 37, 0.3)',
};
const removeButtonStyle = { background: 'none', border: 'none', color: 'inherit', padding: 0, cursor: 'pointer', lineHeight: 1 };

const formatRange = (start, end) => {
    const opts = { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' };
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
    if (status === 400 && hasParticipants) return { participants: 'Participants must be your friends. Remove anyone who is not.' };
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

/**
 * Create/edit form for the event creator, or a read-only details view (readOnly) for invited participants.
 * onSave may return a promise; if it rejects, the error is shown in the modal and the form stays open.
 */
const EventModal = ({ show, onHide, initialData, onSave, isNewEvent, readOnly = false }) => {
    const { user } = useContext(AuthContext);

    const [formData, setFormData] = useState(initialData);
    const [tagInput, setTagInput] = useState('');
    const [friends, setFriends] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [errors, setErrors] = useState({}); // { title, time, participants, form }
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (show) {
            setFormData(initialData);
            setTagInput('');
            setSearchQuery('');
            setErrors({});

            if (user && user.id) {
                api.get(`/v1/users/${user.id}/friends`)
                    .then(res => {
                        const accepted = res.data.filter(f => f.status === 'accepted');
                        setFriends(accepted.map(f => f.userA.id === user.id ? f.userB : f.userA));
                    }).catch(err => console.error('Could not fetch friends', err));
            }
        }
    }, [show, initialData, user]);

    const friendsById = useMemo(() => new Map(friends.map(f => [String(f.id), f])), [friends]);

    // Participants may only carry an id (as loaded from the server); resolve names from the friends list
    const participantName = (p) => {
        if (user && String(p.id) === String(user.id)) return 'You';
        const friend = friendsById.get(String(p.id));
        const name = p.username || p.firstName || friend?.username || friend?.firstName;
        return name ? `@${name}` : 'Another participant';
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
            setErrors(saveErrors(err, (formData.participants || []).length > 0));
        } finally {
            setSaving(false);
        }
    };

    const filteredFriends = friends.filter(f =>
        (f.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         f.firstName?.toLowerCase().includes(searchQuery.toLowerCase())) &&
        !(formData?.participants || []).some(sf => String(sf.id) === String(f.id))
    );

    if (!formData) return null;

    if (readOnly) {
        const participants = formData.participants || [];
        return (
            <Modal show={show} onHide={onHide} contentClassName="modern-modal" centered>
                <Modal.Header closeButton>
                    <Modal.Title style={{ color: 'var(--text-main)' }}>{formData.title || 'Event'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div style={{ ...chipStyle, display: 'inline-flex', marginBottom: '20px' }}>
                        {formData.viewerRole === 'going' ? "You're going" : "You're invited"} · only the organizer can make changes
                    </div>
                    <Section label="When">{formatRange(formData.start, formData.end)}</Section>
                    <Section label="Organizer">{organizerName()}</Section>
                    {formData.location && <Section label="Location">{formatLocation(formData.location)}</Section>}
                    {formData.description && (
                        <Section label="Description"><span style={{ whiteSpace: 'pre-wrap' }}>{formData.description}</span></Section>
                    )}
                    {participants.length > 0 && (
                        <Section label="Participants">
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {participants.map(p => <div key={p.id} style={chipStyle}>{participantName(p)}</div>)}
                            </div>
                        </Section>
                    )}
                    {(formData.tags || []).length > 0 && (
                        <Section label="Tags">
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {formData.tags.map(tag => <div key={tag} style={tagChipStyle}>{tag}</div>)}
                            </div>
                        </Section>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={onHide} className="btn-modern-primary">Close</Button>
                </Modal.Footer>
            </Modal>
        );
    }

    return (
        <Modal show={show} onHide={onHide} contentClassName="modern-modal" centered>
            <Modal.Header closeButton>
                <Modal.Title style={{ color: 'var(--text-main)' }}>{isNewEvent ? 'Create New Event' : 'Edit Event'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
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
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                                {(formData.participants || []).map(p => (
                                    <div key={p.id} style={chipStyle}>
                                        {participantName(p)}
                                        <button type="button" style={removeButtonStyle} aria-label={`Remove ${participantName(p)}`} onClick={() => toggleParticipant(p)}>×</button>
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
                                <div key={tag} style={tagChipStyle}>
                                    {tag}
                                    <button type="button" style={removeButtonStyle} aria-label={`Remove tag ${tag}`} onClick={() => handleChange('tags', formData.tags.filter(t => t !== tag))}>×</button>
                                </div>
                            ))}
                        </div>
                        <Form.Control type="text" placeholder="Type tag and press Enter" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleAddTag} />
                    </Form.Group>
                </Form>

                {errors.form && <div className="field-error" role="alert" style={{ marginTop: '16px' }}>{errors.form}</div>}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}>Cancel</Button>
                <Button variant="primary" onClick={handleSaveClick} className="btn-modern-primary" disabled={saving}>
                    {saving ? 'Saving...' : isNewEvent ? 'Create Event' : 'Save Changes'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default EventModal;
