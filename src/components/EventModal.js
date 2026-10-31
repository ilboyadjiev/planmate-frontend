import React, { useState, useEffect, useContext } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import axios from 'axios';
import config from '../config/config';
import { AuthContext } from '../context/AuthContext';
import DateTimePicker from './DateTimePicker/index';
import VisibilityToggle from './VisibilityToggle';
import LocationSearch from './LocationSearch';

const EventModal = ({ show, onHide, initialData, onSave, isNewEvent }) => {
    const { user } = useContext(AuthContext);
    
    const [formData, setFormData] = useState(initialData);
    const [tagInput, setTagInput] = useState('');
    const [friends, setFriends] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (show) {
            setFormData(initialData);
            setTagInput('');
            setSearchQuery('');
            
            if (user && user.id) {
                axios.get(`${config.baseUrl}/api/v1/users/${user.id}/friends`)
                    .then(res => {
                        const accepted = res.data.filter(f => f.status === 'accepted');
                        setFriends(accepted.map(f => f.userA.id === user.id ? f.userB : f.userA));
                    }).catch(err => console.error("Could not fetch friends", err));
            }
        }
    }, [show, initialData, user]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAddTag = (e) => {
        if (e.key === 'Enter') e.preventDefault();
        
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            let newTag = tagInput.trim().toLowerCase().replace(',', '');
            if (newTag && !(formData.tags || []).includes(newTag)) {
                if (!newTag.startsWith('#')) newTag = '#' + newTag;
                handleChange('tags', [...(formData.tags || []), newTag]);
            }
            setTagInput('');
        }
    };

    const toggleParticipant = (friend) => {
        const current = formData.participants || [];
        const isSelected = current.find(p => p.id === friend.id);
        
        if (isSelected) {
            handleChange('participants', current.filter(p => p.id !== friend.id));
        } else {
            handleChange('participants', [...current, friend]);
        }
        setSearchQuery('');
    };

    const handleSaveClick = () => {
        if (new Date(formData.start) >= new Date(formData.end)) {
            alert("The start time must be before the end time.");
            return;
        }

        let finalTags = formData.tags || [];
        if (tagInput.trim()) {
            let newTag = tagInput.trim().toLowerCase().replace(',', '');
            if (!newTag.startsWith('#')) newTag = '#' + newTag;
            if (!finalTags.includes(newTag)) finalTags = [...finalTags, newTag];
        }

        onSave({ ...formData, tags: finalTags });
    };

    const filteredFriends = friends.filter(f =>
        (f.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         f.firstName?.toLowerCase().includes(searchQuery.toLowerCase())) &&
        !(formData.participants || []).find(sf => sf.id === f.id)
    );

    if (!formData) return null;

    return (
        <Modal show={show} onHide={onHide} contentClassName="modern-modal" centered>
            <Modal.Header closeButton>
                <Modal.Title style={{ color: 'var(--text-main)' }}>{isNewEvent ? 'Create New Event' : 'Event Details'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form>
                    <Form.Group controlId="formTitle" style={{ marginBottom: '16px' }}>
                        <Form.Label style={{ fontWeight: '600', color: 'var(--text-main)' }}>Event Title</Form.Label>
                        <Form.Control type="text" value={formData.title} onChange={e => handleChange('title', e.target.value)} placeholder="e.g., Weekend Hike" />
                    </Form.Group>

                    <Form.Group controlId="formIsPublic" style={{ marginBottom: '24px' }}>
                        <Form.Label style={{ fontWeight: '600', display: 'block', color: 'var(--text-main)' }}>Event Visibility</Form.Label>
                        <VisibilityToggle 
                            isPublic={formData.isPublic} 
                            onChange={(val) => handleChange('isPublic', val)} 
                        />
                    </Form.Group>

                    <DateTimePicker 
                        start={formData.start} 
                        end={formData.end} 
                        onChange={(newStart, newEnd) => {
                            handleChange('start', newStart);
                            handleChange('end', newEnd);
                        }} 
                    />

                    <Form.Group controlId="formDescription" style={{ marginBottom: '24px' }}>
                        <Form.Label style={{ fontWeight: '600', color: 'var(--text-main)' }}>Description</Form.Label>
                        <Form.Control as="textarea" rows={3} value={formData.description} onChange={e => handleChange('description', e.target.value)} />
                    </Form.Group>

                    <Form.Group controlId="formLocation" style={{ marginBottom: '16px' }}>
                        <Form.Label style={{ fontWeight: '600', color: 'var(--text-main)' }}>Location</Form.Label>
                        <LocationSearch 
                            initialQuery={initialData.location?.name} 
                            onSelectLocation={(loc) => handleChange('location', loc)} 
                        />
                    </Form.Group>

                    <Form.Group controlId="formParticipants" style={{ position: 'relative', marginBottom: '16px' }}>
                        <Form.Label style={{ fontWeight: '600', color: 'var(--text-main)' }}>Participants</Form.Label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                            {(formData.participants || []).map(p => (
                                <div key={p.id} style={{ background: 'rgba(79, 70, 229, 0.2)', color: '#a5b4fc', padding: '4px 12px', borderRadius: '16px', fontSize: '0.85rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(79, 70, 229, 0.3)' }}>
                                    @{p.username || p.firstName} <span style={{ cursor: 'pointer' }} onClick={() => toggleParticipant(p)}>×</span>
                                </div>
                            ))}
                        </div>
                        <Form.Control type="text" placeholder="Search friends..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoComplete="off" />
                        {searchQuery && (
                            <div className="friend-search-results">
                                {filteredFriends.map(f => (
                                    <div key={f.id} className="friend-search-item" onClick={() => toggleParticipant(f)}>
                                        <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{f.firstName}</span> <span style={{ color: 'var(--text-muted)' }}>@{f.username}</span>
                                    </div>
                                ))}
                                {filteredFriends.length === 0 && <div style={{ padding: '10px', color: 'var(--text-muted)' }}>No friends found.</div>}
                            </div>
                        )}
                    </Form.Group>

                    <Form.Group controlId="formTags">
                        <Form.Label style={{ fontWeight: '600', color: 'var(--text-main)' }}>Tags</Form.Label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                            {(formData.tags || []).map((tag, idx) => (
                                <div key={idx} style={{ background: 'rgba(240, 106, 37, 0.15)', color: 'var(--primary)', padding: '4px 12px', borderRadius: '16px', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(240, 106, 37, 0.3)' }}>
                                    {tag} <span style={{ cursor: 'pointer' }} onClick={() => handleChange('tags', formData.tags.filter(t => t !== tag))}>×</span>
                                </div>
                            ))}
                        </div>
                        <Form.Control type="text" placeholder="Type tag and press Enter" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleAddTag} />
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}>Cancel</Button>
                <Button variant="primary" onClick={handleSaveClick} className="btn-modern-primary">Save Changes</Button>
            </Modal.Footer>
        </Modal>
    );
};

export default EventModal;