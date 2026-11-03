import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import api from '../api/client';
import { AuthContext } from '../context/AuthContext';
import FeedEventCard from './feed/FeedEventCard';
import './feed/DiscoveryFeed.css';

const PAGE_SIZE = 5;
const FOR_YOU = null;
const TAGS = ['#munich', '#gaming', '#tech', '#music', '#food'];

/**
 * Discover feed: upcoming public events ranked by the server (friends going, friends hosting, popularity, how soon).
 * "For you" is the whole ranked feed; a tag narrows it. Joining adds the event to your calendar, read-only.
 *
 * onAttendanceChange(event) is called after joining or leaving, with the updated event.
 * onError(message) is called when joining or leaving fails.
 */
const DiscoveryFeed = ({ onAttendanceChange, onError }) => {
    const { user } = useContext(AuthContext);
    const [activeTag, setActiveTag] = useState(FOR_YOU);
    const [events, setEvents] = useState([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [pendingId, setPendingId] = useState(null);
    const latestRequest = useRef(0);

    const userKey = user?.id ?? null;

    const loadPage = useCallback(async (pageToLoad) => {
        const requestId = ++latestRequest.current;
        setLoading(true);
        setLoadError(false);
        try {
            const res = await api.get('/v2/events/feed', {
                params: { ...(activeTag ? { tag: activeTag } : {}), page: pageToLoad, size: PAGE_SIZE },
            });
            if (requestId !== latestRequest.current) return; // a newer tag or login change won
            const incoming = res.data.events || [];
            setEvents(prev => {
                if (pageToLoad === 0) return incoming;
                // Rankings can shift between pages (someone joins); never show a card twice
                const seen = new Set(prev.map(e => e.id));
                return [...prev, ...incoming.filter(e => !seen.has(e.id))];
            });
            setPage(pageToLoad);
            setHasMore(!!res.data.hasMore);
        } catch (err) {
            if (requestId === latestRequest.current) setLoadError(true);
        } finally {
            if (requestId === latestRequest.current) setLoading(false);
        }
    }, [activeTag]);

    // Reload from the top when the tag changes or someone logs in or out (friends and "going" depend on it)
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
            const message = err.response?.data?.message;
            if (onError) onError(message || (event.going ? 'Could not leave the event. Please try again.' : 'Could not join the event. Please try again.'));
        } finally {
            setPendingId(null);
        }
    };

    const chips = [{ label: 'For you', tag: FOR_YOU }, ...TAGS.map(tag => ({ label: tag, tag }))];

    return (
        <section className="feed-panel" aria-labelledby="discover-heading">
            <h3 id="discover-heading">Discover</h3>

            <div className="feed-chips" role="group" aria-label="Filter events">
                {chips.map(chip => (
                    <button key={chip.label} type="button" className="feed-chip"
                        aria-pressed={activeTag === chip.tag} onClick={() => setActiveTag(chip.tag)}>
                        {chip.label}
                    </button>
                ))}
            </div>

            <div className="feed-list" aria-busy={loading}>
                {events.map(event => (
                    <FeedEventCard key={event.id} event={event} loggedIn={!!user}
                        pending={pendingId === event.id} onToggleGoing={handleToggleGoing} />
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
                {!loading && !loadError && events.length === 0 && (
                    <p className="feed-status">
                        {activeTag ? `No upcoming events for ${activeTag} yet.` : 'No upcoming public events yet.'}
                    </p>
                )}
            </div>

            {hasMore && events.length > 0 && (
                <button type="button" className="feed-more" disabled={loading} onClick={() => loadPage(page + 1)}>
                    {loading ? 'Loading…' : 'Show more'}
                </button>
            )}
        </section>
    );
};

export default DiscoveryFeed;
