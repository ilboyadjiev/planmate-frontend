import React, { useState, useContext } from 'react';
import PlanMateCalendar from './PlanMateCalendar';
import PlanMateDatePicker from './PlanMateDatePicker';
import PlanMateDateFns from './PlanMateDateFns';
import { Modal, Button, Form } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { createEvent } from './eventService';
import { AuthContext } from './AuthContext';

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const [showModal, setShowModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState({
        title: '',
        start: new Date(),
        end: new Date(),
        description: '',
        participants: ''
    });

    const handleShowModal = () => setShowModal(true);
    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedEvent({
            title: '',
            start: new Date(),
            end: new Date(),
            description: '',
            participants: ''
        });
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

    const handleSaveNewEvent = async () => {
        try {
            await createEvent(selectedEvent, user.email);
            setShowModal(false);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div>
            <h2 style={{ textAlign: 'center' }}>Dashboard</h2>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <Button variant="primary" onClick={handleShowModal}>
                    New Event
                </Button>
            </div>
            <PlanMateCalendar userEmail={user?.email} />
            <br/>
            <br/>
            <PlanMateDatePicker />
            <PlanMateDateFns />

            <Modal show={showModal} onHide={handleCloseModal}>
                <Modal.Header closeButton>
                    <Modal.Title>New Event</Modal.Title>
                </Modal.Header>
                <Modal.Body>
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
                                selected={selectedEvent.start}
                                onChange={date => handleDateChange(date, 'start')}
                                showTimeSelect
                                dateFormat="HH:mm dd/MM/yyyy"
                                className="form-control"
                            />
                        </Form.Group>
                        <Form.Group controlId="formEndTime">
                            <Form.Label>End Time</Form.Label>
                            <DatePicker
                                selected={selectedEvent.end}
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
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModal}>
                        Close
                    </Button>
                    <Button variant="primary" type="submit" onClick={handleSaveNewEvent}>
                        Create
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default Dashboard;
