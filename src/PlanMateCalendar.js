import React, { useEffect, useState } from 'react';
import axios from 'axios';
import config from './config';
import './PlanMateCalendar.css'; 
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Modal, Button, Form } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const localizer = momentLocalizer(moment);

moment.updateLocale('en', {
    week: { dow: 1, doy: 1 },
});

const PlanMateCalendar = ({ userEmail }) => {
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());

    const fetchEvents = async (dateToFetch) => {
        try {
            const start = moment(dateToFetch).subtract(1, 'months').startOf('month').format('YYYY-MM-DD 00:00:00');
            const end = moment(dateToFetch).add(1, 'months').endOf('month').format('YYYY-MM-DD 23:59:59');

            const response = await axios.get(`${config.baseUrl}/api/v1/events/range`, {
                params: { start, end }
            });

            const eventsData = response.data.map(event => ({
                id: event.id,
                title: event.title,
                start: event.startTime ? new Date(event.startTime) : null,
                end: event.endTime ? new Date(event.endTime) : null,
                description: event.description || '',
                participants: event.participants || [], 
                allDay: false, 
            }));
            
            setEvents(eventsData);
        } catch (error) {
            console.error('Error fetching events by range:', error);
        }
    };

    useEffect(() => {
        fetchEvents(currentDate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userEmail]);

    const handleSelectEvent = (event) => {
        setSelectedEvent(event);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedEvent(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setSelectedEvent(prevEvent => ({ ...prevEvent, [name]: value }));
    };

    const handleDateChange = (date, field) => {
        setSelectedEvent(prevEvent => ({ ...prevEvent, [field]: date }));
    };

    const handleSaveChanges = async () => {
        try {
            const participantIdsArray = Array.isArray(selectedEvent.participants)
                ? selectedEvent.participants.map(p => typeof p === 'object' ? p.id : parseInt(p, 10)).filter(id => !isNaN(id))
                : [];

            const eventToSave = {
                id: selectedEvent.id,
                title: selectedEvent.title,
                description: selectedEvent.description,
                startTime: moment(selectedEvent.start).format('YYYY-MM-DD HH:mm:ss'),
                endTime: moment(selectedEvent.end).format('YYYY-MM-DD HH:mm:ss'),
                participantIds: participantIdsArray
            };
    
            await axios.put(`${config.baseUrl}/api/v1/events/${selectedEvent.id}`, eventToSave);
            setShowModal(false);
            fetchEvents(currentDate);
        } catch (error) {
            console.error('Error updating event:', error);
        }
    };

    const dayPropGetter = (date) => {
        const today = new Date();
        if (date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
            return { className: 'custom-today' };
        }
        return {}; 
    };

    const eventPropGetter = (event) => {
        return {
            className: 'custom-event',
            style: {
                backgroundColor: '#4F46E5', borderRadius: '6px', border: 'none', opacity: 0.9, color: 'white',
            }
        };
    };

    return (
        <div className="calendar-container">
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 700 }}
                dayPropGetter={dayPropGetter}
                eventPropGetter={eventPropGetter}
                onSelectEvent={handleSelectEvent}
                date={currentDate}
                onNavigate={(newDate) => {
                    setCurrentDate(newDate);
                    fetchEvents(newDate);
                }}
            />

            <Modal show={showModal} onHide={handleCloseModal} contentClassName="modern-modal" centered>
                <Modal.Header closeButton>
                    <Modal.Title>Event Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedEvent && (
                        <Form>
                            <Form.Group controlId="formTitle" style={{ marginBottom: '16px' }}>
                                <Form.Label style={{ fontWeight: '600' }}>Event Title</Form.Label>
                                <Form.Control type="text" name="title" value={selectedEvent.title} onChange={handleInputChange} />
                            </Form.Group>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <Form.Group controlId="formStartTime">
                                    <Form.Label style={{ fontWeight: '600' }}>Start Time</Form.Label>
                                    <DatePicker selected={new Date(selectedEvent.start)} onChange={date => handleDateChange(date, 'start')} showTimeSelect dateFormat="HH:mm dd/MM/yyyy" className="form-control" />
                                </Form.Group>
                                <Form.Group controlId="formEndTime">
                                    <Form.Label style={{ fontWeight: '600' }}>End Time</Form.Label>
                                    <DatePicker selected={new Date(selectedEvent.end)} onChange={date => handleDateChange(date, 'end')} showTimeSelect dateFormat="HH:mm dd/MM/yyyy" className="form-control" />
                                </Form.Group>
                            </div>

                            <Form.Group controlId="formDescription" style={{ marginBottom: '24px' }}>
                                <Form.Label style={{ fontWeight: '600' }}>Description</Form.Label>
                                <Form.Control as="textarea" name="description" rows={3} value={selectedEvent.description} onChange={handleInputChange} />
                            </Form.Group>

                            {/* Render participants */}
                            <Form.Group controlId="formParticipants">
                                <Form.Label style={{ fontWeight: '600', color: 'var(--primary)' }}>Participants</Form.Label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '8px 0' }}>
                                    {Array.isArray(selectedEvent.participants) && selectedEvent.participants.length > 0 ? (
                                        selectedEvent.participants.map(p => (
                                            <div key={p.id} style={{ 
                                                background: 'rgba(79, 70, 229, 0.15)', color: '#818cf8', border: '1px solid rgba(79, 70, 229, 0.3)',
                                                padding: '6px 14px', borderRadius: '16px', fontSize: '0.85rem', fontWeight: '500' 
                                            }}>
                                                @{p.username || p.firstName || 'User'}
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            No other participants
                                        </div>
                                    )}
                                </div>
                            </Form.Group>

                        </Form>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModal} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}>
                        Close
                    </Button>
                    <Button variant="primary" onClick={handleSaveChanges} className="btn-modern-primary" style={{ padding: '8px 24px' }}>
                        Save Changes
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default PlanMateCalendar;