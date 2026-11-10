import React, { useCallback, useEffect, useState } from 'react';
import moment from 'moment';
import { usePreferences, formatTime } from '../../services/preferences';
import { respondToInvite, toCalendarEvent } from '../../services/eventService';
import { listUnansweredInvites, dismissInvite, notifyInvitesChanged, INVITES_CHANGED } from '../../services/inviteEvents';
import './InvitationsPanel.css';

const CheckIcon = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
);
const CrossIcon = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 6l12 12M18 6L6 18" />
    </svg>
);
const ChevronIcon = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9l6 6 6-6" />
    </svg>
);

// tick = Going, "?" = Maybe, X = Can't go
const ANSWERS = [
    { value: 'accepted', label: 'Going', cls: 'go', icon: <CheckIcon /> },
    { value: 'maybe', label: 'Maybe', cls: 'maybe', icon: <span className="inv-qm" aria-hidden="true">?</span> },
    { value: 'declined', label: "Can't go", cls: 'no', icon: <CrossIcon /> },
];

const hostName = (ev) => {
    const o = ev.organizer;
    if (o) {
        const full = `${o.firstName || ''} ${o.lastName || ''}`.trim();
        return full || (o.username ? `@${o.username}` : 'Someone');
    }
    return ev.hostName || 'Someone';
};
const placeOf = (ev) => ev.location?.name || ev.location?.city || '';

/**
 * The Invitations section on the calendar page: upcoming events the user was invited to but has not answered.
 * Collapsible, with an orange dot and the count. Each row opens the event; on the right a round "Respond" button
 * expands to Going / Maybe / Can't go, and "Dismiss" clears the invitation while keeping the event in the calendar.
 * Renders nothing when there are no waiting invitations.
 */
const InvitationsPanel = ({ user, reloadKey, onOpen, onChanged }) => {
    const { timeFormat } = usePreferences();
    const [invites, setInvites] = useState([]);
    const [open, setOpen] = useState(false);
    const [respondingId, setRespondingId] = useState(null);
    const [pendingId, setPendingId] = useState(null);

    const load = useCallback(async () => {
        try {
            setInvites(await listUnansweredInvites());
        } catch (err) {
            // A failure here should never break the calendar; just show nothing.
            setInvites([]);
        }
    }, []);

    useEffect(() => { if (user) load(); }, [user, reloadKey, load]);

    useEffect(() => {
        if (!user) return undefined;
        const onChangedElsewhere = () => load();
        window.addEventListener(INVITES_CHANGED, onChangedElsewhere);
        return () => window.removeEventListener(INVITES_CHANGED, onChangedElsewhere);
    }, [user, load]);

    const drop = (id) => setInvites(prev => prev.filter(e => e.id !== id));

    const answer = async (ev, response) => {
        setPendingId(ev.id);
        try {
            await respondToInvite(ev.id, response);
            drop(ev.id);
            notifyInvitesChanged();
            onChanged && onChanged();
        } finally {
            setPendingId(null);
            setRespondingId(null);
        }
    };

    const dismiss = async (ev) => {
        setPendingId(ev.id);
        try {
            await dismissInvite(ev.id);
            drop(ev.id);
            notifyInvitesChanged();
        } finally {
            setPendingId(null);
        }
    };

    if (!user || invites.length === 0) {
        return null;
    }

    return (
        <section className="inv-panel" data-open={open} aria-label="Invitations">
            <button type="button" className="inv-head" aria-expanded={open} aria-controls="inv-body"
                onClick={() => setOpen(o => !o)}>
                <h3 className="inv-title">Invitations</h3>
                <span className="inv-count"><span className="inv-dot" aria-hidden="true" />
                    <span>{invites.length}</span>
                    <span className="visually-hidden"> waiting for an answer</span>
                </span>
                <span className="inv-chev"><ChevronIcon /></span>
            </button>

            <div className="inv-body" id="inv-body">
                <div>
                    <ul className="inv-list">
                        {invites.map(ev => {
                            const start = moment(ev.startTime);
                            const place = placeOf(ev);
                            const responding = respondingId === ev.id;
                            const busy = pendingId === ev.id;
                            const titleId = `inv-${ev.id}`;
                            return (
                                <li key={ev.id} className="inv-item" data-responding={responding}>
                                    <div className="inv-date" aria-hidden="true">
                                        <span className="inv-m">{start.format('MMM').toUpperCase()}</span>
                                        <span className="inv-d">{start.format('D')}</span>
                                    </div>
                                    <button type="button" className="inv-main" onClick={() => onOpen(toCalendarEvent(ev, user))}
                                        aria-label={`Open ${ev.title}`}>
                                        <span className="inv-ev-title" id={titleId}>{ev.title}</span>
                                        <span className="inv-meta">
                                            <span>{start.format('ddd')}, {formatTime(ev.startTime, timeFormat)}</span>
                                            <span aria-hidden="true">·</span>
                                            <span className="inv-host">Hosted by <b>{hostName(ev)}</b></span>
                                        </span>
                                        {place && <span className="inv-meta inv-place">{place}</span>}
                                    </button>

                                    <div className="inv-actions">
                                        <div className="inv-opts" role="group" aria-label={`Your answer for ${ev.title}`}>
                                            {ANSWERS.map(a => (
                                                <button key={a.value} type="button" className={`inv-opt ${a.cls}`}
                                                    disabled={busy} aria-label={a.label} title={a.label}
                                                    onClick={() => answer(ev, a.value)}>
                                                    {a.icon}
                                                </button>
                                            ))}
                                        </div>
                                        <button type="button" className="inv-respond" aria-expanded={responding}
                                            aria-describedby={titleId} disabled={busy}
                                            onClick={() => setRespondingId(responding ? null : ev.id)}>
                                            Respond
                                        </button>
                                        <button type="button" className="inv-dismiss" disabled={busy}
                                            aria-describedby={titleId} onClick={() => dismiss(ev)}>
                                            Dismiss
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        </section>
    );
};

export default InvitationsPanel;
