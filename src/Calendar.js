import React, { useEffect, useState } from 'react';
import axios from 'axios';
import config from './config';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import './Calendar.css'; // Import the CSS file for custom styling

const Calendar = ({ userEmail }) => {
    const [events, setEvents] = useState([]);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const response = await axios.get(`${config.baseUrl}/api/v1/events`);
                const eventsData = response.data.map(event => ({
                    title: event.title,
                    start: `${event.startdate}T${event.starttime}`,
                    end: `${event.enddate}T${event.endtime}`,
                    description: event.description,
                    participants: event.participants.map(participant => participant.email)
                }));
                setEvents(eventsData);
            } catch (error) {
                console.error('Error fetching events:', error);
            }
        };

        fetchEvents();
    }, [userEmail]);

    return (
        <div className="calendar-container">
            <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                events={events}
                eventContent={(eventInfo) => (
                    <div>
                        <b>{eventInfo.event.title}</b>
                        <p>{eventInfo.event.extendedProps.description}</p>
                    </div>
                )}
            />
        </div>
    );
};

export default Calendar;
