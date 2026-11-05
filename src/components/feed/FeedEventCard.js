import React from 'react';
import { Link } from 'react-router-dom';
import moment from 'moment';
import { initials, socialProof, formatWhen, formatPlace } from './feedText';
import Avatar from '../Avatar';
import SourceLink from '../SourceLink';
import { RESPONSES } from '../calendarStatus';
import { usePreferences } from '../../services/preferences';

const MAX_AVATARS = 3;

export const ClockIcon = () => (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
);

export const PinIcon = () => (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" />
    </svg>
);

const CheckIcon = () => (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
);

/**
 * What you can do with an event: answer an invitation, see that you host it, log in, or join / leave it.
 * Shared by the feed cards and the event page. loginPath: where "Log in to join" goes (back to this page after).
 */
export const CardAction = ({ event, loggedIn, pending, onToggleGoing, onRespond, titleId, loginPath = '/login' }) => {
    if (event.cancelled) {
        return <span className="pm-chip feed-cancelled">Cancelled</span>;
    }
    if (event.invited && !event.hosting && onRespond) {
        // Invitations are answered right here: Going / Maybe / Can't go
        return (
            <div className="feed-rsvp">
                {event.myResponse === 'pending' && (
                    <span className="feed-rsvp-prompt" id={`${titleId}-prompt`}>You're invited. Will you be there?</span>
                )}
                <div className="feed-rsvp-buttons" role="group" aria-label={`Your answer for ${event.title}`}>
                    {RESPONSES.map(({ value, label }) => (
                        <button key={value} type="button" className={`feed-rsvp-button rsvp-${value}`}
                            aria-pressed={event.myResponse === value} disabled={pending}
                            onClick={() => onRespond(event, value)}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>
        );
    } else if (event.hosting) {
        return <span className="pm-chip feed-hosting">You're hosting</span>;
    } else if (!loggedIn) {
        return <Link to={loginPath} className="feed-action feed-action-login">Log in to join</Link>;
    } else if (event.going) {
        return (
            <button type="button" className="feed-action feed-action-going" aria-pressed="true"
                aria-describedby={titleId} disabled={pending} onClick={() => onToggleGoing(event)}>
                <CheckIcon /> {pending ? 'Leaving…' : 'Going'}
                <span className="visually-hidden"> (select to leave)</span>
            </button>
        );
    } else {
        return (
            <button type="button" className="feed-action feed-action-join" aria-pressed="false"
                aria-describedby={titleId} disabled={pending} onClick={() => onToggleGoing(event)}>
                {pending ? 'Joining…' : "I'm going"}
            </button>
        );
    }

};

/**
 * One event on the Discover feed (see the card design canvas): date, title, time and place, host,
 * description, tags, and who is going above the action.
 */
const FeedEventCard = ({ event, loggedIn, pending, onToggleGoing, onRespond, onOpen, opening }) => {
    const { timeFormat } = usePreferences();
    const start = moment(event.startTime);
    const host = event.host || {};
    const friends = event.friendsGoing || [];
    const place = formatPlace(event.location);
    const { headline, detail } = socialProof(event, loggedIn);
    const titleId = `feed-event-${event.id}`;
    const [hostFirst, hostLast] = (host.name || '').split(' ');

    const action = (
        <CardAction event={event} loggedIn={loggedIn} pending={pending} onToggleGoing={onToggleGoing}
            onRespond={onRespond} titleId={titleId} />
    );

    return (
        <article className={`feed-card${event.cancelled ? ' is-cancelled' : ''}${event.going ? ' is-going' : ''}${event.hosting ? ' is-hosting' : ''}${event.myResponse === 'pending' ? ' is-unanswered' : ''}`} aria-labelledby={titleId}>
            <div className="feed-card-top">
                <div className="feed-date" aria-hidden="true">
                    <span className="feed-date-month">{start.format('MMM').toUpperCase()}</span>
                    <span className="feed-date-day">{start.format('D')}</span>
                </div>
                <div className="feed-card-heading">
                    <h4 id={titleId} className="feed-card-title">
                        {onOpen ? (
                            // Covers the whole card (see .feed-card-open::after), so clicking anywhere opens the details
                            <button type="button" className="feed-card-open" onClick={() => onOpen(event)}
                                aria-busy={opening} aria-haspopup="dialog">
                                {event.title}
                            </button>
                        ) : event.title}
                    </h4>
                    <div className="feed-meta"><ClockIcon /><span>{formatWhen(event.startTime, event.endTime, timeFormat)}</span></div>
                    {place && <div className="feed-meta"><PinIcon /><span className="feed-meta-text">{place}</span></div>}
                    {event.moreDates > 0 && (
                        <div className="feed-meta feed-more-dates">+{event.moreDates} more {event.moreDates === 1 ? 'date' : 'dates'}</div>
                    )}
                </div>
            </div>

            <div className="feed-host">
                <Avatar person={host} text={initials(hostFirst, hostLast, host.name)}
                    colorKey={host.username || host.name} className="feed-avatar feed-avatar-sm" />
                <span>
                    Hosted by <strong>{host.you ? 'you' : host.name}</strong>
                    {host.username && !host.you && <span className="feed-host-username"> @{host.username}</span>}
                </span>
                {host.friend && <span className="pm-chip pm-chip-sm">Friend</span>}
            </div>

            {event.description && <p className="feed-description">{event.description}</p>}
            <SourceLink url={event.sourceUrl} />

            {(event.tags || []).length > 0 && (
                <ul className="feed-tags" aria-label="Tags">
                    {event.tags.map(tag => <li key={tag} className="pm-chip pm-chip-sm">{tag}</li>)}
                </ul>
            )}

            <div className="feed-card-footer">
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
                {action}
            </div>
        </article>
    );
};

export default FeedEventCard;
