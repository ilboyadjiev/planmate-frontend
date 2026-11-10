import React, { useEffect, useState, useContext } from 'react';
import api from '../api/client';
import './PlanMateCalendar.css';
import moment from 'moment';
import { getGuestId } from '../services/guestService';
import { AuthContext } from '../context/AuthContext';
import EventModal from './EventModal';
import GamePlan from './GamePlan';
import GlassCalendar from './calendar/GlassCalendar';
import InvitationsPanel from './calendar/InvitationsPanel';
import useIsMobile from '../hooks/useIsMobile';
import { usePreferences } from '../services/preferences';
import { toCalendarEvent, updateEvent, respondToInvite, answerPublicEvent, attendanceRole } from '../services/eventService';
import { STATUS_STYLES, STATUS_LEGEND } from './calendarStatus';

moment.updateLocale('en', { week: { dow: 1, doy: 1 } });

/**
 * The calendar with its data: loads the events around the visible period, opens them in the details window,
 * and shows the AI Game plan above and the colour legend below. The look is GlassCalendar.
 */

const PlanMateCalendar = ({ userEmail, refreshKey, onSlotSelect, onCreateEvent, defaultView = 'month', showInvitations = false }) => {
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [internalRefresh, setInternalRefresh] = useState(0);
    const { aiGamePlan } = usePreferences(); 
    
    const { user } = useContext(AuthContext);
    const isMobile = useIsMobile();

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
                setEvents(response.data.map(event => toCalendarEvent(event, user)));
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
        await updateEvent(formData, user ? null : getGuestId());
        setShowModal(false);
        setInternalRefresh(prev => prev + 1);
    };

    // An invitee answers; the modal stays open showing the new answer, and the calendar recolours the event
    const handleRespond = async (event, response) => {
        const saved = await respondToInvite(event.id, response);
        const updated = { ...event, responses: saved.responses || {}, myResponse: response };
        setSelectedEvent(updated);
        setEvents(prev => prev.map(e => (e.id === event.id ? updated : e)));
        // Recolours the event; the AI Game plan notices the change and offers an update
        setInternalRefresh(prev => prev + 1);
    };

    // Public events you joined (from the feed): Going, Maybe or Can't go. Can't go takes it out of the calendar behind.
    const handleAttendance = async (event, response) => {
        await answerPublicEvent(event.id, response);
        setSelectedEvent({ ...event, viewerRole: attendanceRole(response), attendance: response });
        setInternalRefresh(prev => prev + 1);
    };

    const attends = selectedEvent && user && !selectedEvent.isOwn && selectedEvent.viewerRole !== 'invited';

    return (
        <div className="calendar-container">
            {showInvitations && (
                <InvitationsPanel user={user} reloadKey={`${refreshKey}-${internalRefresh}`}
                    onOpen={handleSelectEvent} onChanged={() => setInternalRefresh(prev => prev + 1)} />
            )}

            {/* AI Game plan: generated only on request, and not at all when turned off in Settings */}
            {user ? (
                aiGamePlan && <GamePlan user={user} calendarVersion={`${refreshKey}-${internalRefresh}`} />
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

            <GlassCalendar
                events={events}
                date={currentDate}
                onNavigate={setCurrentDate}
                defaultView={defaultView}
                compact={isMobile}
                onSelectEvent={handleSelectEvent}
                onSelectSlot={onSlotSelect}
                onCreateEvent={onCreateEvent}
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
                    onAttend={attends ? (response) => handleAttendance(selectedEvent, response) : undefined}
                />
            )}
        </div>
    );
};

export default PlanMateCalendar;