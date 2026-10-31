import moment from 'moment';

const LOCAL_STORAGE_KEY = 'planmate_offline_events';

export const getLocalEvents = () => {
    const eventsJson = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!eventsJson) return [];
    
    const rawEvents = JSON.parse(eventsJson);
    return rawEvents.map(event => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end)
    }));
};

export const createLocalEvent = (eventData) => {
    const currentEvents = getLocalEvents();
    
    const newEvent = {
        id: `local_${Date.now()}`,
        title: eventData.title,
        description: eventData.description,
        start: eventData.start,
        end: eventData.end,
        participants: []
    };

    currentEvents.push(newEvent);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(currentEvents));
};

export const updateLocalEvent = (updatedEvent) => {
    const currentEvents = getLocalEvents();
    
    const eventIndex = currentEvents.findIndex(e => e.id === updatedEvent.id);
    if (eventIndex !== -1) {
        currentEvents[eventIndex] = {
            ...updatedEvent,
            start: new Date(updatedEvent.start),
            end: new Date(updatedEvent.end)
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(currentEvents));
    }
};

export const deleteLocalEvent = (eventId) => {
    const currentEvents = getLocalEvents();
    const filteredEvents = currentEvents.filter(e => e.id !== eventId);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filteredEvents));
};