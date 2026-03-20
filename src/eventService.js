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
            description: eventData.description,
            startTime: moment(eventData.start).format('YYYY-MM-DD HH:mm:ss'),
            endTime: moment(eventData.end).format('YYYY-MM-DD HH:mm:ss'),
            participantIds: participantIdsArray
        };

        await axios.post(`${config.baseUrl}/api/v1/events`, eventToSave);
    } catch (error) {
        console.error('Error creating new event:', error);
        throw error;
    }
};