import React, { useCallback, useState } from 'react';
import { Modal } from 'react-bootstrap';
import api from '../../api/client';
import EventModal from '../EventModal';
import PlanTogether from './PlanTogether';
import { blankEvent, createEvent } from '../../services/eventService';

/**
 * Planning something with a friend, in two steps:
 * 1. pick a time when you are both free (PlanTogether),
 * 2. the usual new-event form, with the friend invited and the time filled in. You are the organizer.
 *    If you change the time there, the form tells you whether you are both still free.
 *
 * onClose() when cancelled from step 1; onPlanned(event) after the event was created.
 */
const PlanWithFriend = ({ person, show, onClose, onPlanned }) => {
    const [draft, setDraft] = useState(null); // the event being filled in (step 2)
    const name = person?.firstName || person?.username;

    const openForm = (start, end) => setDraft(blankEvent(start, end, {
        participants: [{ id: person.id, firstName: person.firstName, lastName: person.lastName, username: person.username }],
    }));

    const pickOwnTime = (minutes) => {
        const draftEvent = blankEvent();
        setDraft({ ...draftEvent, end: new Date(draftEvent.start.getTime() + minutes * 60000),
            participants: [{ id: person.id, firstName: person.firstName, lastName: person.lastName, username: person.username }] });
    };

    const checkAvailability = useCallback(async (start, end) => {
        const res = await api.get(`/v1/people/${person.id}/availability`, {
            params: { start: new Date(start).toISOString(), end: new Date(end).toISOString() },
        });
        return res.data;
    }, [person]);

    const save = async (formData) => {
        const created = await createEvent(formData); // errors propagate to the form
        setDraft(null);
        if (onPlanned) onPlanned(created || formData);
    };

    if (!person) return null;

    return (
        <>
            <Modal show={show && !draft} onHide={onClose} contentClassName="modern-modal" centered size="lg"
                aria-label={`Plan something with ${name}`}>
                <Modal.Header closeButton closeLabel="Close" />
                <Modal.Body>
                    <PlanTogether person={person} onPick={({ start, end }) => openForm(start, end)} onPickOwnTime={pickOwnTime} />
                </Modal.Body>
            </Modal>
            {draft && (
                <EventModal show={show} isNewEvent initialData={draft} onSave={save}
                    onHide={() => setDraft(null)} // back to the free times
                    availabilityCheck={checkAvailability} availabilityName={name} />
            )}
        </>
    );
};

export default PlanWithFriend;
