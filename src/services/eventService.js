import api from '../api/client';

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
