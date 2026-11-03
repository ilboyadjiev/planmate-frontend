import React, { useEffect, useState, useContext, useRef, useCallback, useMemo } from 'react';
import api from '../api/client';
import './PlanMateCalendar.css'; 
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { getGuestId } from '../services/guestService';
import { AuthContext } from '../context/AuthContext';
import EventModal from './EventModal';
import ReactMarkdown from 'react-markdown';
import CalendarToolbar from './CalendarToolbar';

const localizer = momentLocalizer(moment);
moment.updateLocale('en', { week: { dow: 1, doy: 1 } });

const PlanMateCalendar = ({ userEmail, refreshKey, onSlotSelect, onCreateEvent }) => {
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [internalRefresh, setInternalRefresh] = useState(0); 
    
    const [aiSummary, setAiSummary] = useState('');
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);
    const fetchLock = useRef(false);

    const { user } = useContext(AuthContext);

    const fetchAiSummary = useCallback(async (forceRefresh = false) => {
        if (!user || !user.id) return;
        
        if (fetchLock.current) return;
        
        const today = new Date().toISOString().split('T')[0]; 
        const cacheKey = `planmate_ai_summary_${user.username || user.email}`;

        // Check local browser cache first
        if (!forceRefresh) {
            const cachedData = localStorage.getItem(cacheKey);
            if (cachedData) {
                try {
                    const parsed = JSON.parse(cachedData);
                    if (parsed.date === today) {
                        setAiSummary(parsed.summary);
                        return; 
                    }
                } catch (e) {
                    console.error("Cache parsing error", e);
                }
            }
        }

        // Fetch fresh data
        fetchLock.current = true;
        setIsLoadingSummary(true);
        try {
            const res = await api.get('/v2/ai/summary', {
                params: { force: forceRefresh }
            });
            
            const summaryText = res.data.summary;
            setAiSummary(summaryText);
            
            localStorage.setItem(cacheKey, JSON.stringify({ date: today, summary: summaryText }));
        } catch (error) {
            setAiSummary("Unable to load summary.");
        } finally {
            setIsLoadingSummary(false);
            fetchLock.current = false;
        }
    }, [user]);

    // Trigger 1: Initial load
    useEffect(() => {
        fetchAiSummary(false);
    }, [fetchAiSummary]);

    // Trigger 2: An event was added from Dashboard or edited inside Calendar
    useEffect(() => {
        if (refreshKey > 0 || internalRefresh > 0) {
            fetchAiSummary(true);
        }
    }, [refreshKey, internalRefresh, fetchAiSummary]);


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
            {/* AI Summary Block */}
            {user ? (
                <div style={{ background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.1), rgba(168, 85, 247, 0.1))', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', gap: '12px', border: '1px solid rgba(79, 70, 229, 0.2)' }}>
                    <span style={{ fontSize: '1.5rem' }}>✨</span>
                    <div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: '600', color: '#A5B4FC' }}>Daily Briefing</h4>
                        {isLoadingSummary ? <p style={{ color: 'var(--text-main)', margin: 0 }}>Asking Gemini...</p> : <div className="ai-markdown-content"><ReactMarkdown>{aiSummary}</ReactMarkdown></div>}
                    </div>
                </div>
            ) : (
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', gap: '12px', border: '1px dashed rgba(255, 255, 255, 0.15)' }}>
                    <span style={{ fontSize: '1.5rem', opacity: 0.5, filter: 'grayscale(100%)' }}>✨</span>
                    <div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-muted)' }}>Daily Briefing</h4>
                        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>
                            Registered users get a personalized AI summary of their schedule every day. 
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
                eventPropGetter={event => ({
                    className: event.isOwn ? 'event-own' : 'event-invited',
                    style: event.isOwn
                        ? { backgroundColor: '#4F46E5', borderRadius: '6px', border: 'none', color: 'white' }
                        : { backgroundColor: 'rgba(79, 70, 229, 0.15)', borderRadius: '6px', border: '1px dashed #818cf8', color: '#c7d2fe' },
                })}
                tooltipAccessor={event => (event.isOwn ? event.title : `${event.title} (${event.viewerRole === 'going' ? 'going' : 'invited'})`)}
                onSelectEvent={handleSelectEvent}
                date={currentDate}
                onNavigate={d => { setCurrentDate(d); }}
                selectable={true}
                onSelectSlot={slotInfo => onSlotSelect && onSlotSelect(slotInfo.start, slotInfo.end)}
                scrollToTime={getScrollToTime()}
            />

            {selectedEvent && (
                <EventModal 
                    show={showModal} 
                    onHide={() => setShowModal(false)} 
                    initialData={selectedEvent} 
                    onSave={handleSaveChanges} 
                    isNewEvent={false} 
                    readOnly={!selectedEvent.isOwn}
                />
            )}
        </div>
    );
};

export default PlanMateCalendar;