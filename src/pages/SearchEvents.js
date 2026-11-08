import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { AuthContext } from '../context/AuthContext';
import FeedEventCard from '../components/feed/FeedEventCard';
import useEventCardActions from '../components/feed/useEventCardActions';
import NoticeToast, { attendanceNotice, responseNotice } from '../components/NoticeToast';
import useSearchHistory from '../hooks/useSearchHistory';
import GlassPanel from '../components/GlassPanel';
import { FOCUS_SEARCH } from '../services/searchFocus';
import '../components/feed/DiscoveryFeed.css';
import './SearchEvents.css';
import CalendarLoader from '../components/CalendarLoader';

const PAGE_SIZE = 10;
const MIN_LENGTH = 2;
const EXAMPLES = ['#munich', 'board games', 'running', 'jazz'];

const MATCH_LABELS = {
    title: 'title',
    tags: 'tags',
    location: 'location',
    description: 'description',
    friend: "a friend's name",
    group: "a group's name",
};

/** ["title", "tags", "location"] -> "title, tags and location" (the server says why an event matched). */
export const matchedByText = (matchedBy) => {
    const parts = (matchedBy || []).map(m => MATCH_LABELS[m]).filter(Boolean);
    if (parts.length === 0) return null;
    if (parts.length === 1) return parts[0];
    return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
};

const SearchIcon = () => (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
    </svg>
);

const HistoryIcon = () => (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" /><path d="M3.5 4v4h4" /><path d="M12 8v4l3 2" />
    </svg>
);

/** Clicking these must not take focus from the field, or the recent searches would close mid-click. */
const keepFocus = e => e.preventDefault();

const ClearIcon = () => (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M6 6l12 12M18 6L6 18" />
    </svg>
);

/**
 * Event search (see the "Event Search" design canvas). Searches only when you press Enter; the query lives in the
 * URL (?q=), so going back returns to the same results. Results are Discover feed cards, best match first, each
 * with a quiet "Matched by …" line, and "Show more" at the bottom.
 *
 * Recent searches (this device only) show while the field has focus, in place of the tips; typing narrows them.
 * Tapping Search in the navbar while on this page focuses the field (FOCUS_SEARCH), which opens the keyboard.
 */
const SearchEvents = () => {
    const { user } = useContext(AuthContext);
    const [searchParams, setSearchParams] = useSearchParams();
    const query = (searchParams.get('q') || '').trim();

    const [draft, setDraft] = useState(query);
    const [tooShort, setTooShort] = useState(false);
    const [events, setEvents] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [notice, setNotice] = useState(null);
    const [historyOpen, setHistoryOpen] = useState(false);
    const latestRequest = useRef(0);
    const inputRef = useRef(null);

    const userKey = user?.id ?? null;
    const { history, remember, forget, clearAll } = useSearchHistory(userKey);

    // Navbar Search tapped again: focus right away, inside the tap, so phones show the keyboard
    useEffect(() => {
        const focusField = () => {
            if (inputRef.current) inputRef.current.focus();
            setHistoryOpen(true);
        };
        window.addEventListener(FOCUS_SEARCH, focusField);
        return () => window.removeEventListener(FOCUS_SEARCH, focusField);
    }, []);

    // Back / forward between searches puts that search back in the field
    useEffect(() => { setDraft(query); }, [query]);

    const loadPage = useCallback(async (pageToLoad) => {
        if (!query) return;
        const requestId = ++latestRequest.current;
        setLoading(true);
        setLoadError(false);
        try {
            const res = await api.get('/v2/events/search', { params: { q: query, page: pageToLoad, size: PAGE_SIZE } });
            if (requestId !== latestRequest.current) return; // a newer search won
            const incoming = res.data.events || [];
            setEvents(prev => {
                if (pageToLoad === 0) return incoming;
                const seen = new Set(prev.map(e => e.id));
                return [...prev, ...incoming.filter(e => !seen.has(e.id))];
            });
            setPage(pageToLoad);
            setHasMore(!!res.data.hasMore);
            setTotal(res.data.total ?? incoming.length);
        } catch (err) {
            if (requestId === latestRequest.current) setLoadError(true);
        } finally {
            if (requestId === latestRequest.current) setLoading(false);
        }
    }, [query]);

    // A new search, or logging in or out (private events and friends depend on it), starts from the top
    useEffect(() => {
        latestRequest.current += 1; // drop answers to an earlier search
        setEvents([]);
        setTotal(0);
        setHasMore(false);
        setLoadError(false);
        setLoading(false);
        loadPage(0);
    }, [loadPage, userKey]);

    const { pendingId, openingId, toggleGoing, respond, openDetails, detailsModal } = useEventCardActions({
        user, events, setEvents, reload: () => loadPage(0),
        onAttendanceChange: (event, response) => setNotice(attendanceNotice(event, response)),
        onRespond: (event, response) => setNotice(responseNotice(event, response)),
        onError: text => setNotice({ type: 'error', text }),
    });

    const search = (text) => {
        const q = text.trim();
        if (q.length < MIN_LENGTH) {
            setTooShort(true);
            return;
        }
        setTooShort(false);
        setDraft(q);
        remember(q);
        setHistoryOpen(false);
        if (inputRef.current) inputRef.current.blur(); // phones: hide the keyboard to show the results
        if (q === query) loadPage(0); // searching the same again refreshes the results
        else setSearchParams({ q });
    };

    const clear = () => {
        setDraft('');
        setTooShort(false);
        setSearchParams({});
        if (inputRef.current) inputRef.current.focus();
    };

    const unsent = draft.trim() !== query && draft.trim().length >= MIN_LENGTH;
    const typed = draft.trim().toLowerCase();
    const recent = typed && typed !== query.toLowerCase()
        ? history.filter(q => q.toLowerCase().includes(typed) && q.toLowerCase() !== typed)
        : history;
    const showHistory = historyOpen && recent.length > 0;
    const searched = !!query && !loading && !loadError;

    return (
        <main className="search-page">
            <GlassPanel tall shellClassName="feed-glass" className="feed-panel" aria-label="Search events">
                <div className={`search-box${query ? ' has-results' : ''}`}
                    onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setHistoryOpen(false); }}
                    onKeyDown={e => { if (e.key === 'Escape') setHistoryOpen(false); }}>
                <form role="search" className="search-form" onSubmit={e => { e.preventDefault(); search(draft); }}>
                    <label htmlFor="event-search" className="visually-hidden">Search events</label>
                    <div className="search-field">
                        <SearchIcon />
                        <input id="event-search" ref={inputRef} type="search" enterKeyHint="search" autoComplete="off"
                            placeholder="Events, places, tags or friends" value={draft}
                            aria-describedby={tooShort ? 'search-too-short' : undefined}
                            onFocus={() => setHistoryOpen(true)} onClick={() => setHistoryOpen(true)}
                            onChange={e => { setDraft(e.target.value); setTooShort(false); setHistoryOpen(true); }} />
                        {unsent && <span className="search-enter-hint" aria-hidden="true">Enter ↵</span>}
                        {draft && (
                            <button type="button" className="search-clear" aria-label="Clear search" onClick={clear}>
                                <ClearIcon />
                            </button>
                        )}
                    </div>
                    {tooShort && <p id="search-too-short" className="search-hint" role="alert">Type at least two letters.</p>}
                </form>

                {showHistory && (
                    <div id="search-history" className="search-history">
                        <div className="search-history-header">
                            <h2 id="search-history-title">Recent searches</h2>
                            <button type="button" className="search-history-clear" onMouseDown={keepFocus} onClick={clearAll}>
                                Clear all
                            </button>
                        </div>
                        <ul aria-labelledby="search-history-title">
                            {recent.map(q => (
                                <li key={q} className="search-history-item">
                                    <button type="button" className="search-history-query" onMouseDown={keepFocus}
                                        onClick={() => search(q)}>
                                        <HistoryIcon />
                                        <span>{q}</span>
                                    </button>
                                    <button type="button" className="search-history-remove" onMouseDown={keepFocus}
                                        aria-label={`Remove “${q}” from recent searches`} onClick={() => forget(q)}>
                                        <ClearIcon />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                </div>

                {!query && !showHistory && (
                    <div className="search-intro">
                        <p className="search-hint">
                            Press Enter to search. Try a kind of event, a place, a tag, or a friend's name to see what
                            they're going to.
                        </p>
                        <div className="feed-chips" role="group" aria-label="Example searches">
                            {EXAMPLES.map(example => (
                                <button key={example} type="button" className="feed-chip" onClick={() => search(example)}>
                                    {example}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {searched && events.length > 0 && (
                    <p className="search-count" role="status">
                        <strong>{total} {total === 1 ? 'event' : 'events'}</strong> for “{query}”, best match first
                    </p>
                )}

                {query && (
                    <div className="feed-list search-results" aria-busy={loading}>
                        {events.map(event => {
                            const matched = matchedByText(event.matchedBy);
                            return (
                                <div key={event.id} className="search-result">
                                    <FeedEventCard event={event} loggedIn={!!user}
                                        pending={pendingId === event.id} onToggleGoing={toggleGoing} onRespond={respond}
                                        onOpen={openDetails} opening={openingId === event.id} />
                                    {matched && <p className="search-matched">Matched by {matched}</p>}
                                </div>
                            );
                        })}

                        {loading && events.length === 0 && <CalendarLoader label="Searching…" />}
                        {!loading && loadError && (
                            <p className="feed-status" role="alert">
                                Search didn't work this time.{' '}
                                <button type="button" className="btn btn-link p-0 align-baseline" onClick={() => loadPage(events.length ? page + 1 : 0)}>
                                    Try again
                                </button>
                            </p>
                        )}
                    </div>
                )}

                {searched && events.length === 0 && (
                    <div className="search-empty" role="status">
                        <h2>No upcoming events match “{query}”</h2>
                        <p>Try fewer words or another spelling. Search only looks at events that haven't happened yet.</p>
                        <Link to="/dashboard" className="feed-action feed-action-join search-back">Back to Discover</Link>
                    </div>
                )}

                {hasMore && events.length > 0 && (
                    <button type="button" className="feed-more pm-glass-button" disabled={loading} onClick={() => loadPage(page + 1)}>
                        {loading ? 'Loading…' : 'Show more'}
                    </button>
                )}
            </GlassPanel>

            {detailsModal}
            <NoticeToast notice={notice} onClose={() => setNotice(null)} />
        </main>
    );
};

export default SearchEvents;
