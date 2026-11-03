import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import api from '../api/client';
import { AuthContext } from '../context/AuthContext';
import FeedEventCard from './feed/FeedEventCard';
import EventModal from './EventModal';
import { fetchEvent, updateEvent, respondToInvite } from '../services/eventService';
import { getGuestId } from '../services/guestService';
import './feed/DiscoveryFeed.css';

const PAGE_SIZE = 5;
const TAGS = ['#munich', '#gaming', '#tech', '#music', '#food'];
const FOR_YOU = { key: 'for-you', label: 'For you' };
const AROUND_ME = { key: 'around-me', label: 'Around me', nearby: true };

const PinIcon = () => (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" />
    </svg>
);

const GroupIcon = () => (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8.5" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" /><path d="M16 5.2a3.3 3.3 0 0 1 0 6.6M18 14.8c2 .6 3.2 2.3 3.5 5.2" />
    </svg>
);

/** The card after the viewer answered an invitation, without waiting for a reload. */
export const withResponse = (event, response) => {
    const wasGoing = event.myResponse === 'accepted';
    const nowGoing = response === 'accepted';
    return {
        ...event,
        myResponse: response,
        going: nowGoing,
        attendeeCount: Math.max(0, (event.attendeeCount || 0) + (nowGoing ? 1 : 0) - (wasGoing ? 1 : 0)),
    };
};

/**
 * Discover feed with three kinds of chips:
 * - "For you": upcoming public events ranked by the server (friends going, friends hosting, popularity, how soon)
 * - one chip per friend group you are in: that group's upcoming events, soonest first
 * - tags: public events with that tag
 * Public events can be joined; invitations (e.g. a group's events) are answered right on the card.
 *
 * onAttendanceChange(event) is called after joining or leaving a public event.
 * onRespond(event, response) is called after answering an invitation.
 * onEventChanged() is called after the creator edited an event from the feed.
 * onError(message) is called when joining, leaving, answering or opening an event fails.
 *
 * Clicking a card opens the same details window as the calendar: your own events open for editing,
 * invitations with Going / Maybe / Can't go, and other public events read-only.
 */
const DiscoveryFeed = ({ onAttendanceChange, onRespond, onEventChanged, onError }) => {
    const { user } = useContext(AuthContext);
    const [groups, setGroups] = useState([]);
    const [active, setActive] = useState(FOR_YOU); // { key, label, tag?, groupId? }
    const [events, setEvents] = useState([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [pendingId, setPendingId] = useState(null);
    const [details, setDetails] = useState(null); // the opened event, in the calendar's shape
    const [showDetails, setShowDetails] = useState(false);
    const [openingId, setOpeningId] = useState(null);
    const [nearbyCity, setNearbyCity] = useState(undefined); // "Around me": the profile city, or null when none is set
    const latestRequest = useRef(0);

    const userKey = user?.id ?? null;

    // Friend groups become chips; logging out (or leaving the active group) falls back to "For you"
    useEffect(() => {
        if (!userKey) {
            setGroups([]);
            setActive(prev => (prev.groupId || prev.nearby ? FOR_YOU : prev));
            return;
        }
        api.get('/v1/groups')
            .then(res => {
                const mine = Array.isArray(res.data) ? res.data : [];
                setGroups(mine);
                setActive(prev => (prev.groupId && !mine.some(g => g.id === prev.groupId) ? FOR_YOU : prev));
            })
            .catch(() => setGroups([]));
    }, [userKey]);

    const loadPage = useCallback(async (pageToLoad) => {
        const requestId = ++latestRequest.current;
        setLoading(true);
        setLoadError(false);
        let filter = {};
        if (active.groupId) filter = { group: active.groupId };
        else if (active.nearby) filter = { nearby: true };
        else if (active.tag) filter = { tag: active.tag };
        try {
            const res = await api.get('/v2/events/feed', { params: { ...filter, page: pageToLoad, size: PAGE_SIZE } });
            if (requestId !== latestRequest.current) return; // a newer chip or login change won
            const incoming = res.data.events || [];
            setEvents(prev => {
                if (pageToLoad === 0) return incoming;
                // Rankings can shift between pages (someone joins); never show a card twice
                const seen = new Set(prev.map(e => e.id));
                return [...prev, ...incoming.filter(e => !seen.has(e.id))];
            });
            setPage(pageToLoad);
            setHasMore(!!res.data.hasMore);
            if (active.nearby) setNearbyCity(res.data.city || null);
        } catch (err) {
            if (requestId === latestRequest.current) setLoadError(true);
        } finally {
            if (requestId === latestRequest.current) setLoading(false);
        }
    }, [active]);

    // Reload from the top when the chip changes or someone logs in or out (friends and answers depend on it)
    useEffect(() => {
        setEvents([]);
        loadPage(0);
    }, [loadPage, userKey]);

    const handleToggleGoing = async (event) => {
        setPendingId(event.id);
        try {
            const url = `/v2/events/${event.id}/attendance`;
            const res = event.going ? await api.delete(url) : await api.post(url);
            setEvents(prev => prev.map(e => (e.id === event.id ? res.data : e)));
            if (onAttendanceChange) onAttendanceChange(res.data);
        } catch (err) {
            if (onError) onError(event.going ? 'Could not leave the event. Please try again.' : 'Could not join the event. Please try again.');
        } finally {
            setPendingId(null);
        }
    };

    const handleRespond = async (event, response) => {
        if (event.myResponse === response) return;
        setPendingId(event.id);
        try {
            await api.put(`/v2/events/${event.id}/response`, { response });
            const updated = withResponse(event, response);
            setEvents(prev => prev.map(e => (e.id === event.id ? updated : e)));
            if (onRespond) onRespond(updated, response);
        } catch (err) {
            if (onError) onError('Your answer could not be saved. Please try again.');
        } finally {
            setPendingId(null);
        }
    };

    const openDetails = async (card) => {
        setOpeningId(card.id);
        try {
            setDetails(await fetchEvent(card.id, user));
            setShowDetails(true);
        } catch (err) {
            if (onError) onError('This event could not be opened. It may have been deleted.');
        } finally {
            setOpeningId(null);
        }
    };

    // The creator edited the event: errors propagate to EventModal, which keeps the form open
    const handleSaveDetails = async (formData) => {
        await updateEvent(formData, user ? null : getGuestId());
        setShowDetails(false);
        loadPage(0);
        if (onEventChanged) onEventChanged();
    };

    // Answering inside the details window keeps the feed card in step
    const handleRespondInDetails = async (response) => {
        const card = events.find(e => e.id === details.id);
        const saved = await respondToInvite(details.id, response);
        setDetails(prev => ({ ...prev, responses: saved.responses || {}, myResponse: response }));
        const updatedCard = card ? withResponse(card, response) : null;
        if (updatedCard) setEvents(prev => prev.map(e => (e.id === updatedCard.id ? updatedCard : e)));
        if (onRespond) onRespond(updatedCard || { id: details.id, title: details.title }, response);
    };

    const chips = [
        FOR_YOU,
        ...(user ? [AROUND_ME] : []),
        ...groups.map(g => ({ key: `group-${g.id}`, label: g.name, groupId: g.id })),
        ...TAGS.map(tag => ({ key: `tag-${tag}`, label: tag, tag })),
    ];

    let emptyText = 'No upcoming public events yet.';
    if (active.nearby) emptyText = nearbyCity ? `No upcoming public events in ${nearbyCity} yet.` : '';
    else if (active.groupId) emptyText = `No upcoming events for ${active.label} yet. Create one and invite the group!`;
    else if (active.tag) emptyText = `No upcoming events for ${active.tag} yet.`;

    return (
        <section className="feed-panel" aria-labelledby="discover-heading">
            <h3 id="discover-heading">Discover</h3>

            <div className="feed-chips" role="group" aria-label="Filter events">
                {chips.map(chip => (
                    <button key={chip.key} type="button" className={`feed-chip${chip.groupId ? ' feed-chip-group' : ''}`}
                        aria-pressed={active.key === chip.key} onClick={() => setActive(chip)}
                        aria-label={chip.groupId ? `Group: ${chip.label}` : undefined}>
                        {chip.groupId && <GroupIcon />}
                        {chip.nearby && <PinIcon />}
                        {chip.label}
                    </button>
                ))}
            </div>

            {active.nearby && !loading && !loadError && nearbyCity === null && (
                <p className="feed-city-missing">
                    "Around me" shows public events in your city. It turns on once you add a city
                    to <a href="/profile/edit">your profile</a>.
                </p>
            )}
            {active.nearby && nearbyCity && <p className="feed-city">Public events in {nearbyCity}</p>}

            <div className="feed-list" aria-busy={loading}>
                {events.map(event => (
                    <FeedEventCard key={event.id} event={event} loggedIn={!!user}
                        pending={pendingId === event.id} onToggleGoing={handleToggleGoing} onRespond={handleRespond}
                        onOpen={openDetails} opening={openingId === event.id} />
                ))}

                {loading && events.length === 0 && <p className="feed-status">Loading events…</p>}
                {!loading && loadError && (
                    <p className="feed-status" role="alert">
                        Couldn't load events.{' '}
                        <button type="button" className="btn btn-link p-0 align-baseline" onClick={() => loadPage(events.length ? page + 1 : 0)}>
                            Try again
                        </button>
                    </p>
                )}
                {!loading && !loadError && events.length === 0 && emptyText && <p className="feed-status">{emptyText}</p>}
            </div>

            {hasMore && events.length > 0 && (
                <button type="button" className="feed-more" disabled={loading} onClick={() => loadPage(page + 1)}>
                    {loading ? 'Loading…' : 'Show more'}
                </button>
            )}
            {details && (
                <EventModal
                    show={showDetails}
                    onHide={() => setShowDetails(false)}
                    initialData={details}
                    onSave={handleSaveDetails}
                    isNewEvent={false}
                    readOnly={!details.isOwn}
                    onRespond={details.viewerRole === 'invited' ? handleRespondInDetails : undefined}
                />
            )}
        </section>
    );
};

export default DiscoveryFeed;
