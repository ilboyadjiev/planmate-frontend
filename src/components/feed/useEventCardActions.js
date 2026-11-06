import React, { useState } from 'react';
import api from '../../api/client';
import EventModal from '../EventModal';
import { fetchEvent, updateEvent, respondToInvite, answerPublicEvent, attendanceRole } from '../../services/eventService';
import { getGuestId } from '../../services/guestService';

/** The card after the viewer answered an invitation, without waiting for a reload. */
export const withResponse = (event, response) => {
    const wasGoing = event.myResponse === 'accepted';
    const nowGoing = response === 'accepted';
    return {
        ...event,
        myResponse: response,
        going: nowGoing,
        attendeeCount: Math.max(0, (event.attendeeCount || 0) + (nowGoing ? 1 : 0) - (wasGoing ? 1 : 0)),
    };
};

/**
 * What you can do with event cards (FeedEventCard), wherever they are listed (Discover feed, search):
 * join or leave a public event, answer an invitation, and open the event in the details window. Your own
 * events open for editing, invitations with Going / Maybe / Can't go, other public events read-only.
 *
 * events / setEvents: the listed cards, kept up to date after each action.
 * reload(): called after the creator edited an event from its details window.
 * onAttendanceChange(card, response?), onRespond(card, response), onEventChanged(), onError(message): optional callbacks.
 *
 * Returns the handlers for FeedEventCard and detailsModal, to render once next to the list.
 */
const useEventCardActions = ({ user, events, setEvents, reload, onAttendanceChange, onRespond, onEventChanged, onError }) => {
    const [pendingId, setPendingId] = useState(null);
    const [openingId, setOpeningId] = useState(null);
    const [details, setDetails] = useState(null); // the opened event, in the calendar's shape
    const [showDetails, setShowDetails] = useState(false);

    const replaceCard = (card) => setEvents(prev => prev.map(e => (e.id === card.id ? card : e)));

    const toggleGoing = async (event) => {
        setPendingId(event.id);
        try {
            const url = `/v2/events/${event.id}/attendance`;
            const res = event.going ? await api.delete(url) : await api.post(url);
            replaceCard(res.data);
            if (onAttendanceChange) onAttendanceChange(res.data);
        } catch (err) {
            if (onError) onError(event.going ? 'Could not leave the event. Please try again.' : 'Could not join the event. Please try again.');
        } finally {
            setPendingId(null);
        }
    };

    const respond = async (event, response) => {
        if (event.myResponse === response) return;
        setPendingId(event.id);
        try {
            await api.put(`/v2/events/${event.id}/response`, { response });
            const updated = withResponse(event, response);
            replaceCard(updated);
            if (onRespond) onRespond(updated, response);
        } catch (err) {
            if (onError) onError('Your answer could not be saved. Please try again.');
        } finally {
            setPendingId(null);
        }
    };

    const openDetails = async (card) => {
        setOpeningId(card.id);
        try {
            setDetails(await fetchEvent(card.id, user));
            setShowDetails(true);
        } catch (err) {
            if (onError) onError('This event could not be opened. It may have been deleted.');
        } finally {
            setOpeningId(null);
        }
    };

    // The creator edited the event: errors propagate to EventModal, which keeps the form open
    const saveDetails = async (formData) => {
        await updateEvent(formData, user ? null : getGuestId());
        setShowDetails(false);
        if (reload) reload();
        if (onEventChanged) onEventChanged();
    };

    // Answering inside the details window keeps the card in step
    const respondInDetails = async (response) => {
        const card = events.find(e => e.id === details.id);
        const saved = await respondToInvite(details.id, response);
        setDetails(prev => ({ ...prev, responses: saved.responses || {}, myResponse: response }));
        const updatedCard = card ? withResponse(card, response) : null;
        if (updatedCard) replaceCard(updatedCard);
        if (onRespond) onRespond(updatedCard || { id: details.id, title: details.title }, response);
    };

    // Going, Maybe or Can't go in the details window (or exported, which answers Going): the card follows
    const attendInDetails = async (response) => {
        const card = await answerPublicEvent(details.id, response);
        replaceCard(card);
        setDetails(prev => ({ ...prev, viewerRole: attendanceRole(response), attendance: response }));
        if (onAttendanceChange) onAttendanceChange(card, response);
        return card;
    };

    const detailsModal = details ? (
        <EventModal
            show={showDetails}
            onHide={() => setShowDetails(false)}
            initialData={details}
            onSave={saveDetails}
            isNewEvent={false}
            readOnly={!details.isOwn}
            onRespond={details.viewerRole === 'invited' ? respondInDetails : undefined}
            onAttend={details.viewerRole !== 'invited' ? attendInDetails : undefined}
        />
    ) : null;

    return { pendingId, openingId, toggleGoing, respond, openDetails, detailsModal };
};

export default useEventCardActions;
