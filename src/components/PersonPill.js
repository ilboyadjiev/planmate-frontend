import React from 'react';
import { avatarColor, initials } from './feed/feedText';
import { RESPONSE_LABELS } from './calendarStatus';

/**
 * A person, as a frosted two-line pill: picture, first name (and their answer to an invitation) on top,
 * @username below. Used wherever the app lists people; tags and status labels use the plain .pm-chip bubble.
 *
 * person: { id, firstName, lastName, username }. label replaces the first name (e.g. "You").
 * answer: 'accepted' | 'maybe' | 'declined' | 'pending' (optional). note: extra text instead of an answer
 * (e.g. "organizer"). With onClick the pill is a button (e.g. to open the person's profile).
 *
 * There are no uploaded profile pictures yet: the picture is the person's initials on their colour.
 */
const PersonPill = ({ person, label, answer, note, onClick, ariaLabel }) => {
    const name = label || person.firstName || person.lastName || person.username || 'Someone';
    const showHandle = person.username && name !== person.username;
    const extra = note || (answer ? RESPONSE_LABELS[answer] : null);

    const content = (
        <>
            <span className="person-pill-picture" style={{ background: avatarColor(person.id) }} aria-hidden="true">
                {initials(person.firstName, person.lastName, person.username)}
            </span>
            <span className="person-pill-text">
                <span className="person-pill-name">
                    {name}
                    {extra && (
                        <span className={`person-pill-extra participant-response ${note ? 'response-organizer' : `response-${answer}`}`}>
                            {' · '}{extra}
                        </span>
                    )}
                </span>
                {showHandle && <span className="person-pill-handle">@{person.username}</span>}
            </span>
        </>
    );

    return onClick ? (
        <button type="button" className="person-pill is-interactive" onClick={onClick} aria-label={ariaLabel}
            aria-haspopup="dialog">
            {content}
        </button>
    ) : (
        <span className="person-pill">{content}</span>
    );
};

export default PersonPill;
