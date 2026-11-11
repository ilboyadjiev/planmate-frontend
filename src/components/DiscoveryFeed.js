import React, { useState, useEffect, useLayoutEffect, useContext, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { usePreferences } from '../services/preferences';
import { AuthContext } from '../context/AuthContext';
import FeedEventCard from './feed/FeedEventCard';
import useLoadMoreOnScroll from '../hooks/useLoadMoreOnScroll';
import DateRangeFilter from './feed/DateRangeFilter';
import { dateWindowParams } from '../services/dateFilter';
import useEventCardActions from './feed/useEventCardActions';
import GlassPanel from './GlassPanel';
import './feed/DiscoveryFeed.css';
import CalendarLoader from './CalendarLoader';

const PAGE_SIZE = 5;
const AUTO_LOAD_LIMIT = 60;
/**
 * Tag chips: only the topics you chose in Settings (nothing is pushed on anyone), plus the tag you are looking at
 * right now, e.g. one picked from an event's details.
 */
export const topicChips = (likedTags = [], hiddenTags = [], activeTag = null) => {
    const chips = likedTags.filter(tag => !hiddenTags.includes(tag));
    return activeTag && !chips.includes(activeTag) ? [...chips, activeTag] : chips;
};
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

export { withResponse } from './feed/useEventCardActions';

/**
 * Discover feed with three kinds of chips:
 * - "For you": upcoming public events ranked by the server (friends going, friends hosting, popularity, how soon)
 * - one chip per friend group you are in: that group's upcoming events, soonest first
 * - tags: public events with that tag
 * Public events can be joined; invitations (e.g. a group's events) are answered right on the card.
 *
 * onAttendanceChange(event, response?) is called after joining or leaving a public event, or answering it Maybe
 * (response, from the details window: accepted, maybe or declined).
 * onRespond(event, response) is called after answering an invitation.
 * onEventChanged() is called after the creator edited an event from the feed.
 * onError(message) is called when joining, leaving, answering or opening an event fails.
 *
 * Clicking a card opens the same details window as the calendar: your own events open for editing,
 * invitations with Going / Maybe / Can't go, and other public events read-only.
 */
const DiscoveryFeed = ({ onAttendanceChange, onRespond, onEventChanged, onError }) => {
    const { user } = useContext(AuthContext);
    const { likedTags, hiddenTags } = usePreferences();
    const [groups, setGroups] = useState([]);
    const [active, setActive] = useState(FOR_YOU); // { key, label, tag?, groupId? }
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [events, setEvents] = useState([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [nearbyCity, setNearbyCity] = useState(undefined); // "Around me": the profile city, or null when none is set
    const latestRequest = useRef(0);
    // Page the window stays put while a new page is appended: the glass panel's backdrop-filter defeats the
    // browser's own scroll anchoring, so without this the view jumps a little when the next events land.
    const restoreScroll = useRef(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const linkedTag = searchParams.get('tag');

    // A tag picked in an event's details (/dashboard?tag=%23music): show that tag's events, then tidy the URL
    useEffect(() => {
        if (!linkedTag) return;
        const tag = linkedTag.startsWith('#') ? linkedTag.toLowerCase() : `#${linkedTag.toLowerCase()}`;
        setActive({ key: `tag-${tag}`, label: tag, tag });
        setSearchParams(params => {
            const next = new URLSearchParams(params);
            next.delete('tag');
            return next;
        }, { replace: true });
        if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
    }, [linkedTag, setSearchParams]);

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
            const res = await api.get('/v2/events/feed', { params: { ...filter, ...dateWindowParams(dateFrom, dateTo), page: pageToLoad, size: PAGE_SIZE } });
            if (requestId !== latestRequest.current) return; // a newer chip or login change won
            const incoming = res.data.events || [];
            // Appending below the fold: remember where we are so the layout effect can undo any jump
            if (pageToLoad > 0) restoreScroll.current = window.scrollY;
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
    }, [active, dateFrom, dateTo]);

    // After a page is appended, pin the window back where it was before the browser can paint the jump.
    // (restoreScroll is 0/null on first load and chip changes, which scroll to the top on purpose.)
    useLayoutEffect(() => {
        if (restoreScroll.current) {
            window.scrollTo(0, restoreScroll.current);
            restoreScroll.current = null;
        }
    }, [events]);

    // Reload from the top when the chip changes or someone logs in or out (friends and answers depend on it)
    useEffect(() => {
        setEvents([]);
        loadPage(0);
    }, [loadPage, userKey]);

    // Infinite scrolling: the next page loads as the end of the list comes near. After AUTO_LOAD_LIMIT cards it
    // stops, so the footer (Impressum, privacy) stays reachable; "Show more" then loads the rest.
    const autoLoad = hasMore && !loading && !loadError && events.length > 0 && events.length < AUTO_LOAD_LIMIT;
    const moreRef = useLoadMoreOnScroll(() => loadPage(page + 1), autoLoad);

    const { pendingId, openingId, toggleGoing, respond, openDetails, detailsModal } = useEventCardActions({
        user, events, setEvents, reload: () => loadPage(0), onAttendanceChange, onRespond, onEventChanged, onError,
    });

    const chips = [
        FOR_YOU,
        ...(user ? [AROUND_ME] : []),
        ...groups.map(g => ({ key: `group-${g.id}`, label: g.name, groupId: g.id })),
        ...topicChips(likedTags, hiddenTags, active.tag).map(tag => ({ key: `tag-${tag}`, label: tag, tag })),
    ];

    let emptyText = 'No upcoming public events yet.';
    if (active.nearby) emptyText = nearbyCity ? `No upcoming public events in ${nearbyCity} yet.` : '';
    else if (active.groupId) emptyText = `No upcoming events for ${active.label} yet. Create one and invite the group!`;
    else if (active.tag) emptyText = `No upcoming events for ${active.tag} yet.`;

    return (
        <GlassPanel tall shellClassName="feed-glass" className="feed-panel" aria-label="Discover">
            <DateRangeFilter from={dateFrom} to={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t); }} />

            <div className="feed-chips" role="group" aria-label="Filter events">
                {chips.map(chip => (
                    <button key={chip.key} type="button" className={`feed-chip${chip.groupId ? ' feed-chip-group' : ''}`}
                        aria-pressed={active.key === chip.key}
                        onClick={e => {
                            setActive(chip);
                            // In the one-line swipeable row on phones, bring the chosen chip into view
                            if (e.currentTarget.scrollIntoView) e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                        }}
                        aria-label={chip.groupId ? `Group: ${chip.label}` : undefined}>
                        {chip.groupId && <GroupIcon />}
                        {chip.nearby && <PinIcon />}
                        {chip.label}
                    </button>
                ))}
            </div>

            {active.nearby && !loading && !loadError && nearbyCity === null && (
                <p className="feed-city-missing">
                    "Around me" shows public events in your city. It turns on once you set your home city
                    in <Link to="/settings#discover">Settings</Link>.
                </p>
            )}
            {active.nearby && nearbyCity && <p className="feed-city">Public events in {nearbyCity}</p>}

            <div className="feed-list" aria-busy={loading}>
                {events.map(event => (
                    <FeedEventCard key={event.id} event={event} loggedIn={!!user}
                        pending={pendingId === event.id} onToggleGoing={toggleGoing} onRespond={respond}
                        onOpen={openDetails} opening={openingId === event.id} />
                ))}

                {loading && events.length === 0 && <CalendarLoader label="Loading events…" />}
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
                <div ref={moreRef} className="feed-more-place">
                    <button type="button" className="feed-more pm-glass-button" disabled={loading} onClick={() => loadPage(page + 1)}>
                        {loading ? 'Loading…' : 'Show more'}
                    </button>
                </div>
            )}
            <span className="visually-hidden" role="status" aria-live="polite">
                {loading && events.length > 0 ? 'Loading more events…' : ''}
            </span>
            {detailsModal}
        </GlassPanel>
    );
};

export default DiscoveryFeed;
