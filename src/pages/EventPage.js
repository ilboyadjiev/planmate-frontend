import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import moment from 'moment';
import api from '../api/client';
import { AuthContext } from '../context/AuthContext';
import GlassPanel from '../components/GlassPanel';
import CalendarLoader from '../components/CalendarLoader';
import Avatar from '../components/Avatar';
import ShareButton from '../components/share/ShareButton';
import { CardAction, ClockIcon, PinIcon } from '../components/feed/FeedEventCard';
import useEventCardActions from '../components/feed/useEventCardActions';
import { formatPlace, socialProof, tagFeedPath } from '../components/feed/feedText';
import { eventUrl, loginPathTo } from '../services/shareLinks';
import { usePreferences } from '../services/preferences';
import '../components/feed/DiscoveryFeed.css';
import './EventPage.css';

const MAX_AVATARS = 5;

const LockIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
);

const CalendarOffIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4M10 14l4 4M14 14l-4 4" />
    </svg>
);

/** "Friday, 6 November · 19:00 – 22:00", or both dates for events that run past midnight. */
export const longWhen = (start, end, timeFormat = '24h') => {
    const s = moment(start);
    const e = moment(end);
    const t = timeFormat === '12h' ? 'h:mm A' : 'HH:mm';
    const year = s.year() !== moment().year() ? ' YYYY' : '';
    if (!e.isValid()) return s.format(`dddd, D MMMM${year} · ${t}`);
    if (s.isSame(e, 'day')) return `${s.format(`dddd, D MMMM${year}`)} · ${s.format(t)} – ${e.format(t)}`;
    return `${s.format(`ddd D MMM, ${t}`)} – ${e.format(`ddd D MMM${year}, ${t}`)}`;
};

/** The address under the place name, when it adds something. */
const addressOf = (location) => {
    if (!location) return null;
    const address = [location.street, [location.zipcode, location.city].filter(Boolean).join(' '), location.country]
        .filter(Boolean).join(', ');
    return address && address !== location.name ? address : null;
};

const mapsLink = (location) => {
    const query = [location.name, addressOf(location)].filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

/**
 * One event on its own page (/events/:id), the page a shared link opens. Anyone can open public events, also
 * without an account; private events open only for their host and the people invited. From here people join
 * or answer, open the host's profile, follow a tag to similar events, and share the link again.
 */
const EventPage = () => {
    const { id } = useParams();
    const location = useLocation();
    const { user } = useContext(AuthContext);
    const { timeFormat } = usePreferences();
    const [event, setEvent] = useState(null);
    const [status, setStatus] = useState('loading'); // loading | ready | loginRequired | notInvited | notFound | error
    const [notice, setNotice] = useState(null);

    const userKey = user?.id ?? null;
    const load = useCallback(async () => {
        try {
            const { data } = await api.get(`/v2/events/${encodeURIComponent(id)}/card`);
            setEvent(data);
            setStatus('ready');
        } catch (err) {
            const code = err.response?.status;
            // A private event: not logged in (401), or logged in but not invited (403). Gone: 404.
            if (code === 401) setStatus('loginRequired');
            else if (code === 403) setStatus('notInvited');
            else setStatus(code === 404 ? 'notFound' : 'error');
        }
    // userKey: logging in or out changes what the page shows (answers, friends going)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, userKey]);

    useEffect(() => {
        setStatus('loading');
        load();
    }, [load]);

    useEffect(() => {
        if (event?.title) document.title = `${event.title} · PlanMate`;
        return () => { document.title = 'PlanMate'; };
    }, [event?.title]);

    const setEvents = (update) => setEvent(prev => {
        const [next] = typeof update === 'function' ? update(prev ? [prev] : []) : update;
        return next || prev;
    });
    const { pendingId, openingId, toggleGoing, respond, openDetails, detailsModal } = useEventCardActions({
        user, events: event ? [event] : [], setEvents, reload: load, onError: setNotice,
    });

    const here = location.pathname;
    const discover = <Link to="/dashboard" className="settings-back">← Discover</Link>;

    if (status === 'loading') {
        return <div className="event-page"><CalendarLoader label="Loading the event…" size={88} className="is-page" /></div>;
    }

    if (status !== 'ready') {
        const messages = {
            loginRequired: ['This event is private', 'Log in to view details on this event.'],
            notInvited: ['This event is private', 'The sender of this event has to invite you in order for you to see the details.'],
            notFound: ["This event isn't available", 'It may have been deleted, or the link is not complete.'],
            error: ['This event could not be loaded', 'Please check your connection and try again.'],
        };
        const [title, text] = messages[status];
        return (
            <div className="event-page">
                <GlassPanel className="event-panel event-missing" aria-labelledby="event-missing-title">
                    <div className="event-topline">{discover}</div>
                    <span className={`event-missing-icon${status === 'loginRequired' || status === 'notInvited' ? ' is-locked' : ''}`} aria-hidden="true">
                        {status === 'loginRequired' || status === 'notInvited' ? <LockIcon /> : <CalendarOffIcon />}
                    </span>
                    <h1 id="event-missing-title">{title}</h1>
                    <p className="event-muted">{text}</p>
                    <div className="event-missing-actions">
                        {status === 'loginRequired' && (
                            <Link to={loginPathTo(here)} className="feed-action feed-action-join event-inline-action">Log in</Link>
                        )}
                        {status === 'error' && <button type="button" className="pm-glass-button" onClick={() => { setStatus('loading'); load(); }}>Try again</button>}
                        <Link to="/dashboard" className="pm-glass-button">Discover events</Link>
                    </div>
                </GlassPanel>
            </div>
        );
    }

    const start = moment(event.startTime);
    const ended = event.endTime ? moment(event.endTime).isBefore(moment()) : start.isBefore(moment());
    const host = event.host || {};
    const friends = event.friendsGoing || [];
    const { headline, detail } = socialProof(event, !!user);
    const place = formatPlace(event.location);
    const address = addressOf(event.location);
    const titleId = 'event-title';

    return (
        <div className="event-page">
            <GlassPanel tall className="event-panel" aria-labelledby={titleId}>
                <div className="event-topline">
                    {discover}
                    <ShareButton url={eventUrl(event.id)} title={event.title} />
                </div>

                <header className="event-hero">
                    <div className="feed-date event-date" aria-hidden="true">
                        <span className="feed-date-month">{start.format('MMM').toUpperCase()}</span>
                        <span className="feed-date-day">{start.format('D')}</span>
                    </div>
                    <div className="event-heading">
                        <h1 id={titleId} className="event-title">{event.title}</h1>
                        <div className="event-meta"><ClockIcon /><span>{longWhen(event.startTime, event.endTime, timeFormat)}</span></div>
                        {place && (
                            <div className="event-meta">
                                <PinIcon />
                                <span>
                                    {place}
                                    {address && <span className="event-address">{address}</span>}
                                    <a className="event-maps" href={mapsLink(event.location)} target="_blank" rel="noopener noreferrer">
                                        Open in Maps<span className="visually-hidden"> (opens a new tab)</span>
                                    </a>
                                </span>
                            </div>
                        )}
                    </div>
                </header>

                <div className="event-badges">
                    {ended && <span className="pm-chip pm-chip-sm event-ended">This event has ended</span>}
                    {event.isPublic === false && (
                        <span className="pm-chip pm-chip-sm event-private">Private · only people invited can open this link</span>
                    )}
                </div>

                <div className="event-host">
                    <Avatar person={host} className="feed-avatar event-host-avatar" colorKey={host.username || host.name} />
                    <span>
                        Hosted by{' '}
                        {host.you ? <strong>you</strong> : host.id && user ? (
                            <Link to={`/people/${host.id}`} className="event-host-link"><strong>{host.name}</strong></Link>
                        ) : <strong>{host.name}</strong>}
                        {host.username && !host.you && <span className="feed-host-username"> @{host.username}</span>}
                    </span>
                    {host.friend && <span className="pm-chip pm-chip-sm">Friend</span>}
                </div>

                {event.description && <p className="event-description">{event.description}</p>}

                {(event.tags || []).length > 0 && (
                    <ul className="event-tags" aria-label="Tags">
                        {event.tags.map(tag => (
                            <li key={tag}>
                                <Link to={tagFeedPath(tag)} className="pm-chip pm-chip-action event-tag" aria-label={`Show more ${tag} events`}>{tag}</Link>
                            </li>
                        ))}
                    </ul>
                )}

                <div className="event-footer">
                    <div className="feed-social">
                        {friends.length > 0 && (
                            <div className="feed-avatar-stack">
                                {friends.slice(0, MAX_AVATARS).map(f => (
                                    <Avatar key={f.id} person={f} className="feed-avatar" title={f.firstName || f.username} />
                                ))}
                            </div>
                        )}
                        <div className="feed-social-text">
                            <span className={`feed-social-headline${friends.length > 0 || event.going ? ' has-friends' : ''}`}>{headline}</span>
                            {detail && <span className="feed-social-detail">{detail}</span>}
                        </div>
                    </div>
                    <div className="event-actions">
                        {!ended && (
                            <CardAction event={event} loggedIn={!!user} pending={pendingId === event.id}
                                onToggleGoing={toggleGoing} onRespond={respond} titleId={titleId}
                                loginPath={loginPathTo(here)} />
                        )}
                        {event.hosting && (
                            <button type="button" className="pm-glass-button" onClick={() => openDetails(event)}
                                aria-busy={openingId === event.id} aria-haspopup="dialog">
                                Edit event
                            </button>
                        )}
                    </div>
                </div>

                {notice && <p className="availability-message msg-error event-notice" role="alert">{notice}</p>}
            </GlassPanel>
            {detailsModal}
        </div>
    );
};

export default EventPage;
