import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import config from './config';
import PlanMateCalendar from './PlanMateCalendar';
import { Modal, Button, Form } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { createEvent } from './eventService';
import { AuthContext } from './AuthContext';

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const [showModal, setShowModal] = useState(false);
    
    const [friends, setFriends] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFriends, setSelectedFriends] = useState([]);

    const [selectedEvent, setSelectedEvent] = useState({
        title: '',
        start: new Date(),
        end: new Date(),
        description: '',
        participants: ''
    });

    useEffect(() => {
        if (user && user.id) {
            axios.get(`${config.baseUrl}/api/v1/users/${user.id}/friends`)
                .then(res => {
                    const accepted = res.data.filter(f => f.status === 'accepted');
                    const friendList = accepted.map(f => f.userA.id === user.id ? f.userB : f.userA);
                    setFriends(friendList);
                })
                .catch(err => console.error("Could not fetch friends for event invite", err));
        }
    }, [user]);

    const handleShowModal = () => setShowModal(true);
    const handleCloseModal = () => {
        setShowModal(false);
        setSearchQuery('');
        setSelectedFriends([]);
        setSelectedEvent({ title: '', start: new Date(), end: new Date(), description: '', participants: '' });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setSelectedEvent(prevEvent => ({ ...prevEvent, [name]: value }));
    };

    const handleDateChange = (date, field) => {
        setSelectedEvent(prevEvent => ({ ...prevEvent, [field]: date }));
    };

    const handleAddFriend = (friend) => {
        if (!selectedFriends.find(f => f.id === friend.id)) {
            const updated = [...selectedFriends, friend];
            setSelectedFriends(updated);
            setSelectedEvent(prev => ({ ...prev, participants: updated.map(f => f.id).join(', ') }));
        }
        setSearchQuery('');
    };

    const handleRemoveFriend = (friendId) => {
        const updated = selectedFriends.filter(f => f.id !== friendId);
        setSelectedFriends(updated);
        setSelectedEvent(prev => ({ ...prev, participants: updated.map(f => f.id).join(', ') }));
    };

    // Filter friends based on search query, EXCLUDING ones already selected
    const filteredFriends = friends.filter(f =>
        (f.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.firstName?.toLowerCase().includes(searchQuery.toLowerCase())) &&
        !selectedFriends.find(sf => sf.id === f.id)
    );

    const handleSaveNewEvent = async () => {
        try {
            if (!user) {
                alert("Still loading your profile data. Please wait a second.");
                return;
            }
            await createEvent(selectedEvent, user.email);
            setShowModal(false);
            window.location.reload(); 
        } catch (error) {
            console.error('Failed to create event:', error);
            alert("Error creating event. Check the console.");
        }
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Dashboard</h2>
                <Button variant="primary" style={{ backgroundColor: '#4F46E5', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: '600' }} onClick={handleShowModal}>
                    + New Event
                </Button>
            </div>
            
            <PlanMateCalendar userEmail={user?.username || user?.email} />

            <Modal show={showModal} onHide={handleCloseModal} contentClassName="modern-modal" centered>
                <Modal.Header closeButton>
                    <Modal.Title>Create New Event</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group controlId="formTitle" style={{ marginBottom: '16px' }}>
                            <Form.Label style={{ fontWeight: '600', color: 'var(--text-main)' }}>Event Title</Form.Label>
                            <Form.Control type="text" name="title" value={selectedEvent.title} onChange={handleInputChange} placeholder="e.g., Weekend Hike" />
                        </Form.Group>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <Form.Group controlId="formStartTime">
                                <Form.Label style={{ fontWeight: '600' }}>Start Time</Form.Label>
                                <DatePicker selected={selectedEvent.start} onChange={date => handleDateChange(date, 'start')} showTimeSelect dateFormat="HH:mm dd/MM/yyyy" className="form-control" />
                            </Form.Group>
                            <Form.Group controlId="formEndTime">
                                <Form.Label style={{ fontWeight: '600' }}>End Time</Form.Label>
                                <DatePicker selected={selectedEvent.end} onChange={date => handleDateChange(date, 'end')} showTimeSelect dateFormat="HH:mm dd/MM/yyyy" className="form-control" />
                            </Form.Group>
                        </div>

                        <Form.Group controlId="formDescription" style={{ marginBottom: '24px' }}>
                            <Form.Label style={{ fontWeight: '600' }}>Description</Form.Label>
                            <Form.Control as="textarea" name="description" rows={3} value={selectedEvent.description} onChange={handleInputChange} placeholder="Details about the event..." />
                        </Form.Group>

                        <Form.Group controlId="formParticipants" style={{ position: 'relative' }}>
                            <Form.Label style={{ fontWeight: '600', color: 'var(--primary)' }}>Invite Friends</Form.Label>
                            
                            {/* "Pills" Container for Selected Friends */}
                            {selectedFriends.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                                    {selectedFriends.map(f => (
                                        <div key={f.id} style={{ 
                                            background: 'rgba(79, 70, 229, 0.15)', color: '#818cf8', border: '1px solid rgba(79, 70, 229, 0.3)',
                                            padding: '4px 12px', borderRadius: '16px', fontSize: '0.85rem', fontWeight: '500', 
                                            display: 'flex', alignItems: 'center', gap: '8px' 
                                        }}>
                                            {f.firstName || f.username}
                                            <span style={{ cursor: 'pointer', fontSize: '1.1rem', lineHeight: '1' }} onClick={() => handleRemoveFriend(f.id)}>×</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Search Input */}
                            <Form.Control 
                                type="text" 
                                placeholder="Search by name or @username..." 
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)} 
                                autoComplete="off"
                            />

                            {/* Search Results Dropdown */}
                            {searchQuery && filteredFriends.length > 0 && (
                                <div className="friend-search-results">
                                    {filteredFriends.map(f => (
                                        <div key={f.id} className="friend-search-item" onClick={() => handleAddFriend(f)}>
                                            <span style={{ fontWeight: '600' }}>{f.firstName}</span> <span style={{ color: 'var(--text-muted)' }}>@{f.username}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {searchQuery && filteredFriends.length === 0 && (
                                <div className="friend-search-results" style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>
                                    No friends found.
                                </div>
                            )}
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModal} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSaveNewEvent} className="btn-modern-primary" style={{ padding: '8px 24px' }}>
                        Create Event
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default Dashboard;