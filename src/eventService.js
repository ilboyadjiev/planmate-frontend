import axios from 'axios';
import config from './config';
import moment from 'moment';

export const createEvent = async (eventData, userEmail) => {
    try {
        const participantIdsArray = eventData.participants
            ? eventData.participants.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id))
            : [];

        const eventToSave = {
            title: eventData.title,
            creatorId: userEmail,
            description: eventData.description,
            startTime: new Date(eventData.start).toISOString(),
            endTime: new Date(eventData.end).toISOString(),
            participantIds: participantIdsArray,
            location: eventData.location
        };

        await axios.post(`${config.baseUrl}/api/v2/events`, eventToSave);
    } catch (error) {
        console.error('Error creating new event:', error);
        throw error;
    }
};