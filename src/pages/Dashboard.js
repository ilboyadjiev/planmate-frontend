import React, { useState, useContext, useCallback } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import PlanMateCalendar from '../components/PlanMateCalendar';
import DiscoveryFeed from '../components/DiscoveryFeed';
import EventModal from '../components/EventModal';
import NoticeToast, { attendanceNotice, responseNotice } from '../components/NoticeToast';
import { createEvent, blankEvent } from '../services/eventService';
import { AuthContext } from '../context/AuthContext';
import { getGuestId } from '../services/guestService';
import useIsMobile from '../hooks/useIsMobile';
import { usePreferences } from '../services/preferences';

const PlusIcon = () => (
    <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M12 5v14M5 12h14" />
    </svg>
);

/**
 * Discover feed and calendar.
 * - Large screens: side by side, on both /dashboard and /calendar.
 * - Phones: one page per tab of the bottom bar: /dashboard shows Discover, /calendar the calendar (day view).
 *   A floating "+" button creates an event on both.
 */
const Dashboard = ({ view = 'discover' }) => {
    const { user } = useContext(AuthContext);
    const [showModal, setShowModal] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [selectedEvent, setSelectedEvent] = useState(() => blankEvent());
    const [notice, setNotice] = useState(null); // { type: 'success' | 'error', text }

    const isMobile = useIsMobile();
    const { calendarView } = usePreferences();
    const [searchParams] = useSearchParams();

    const openNewEvent = useCallback((start, end) => {
        setSelectedEvent(blankEvent(start, end));
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
    const handleAttendanceChange = (event, response) => {
        setNotice(attendanceNotice(event, response));
        setRefreshKey(prev => prev + 1);
    };

    // An invitation answered in the feed: the calendar recolours the event
    const handleFeedResponse = (event, response) => {
        setNotice(responseNotice(event, response));
        setRefreshKey(prev => prev + 1);
    };

    // Old links to the slide-in calendar (/dashboard?calendar=open) now go to the calendar page
    if (isMobile && view === 'discover' && searchParams.get('calendar') === 'open') {
        return <Navigate to="/calendar" replace />;
    }
    // On large screens the calendar is always next to the feed
    if (!isMobile && view === 'calendar') {
        return <Navigate to="/dashboard" replace />;
    }

    const showFeed = !isMobile || view === 'discover';
    const showCalendar = !isMobile || view === 'calendar';

    return (
        <div className="dashboard-page">
            <h1 className={isMobile && view === 'calendar' ? 'dashboard-page-title' : 'visually-hidden'}>
                {isMobile && view === 'calendar' ? 'My Calendar' : 'Dashboard'}
            </h1>

            <div className={isMobile ? 'dashboard-single' : 'dashboard-layout'}>
                {showFeed && (
                    <div className="dashboard-feed">
                        <DiscoveryFeed onAttendanceChange={handleAttendanceChange} onRespond={handleFeedResponse}
                            onEventChanged={() => setRefreshKey(prev => prev + 1)}
                            onError={text => setNotice({ type: 'error', text })} />
                    </div>
                )}

                {showCalendar && (
                    <div className="dashboard-calendar">
                        <PlanMateCalendar userEmail={user?.username || user?.email} refreshKey={refreshKey}
                            onSlotSelect={openNewEvent} onCreateEvent={openBlankEvent}
                            defaultView={calendarView === 'auto' ? (isMobile ? 'day' : 'month') : calendarView} />
                    </div>
                )}
            </div>

            {isMobile && (
                <button type="button" className="new-event-fab" onClick={openBlankEvent} aria-label="New event">
                    <PlusIcon />
                </button>
            )}

            <NoticeToast notice={notice} onClose={() => setNotice(null)} />

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
