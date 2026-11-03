import React, { useState, useContext, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import PlanMateCalendar from '../components/PlanMateCalendar';
import DiscoveryFeed from '../components/DiscoveryFeed';
import EventModal from '../components/EventModal';
import { Toast, ToastContainer } from 'react-bootstrap';
import { createEvent } from '../services/eventService';
import { AuthContext } from '../context/AuthContext';
import { getGuestId } from '../services/guestService';

const MOBILE_QUERY = '(max-width: 900px)';

/** A new event starts at the next full hour and lasts an hour. */
const newEventAt = (start = null, end = null) => {
    const from = start || new Date(Math.ceil(Date.now() / 3600000) * 3600000);
    return {
        title: '', start: from, end: end || new Date(from.getTime() + 3600000), description: '',
        participants: [], groups: [], location: null, isPublic: false, tags: [],
    };
};

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
    useEffect(() => {
        const media = window.matchMedia(MOBILE_QUERY);
        const onChange = () => setIsMobile(media.matches);
        // Safari before 14 only has the older addListener API
        if (media.addEventListener) media.addEventListener('change', onChange); else media.addListener(onChange);
        return () => (media.removeEventListener ? media.removeEventListener('change', onChange) : media.removeListener(onChange));
    }, []);
    return isMobile;
};

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const [showModal, setShowModal] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [selectedEvent, setSelectedEvent] = useState(newEventAt);
    const [notice, setNotice] = useState(null); // { type: 'success' | 'error', text }

    // On small screens the calendar is a slide-in drawer, opened from the navbar's Calendar tab via ?calendar=open
    const isMobile = useIsMobile();
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const showMobileCalendar = isMobile && searchParams.get('calendar') === 'open';

    const closeCalendar = useCallback(() => {
        // Opened from the tab bar: go back, so the back gesture and the close button behave the same.
        // Opened from a link or a reload: just drop the parameter.
        if (location.state?.calendarDrawer) navigate(-1);
        else setSearchParams({}, { replace: true });
    }, [location.state, navigate, setSearchParams]);

    useEffect(() => {
        if (!showMobileCalendar) return undefined;
        // Escape inside an open modal closes the modal only
        const onKey = (e) => { if (e.key === 'Escape' && !document.querySelector('.modal.show')) closeCalendar(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [showMobileCalendar, closeCalendar]);

    const openNewEvent = useCallback((start, end) => {
        setSelectedEvent(newEventAt(start, end));
        setShowModal(true);
    }, []);
    const openBlankEvent = useCallback(() => openNewEvent(), [openNewEvent]);

    // Errors propagate to EventModal, which shows them and keeps the form open
    const handleSaveNewEvent = async (formData) => {
        await createEvent(formData, user ? null : getGuestId());
        setShowModal(false);
        setRefreshKey(prev => prev + 1);
    };

    // Joined events show in the calendar read-only, so refresh it after joining or leaving
    const handleAttendanceChange = (event) => {
        setNotice({
            type: 'success',
            text: event.going ? `You're going to "${event.title}". It's in your calendar now.` : `You left "${event.title}".`,
        });
        setRefreshKey(prev => prev + 1);
    };

    // An invitation answered in the feed: the calendar recolours the event
    const handleFeedResponse = (event, response) => {
        const text = {
            accepted: `You're going to "${event.title}".`,
            maybe: `You answered maybe to "${event.title}".`,
            declined: `You can't make "${event.title}". The organizer will see your answer.`,
        }[response];
        setNotice({ type: 'success', text });
        setRefreshKey(prev => prev + 1);
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
            <h1 className="visually-hidden">Dashboard</h1>

            <div className="dashboard-layout">
                <div style={{ height: '100%', minHeight: '700px', alignSelf: 'flex-start' }}>
                    <DiscoveryFeed onAttendanceChange={handleAttendanceChange} onRespond={handleFeedResponse}
                        onEventChanged={() => setRefreshKey(prev => prev + 1)}
                        onError={text => setNotice({ type: 'error', text })} />
                </div>

                <div
                    className={`dashboard-calendar-drawer ${showMobileCalendar ? 'open' : ''}`}
                    style={{ alignSelf: 'flex-start' }}
                    {...(isMobile ? { role: 'dialog', 'aria-modal': showMobileCalendar, 'aria-label': 'My calendar', 'aria-hidden': !showMobileCalendar } : {})}
                >
                    <div className="drawer-header">
                        <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: '700' }}>My Calendar</h2>
                        <button type="button" className="close-drawer-btn" onClick={closeCalendar} aria-label="Close calendar">✕</button>
                    </div>

                    <div style={{ minWidth: 0, height: '100%' }}>
                        <PlanMateCalendar userEmail={user?.username || user?.email} refreshKey={refreshKey}
                            onSlotSelect={openNewEvent} onCreateEvent={openBlankEvent} />
                    </div>
                </div>

                {showMobileCalendar && <div className="drawer-overlay" onClick={closeCalendar} aria-hidden="true"></div>}
            </div>

            <ToastContainer position="bottom-end" className="p-3 dashboard-toasts" style={{ position: 'fixed', zIndex: 2000 }}>
                <Toast
                    show={!!notice}
                    onClose={() => setNotice(null)}
                    delay={4000}
                    autohide
                    bg={notice?.type === 'error' ? 'danger' : 'success'}
                >
                    <Toast.Body style={{ color: 'white' }} role={notice?.type === 'error' ? 'alert' : 'status'}>
                        {notice?.text}
                    </Toast.Body>
                </Toast>
            </ToastContainer>

            <EventModal
                show={showModal}
                onHide={() => setShowModal(false)}
                initialData={selectedEvent}
                onSave={handleSaveNewEvent}
                isNewEvent={true}
            />
        </div>
    );
};

export default Dashboard;
