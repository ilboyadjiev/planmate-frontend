import api from '../api/client';
import { notifyInvitesChanged } from './inviteEvents';
import { getGuestId } from './guestService';
import { myResponse } from '../components/calendarStatus';

/** A new event: starts at the next full hour and lasts an hour, unless a time slot was picked. */
export const blankEvent = (start = null, end = null, extra = {}) => {
    const from = start || new Date(Math.ceil(Date.now() / 3600000) * 3600000);
    return {
        title: '', start: from, end: end || new Date(from.getTime() + 3600000), description: '',
        participants: [], groups: [], location: null, isPublic: false, tags: [], ...extra,
    };
};

/**
 * Creates an event. Logged-in users are identified by their token; guests pass their guest id.
 * eventData.participants is a list of friends ({ id, ... }); eventData.groups a list of friend groups ({ id }).
 */
export const createEvent = async (eventData, guestId = null) => {
    const eventToSave = {
        title: eventData.title,
        creatorId: guestId || undefined,
        description: eventData.description,
        startTime: new Date(eventData.start).toISOString(),
        endTime: new Date(eventData.end).toISOString(),
        participantIds: (eventData.participants || []).map(p => String(p.id)),
        // Inviting a group invites all its members; the server adds them to participantIds
        groupIds: (eventData.groups || []).map(g => String(g.id)),
        location: eventData.location,
        isPublic: eventData.isPublic,
        tags: eventData.tags,
    };

    const response = await api.post('/v2/events', eventToSave);
    return response.data;
};

/** Saves the creator's changes (EventModal form data). Errors propagate, so the form can show them. */
export const updateEvent = async (formData, guestId = null) => {
    const eventToSave = {
        id: formData.id,
        title: formData.title,
        // Only guests identify themselves this way; logged-in users are identified by their token
        creatorId: guestId || undefined,
        description: formData.description,
        startTime: new Date(formData.start).toISOString(),
        endTime: new Date(formData.end).toISOString(),
        participantIds: (formData.participants || []).map(p => String(p.id)),
        groupIds: (formData.groups || []).map(g => String(g.id)),
        location: formData.location,
        isPublic: formData.isPublic,
        tags: formData.tags,
    };
    const response = await api.put(`/v2/events/${formData.id}`, eventToSave);
    return response.data;
};

/** An invitee's answer: 'accepted', 'maybe' or 'declined'. Returns the updated event. */
export const respondToInvite = async (eventId, response) => {
    const res = await api.put(`/v2/events/${eventId}/response`, { response });
    notifyInvitesChanged(); // the navbar's badge counts the unanswered ones
    return res.data;
};

/**
 * An event from the server in the shape the calendar and EventModal use. Events the viewer created are editable
 * (isOwn); invitations and other people's public events open read-only.
 */
/**
 * Answers a public event you were not invited to: accepted (going), maybe, or declined (it leaves your calendar).
 * Returns the event's feed card.
 */
export const answerPublicEvent = async (eventId, response) => {
    const res = await api.put(`/v2/events/${eventId}/attendance`, { response });
    return res.data;
};

/** The viewerRole a public event has after that answer: going, maybe, or none. */
export const attendanceRole = (response) => ({ accepted: 'going', maybe: 'maybe' }[response] || null);

/** Your answer to a public event: what you just chose, else what the calendar knows (going or maybe). */
export const attendanceOf = (event) =>
    event.attendance || { going: 'accepted', maybe: 'maybe' }[event.viewerRole] || null;

export const toCalendarEvent = (event, user) => {
    const myOwnerId = user ? user.email : getGuestId();
    // The organizer and invitees get everyone's name from the server, also for people who are not their friends
    const profiles = new Map((event.participantProfiles || []).map(p => [String(p.id), p]));
    return {
        ...event,
        myResponse: myResponse(event, user?.id),
        start: event.startTime ? new Date(event.startTime) : null,
        end: event.endTime ? new Date(event.endTime) : null,
        isPublic: event.isPublic !== undefined ? event.isPublic : true,
        tags: event.tags || [],
        participants: (event.participantIds || []).map(id => ({ ...(profiles.get(String(id)) || {}), id })),
        groups: (event.groupIds || []).map(id => ({ id })),
        isOwn: event.viewerRole ? event.viewerRole === 'host' : event.creatorId === myOwnerId,
        allDay: false,
    };
};

/** Loads one event as the viewer may see it (full details for the creator, fewer for everyone else). */
export const fetchEvent = async (eventId, user) => {
    const res = await api.get(`/v2/events/${eventId}`, { params: user ? {} : { guestId: getGuestId() } });
    return toCalendarEvent(res.data, user);
};
