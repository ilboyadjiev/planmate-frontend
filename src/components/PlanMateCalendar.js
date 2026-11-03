import React, { useEffect, useState, useContext, useMemo } from 'react';
import api from '../api/client';
import './PlanMateCalendar.css'; 
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { getGuestId } from '../services/guestService';
import { AuthContext } from '../context/AuthContext';
import EventModal from './EventModal';
import GamePlan from './GamePlan';
import CalendarToolbar from './CalendarToolbar';
import { myResponse, eventStatus, statusLabel, STATUS_STYLES, STATUS_LEGEND } from './calendarStatus';

const localizer = momentLocalizer(moment);
moment.updateLocale('en', { week: { dow: 1, doy: 1 } });

const PlanMateCalendar = ({ userEmail, refreshKey, onSlotSelect, onCreateEvent }) => {
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [internalRefresh, setInternalRefresh] = useState(0); 
    
    const { user } = useContext(AuthContext);

    // Fetch Events
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const start = moment(currentDate).subtract(1, 'months').startOf('month').toISOString();
                const end = moment(currentDate).add(1, 'months').endOf('month').toISOString();

                const response = await api.get('/v2/events/range', {
                    // Logged-in users are identified by their token; guests by their guest id
                    params: user ? { start, end } : { creatorId: getGuestId(), start, end }
                });

                // Events I created are editable; events I was invited to or joined from the feed are read-only
                const myOwnerId = user ? user.email : getGuestId();
                setEvents(response.data.map(event => ({
                    ...event,
                    myResponse: myResponse(event, user?.id),
                    start: event.startTime ? new Date(event.startTime) : null,
                    end: event.endTime ? new Date(event.endTime) : null,
                    isPublic: event.isPublic !== undefined ? event.isPublic : true,
                    tags: event.tags || [],
                    // The server stores participant user ids; EventModal resolves the names
                    participants: (event.participantIds || []).map(id => ({ id })),
                    isOwn: event.viewerRole ? event.viewerRole === 'host' : event.creatorId === myOwnerId,
                    allDay: false,
                })));
            } catch (error) { console.error('Error fetching events:', error); }
        };

        fetchEvents();
    }, [currentDate, userEmail, refreshKey, user, internalRefresh]);

    const handleSelectEvent = (event) => {
        setSelectedEvent(event);
        setShowModal(true);
    };

    // Errors propagate to EventModal, which shows them and keeps the form open
    const handleSaveChanges = async (formData) => {
        const eventToSave = {
            id: formData.id,
            title: formData.title,
            // Only guests identify themselves this way; logged-in users are identified by their token
            creatorId: user ? undefined : getGuestId(),
            description: formData.description,
            startTime: new Date(formData.start).toISOString(),
            endTime: new Date(formData.end).toISOString(),
            participantIds: (formData.participants || []).map(p => String(p.id)),
            location: formData.location,
            isPublic: formData.isPublic,
            tags: formData.tags,
        };

        await api.put(`/v2/events/${formData.id}`, eventToSave);
        setShowModal(false);
        setInternalRefresh(prev => prev + 1);
    };

    // An invitee answers; the modal stays open showing the new answer, and the calendar recolours the event
    const handleRespond = async (event, response) => {
        const res = await api.put(`/v2/events/${event.id}/response`, { response });
        const updated = { ...event, responses: res.data.responses || {}, myResponse: response };
        setSelectedEvent(updated);
        setEvents(prev => prev.map(e => (e.id === event.id ? updated : e)));
        // Recolours the event; the AI Game plan notices the change and offers an update
        setInternalRefresh(prev => prev + 1);
    };

    const getScrollToTime = () => {
        const todayEvents = events.filter(e => 
            e.start && 
            e.start.getFullYear() === currentDate.getFullYear() &&
            e.start.getMonth() === currentDate.getMonth() &&
            e.start.getDate() === currentDate.getDate()
        );

        if (todayEvents.length > 0) {
            const earliestEvent = todayEvents.reduce((earliest, current) => 
                (current.start < earliest.start ? current : earliest)
            );
            
            const scrollTime = new Date(earliestEvent.start);
            scrollTime.setHours(Math.max(0, scrollTime.getHours() - 1)); 
            return scrollTime;
        }

        const defaultTime = new Date(currentDate);
        defaultTime.setHours(8, 0, 0, 0);
        return defaultTime;
    };

    // The toolbar carries the "New event" button; memoised so the calendar does not remount it on every render
    const toolbarComponents = useMemo(() => ({
        toolbar: (toolbarProps) => <CalendarToolbar {...toolbarProps} onCreateEvent={onCreateEvent} />,
    }), [onCreateEvent]);

    return (
        <div className="calendar-container">
            {/* AI Game plan: generated only on request */}
            {user ? (
                <GamePlan user={user} calendarVersion={`${refreshKey}-${internalRefresh}`} />
            ) : (
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', gap: '12px', border: '1px dashed rgba(255, 255, 255, 0.15)' }}>
                    <span style={{ fontSize: '1.5rem', opacity: 0.5, filter: 'grayscale(100%)' }}>✨</span>
                    <div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-muted)' }}>AI Game plan</h4>
                        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>
                            Registered users get an AI game plan for their next 48 hours. 
                            <a href="/register" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '600', marginLeft: '6px' }}>
                                Create a free account
                            </a> to unlock.
                        </p>
                    </div>
                </div>
            )}

            <Calendar
                localizer={localizer}
                events={events}
                components={toolbarComponents}
                startAccessor="start" 
                endAccessor="end"
                style={{ height: 700 }}
                dayPropGetter={d => (d.toDateString() === new Date().toDateString() ? { className: 'custom-today' } : {})}
                eventPropGetter={event => {
                    const status = eventStatus(event);
                    return { className: `event-status-${status}`, style: STATUS_STYLES[status] };
                }}
                tooltipAccessor={event => (event.isOwn ? event.title : `${event.title} (${statusLabel(eventStatus(event))})`)}
                onSelectEvent={handleSelectEvent}
                date={currentDate}
                onNavigate={d => { setCurrentDate(d); }}
                selectable={true}
                onSelectSlot={slotInfo => onSlotSelect && onSlotSelect(slotInfo.start, slotInfo.end)}
                scrollToTime={getScrollToTime()}
            />

            {user && (
                <ul className="calendar-legend" aria-label="Event colours">
                    {STATUS_LEGEND.map(({ status, label }) => (
                        <li key={status}>
                            <span className={`calendar-legend-swatch event-status-${status}`} style={STATUS_STYLES[status]} aria-hidden="true" />
                            {label}
                        </li>
                    ))}
                </ul>
            )}

            {selectedEvent && (
                <EventModal 
                    show={showModal} 
                    onHide={() => setShowModal(false)} 
                    initialData={selectedEvent} 
                    onSave={handleSaveChanges} 
                    isNewEvent={false} 
                    readOnly={!selectedEvent.isOwn}
                    onRespond={selectedEvent.viewerRole === 'invited' ? (response) => handleRespond(selectedEvent, response) : undefined}
                />
            )}
        </div>
    );
};

export default PlanMateCalendar;