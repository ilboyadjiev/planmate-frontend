import React, { useState, useContext, useEffect } from 'react';
import PlanMateCalendar from '../components/PlanMateCalendar';
import DiscoveryFeed from '../components/DiscoveryFeed';
import EventModal from '../components/EventModal';
import { Button, Toast, ToastContainer } from 'react-bootstrap';
import { createEvent } from '../services/eventService';
import { AuthContext } from '../context/AuthContext';
import { getGuestId } from '../services/guestService';

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const [showModal, setShowModal] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    
    const [showMobileCalendar, setShowMobileCalendar] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);

    const defaultEvent = {
        title: '', start: new Date(), end: new Date(), description: '', 
        participants: [], location: null, isPublic: false, tags: []
    };
    const [selectedEvent, setSelectedEvent] = useState(defaultEvent);
    const [notice, setNotice] = useState(null); // { type: 'success' | 'error', text }

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 900);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Errors propagate to EventModal, which shows them and keeps the form open
    const handleSaveNewEvent = async (formData) => {
        await createEvent(formData, user ? null : getGuestId());
        setShowModal(false);
        setRefreshKey(prev => prev + 1);
    };

    const handleAddFromFeed = async (feedEvent) => {
        try {
            await createEvent({
                title: feedEvent.title, start: feedEvent.startTime, end: feedEvent.endTime,
                description: feedEvent.description, participants: [], location: feedEvent.location,
                isPublic: false, tags: feedEvent.tags
            }, user ? null : getGuestId());
            setNotice({ type: 'success', text: `"${feedEvent.title}" was added to your calendar.` });
            setRefreshKey(prev => prev + 1);
        } catch (err) {
            setNotice({ type: 'error', text: 'Could not add the event to your calendar. Please try again.' });
        }
    };

    const handleCalendarSlotSelect = (start, end) => {
        setSelectedEvent({ ...defaultEvent, start, end });
        setShowModal(true);
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ color: 'var(--text-main)', fontWeight: '700', margin: 0 }}>Dashboard</h2>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                    <Button className="btn-modern-primary" onClick={() => { setSelectedEvent(defaultEvent); setShowModal(true); }}>
                        + New Event
                    </Button>
                    
                    {isMobile && (
                        <Button 
                            className="btn-modern-secondary mobile-calendar-toggle" 
                            onClick={() => setShowMobileCalendar(true)}
                        >
                            📅 My Calendar
                        </Button>
                    )}
                </div>
            </div>
            
            <div className="dashboard-layout">
                {/* Discovery Feed */}
                <div style={{ height: '100%', minHeight: '700px', alignSelf: 'flex-start' }}>
                    <DiscoveryFeed onAddEvent={handleAddFromFeed} />
                </div>
                
                {/* Sliding Calendar Drawer */}
                <div 
                    className={`dashboard-calendar-drawer ${showMobileCalendar ? 'open' : ''}`} 
                    style={{ alignSelf: 'flex-start' }}
                >
                    <div className="drawer-header">
                        <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: '700' }}>📅 My Calendar</h3>
                        <button className="close-drawer-btn" onClick={() => setShowMobileCalendar(false)}>✕</button>
                    </div>
                    
                    <div style={{ minWidth: 0, height: '100%' }}>
                        <PlanMateCalendar userEmail={user?.username || user?.email} refreshKey={refreshKey} onSlotSelect={handleCalendarSlotSelect} />
                    </div>
                </div>

                {/* Dark Overlay */}
                {showMobileCalendar && (
                    <div className="drawer-overlay" onClick={() => setShowMobileCalendar(false)}></div>
                )}
            </div>

            <ToastContainer position="bottom-end" className="p-3" style={{ position: 'fixed', zIndex: 2000 }}>
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