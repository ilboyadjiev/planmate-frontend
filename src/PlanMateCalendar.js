import React, { useEffect, useState } from 'react';
import axios from 'axios';
import config from './config';
import './PlanMateCalendar.css'; // Import the CSS file for custom styling
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Modal, Button, Form } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const localizer = momentLocalizer(moment);

// Set the first day of the week to Monday
moment.updateLocale('en', {
    week: {
        dow: 1, // Monday is the first day of the week
        doy: 1,
    },
});

const PlanMateCalendar = ({ userEmail }) => {
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const fetchEvents = async () => {
        try {
            const response = await axios.get(`${config.baseUrl}/api/v1/events`);
            const eventsData = response.data.map(event => ({
                id: event.id,
                title: event.title,
                start: event.startTime ? new Date(event.startTime) : null,
                end: event.endTime ? new Date(event.endTime) : null,
                description: event.description,
                participants: event.participants,
                allDay: false, // assuming events are not all day
            }));
            setEvents(eventsData);
        } catch (error) {
            console.error('Error fetching events:', error);
        }
    };

    useEffect(() => {
        fetchEvents();
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
        setSelectedEvent(prevEvent => ({
            ...prevEvent,
            [name]: value
        }));
    };

    const handleDateChange = (date, field) => {
        setSelectedEvent(prevEvent => ({
            ...prevEvent,
            [field]: date
        }));
    };

    const handleSaveChanges = async () => {
        try {
            const eventToSave = {
                ...selectedEvent,
                startTime: moment(selectedEvent.start).format('yyyy-MM-DD HH:mm:ss'),
                endTime: moment(selectedEvent.end).format('yyyy-MM-DD HH:mm:ss'),
            };
    
            // Remove the original start and end fields
            delete eventToSave.start;
            delete eventToSave.end;
    
            await axios.put(`${config.baseUrl}/api/v1/events/${selectedEvent.id}`, eventToSave);
            setShowModal(false);
            // Optionally, you can refetch the events or update the state with the edited event
            //const updatedEvents = events.map(event => event.id === selectedEvent.id ? selectedEvent : event);
            //setEvents(updatedEvents);
            fetchEvents();
        } catch (error) {
            console.error('Error updating event:', error);
        }
    };

    // const formatDate = (date) => {
    //     return moment(date).format('HH:mm DD.MMM');
    // };

    // Function to add custom properties to each day cell
    const dayPropGetter = (date) => {
        const today = new Date();
        const day = date.getDay();
        if (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        ) {
            return {
                className: 'highlight-today',
            };
        } else if (day === 0 || day === 6) { // Sunday = 0, Saturday = 6
            return {
                className: 'highlight-weekend',
            };
        } else {
            return {
                className: 'highlight-weekday',
            };
        }
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
                onSelectEvent={handleSelectEvent}
            />

            <Modal show={showModal} onHide={handleCloseModal}>
                <Modal.Header closeButton>
                    <Modal.Title>Edit Event Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedEvent && (
                        <Form>
                            <Form.Group controlId="formTitle">
                                <Form.Label>Title</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="title"
                                    value={selectedEvent.title}
                                    onChange={handleInputChange}
                                />
                            </Form.Group>
                            <Form.Group controlId="formStartTime">
                                <Form.Label>Start Time</Form.Label>
                                <DatePicker
                                    selected={new Date(selectedEvent.start)}
                                    onChange={date => handleDateChange(date, 'start')}
                                    showTimeSelect
                                    dateFormat="HH:mm dd/MM/yyyy"
                                    className="form-control"
                                />
                            </Form.Group>
                            <Form.Group controlId="formEndTime">
                                <Form.Label>End Time</Form.Label>
                                <DatePicker
                                    selected={new Date(selectedEvent.end)}
                                    onChange={date => handleDateChange(date, 'end')}
                                    showTimeSelect
                                    dateFormat="HH:mm dd/MM/yyyy"
                                    className="form-control"
                                />
                            </Form.Group>
                            <Form.Group controlId="formDescription">
                                <Form.Label>Description</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    name="description"
                                    rows={3}
                                    value={selectedEvent.description}
                                    onChange={handleInputChange}
                                />
                            </Form.Group>
                            <Form.Group controlId="formParticipants">
                                <Form.Label>Participants</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="participants"
                                    value={selectedEvent.participants}
                                    onChange={handleInputChange}
                                />
                            </Form.Group>
                        </Form>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModal}>
                        Close
                    </Button>
                    <Button variant="primary" onClick={handleSaveChanges}>
                        Save Changes
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default PlanMateCalendar;
