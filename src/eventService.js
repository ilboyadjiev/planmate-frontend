// eventService.js
import axios from 'axios';
import config from './config';
import moment from 'moment';

export const createEvent = async (eventData, userEmail) => {
    try {
        const eventToSave = {
            ...eventData,
            startTime: moment(eventData.start).format('yyyy-MM-DD HH:mm:ss'),
            endTime: moment(eventData.end).format('yyyy-MM-DD HH:mm:ss'),
        };

        // Remove the original start and end fields
        delete eventToSave.start;
        delete eventToSave.end;

        await axios.post(`${config.baseUrl}/api/v1/events`, eventToSave);
    } catch (error) {
        throw new Error('Error creating new event:', error);
    }
};
