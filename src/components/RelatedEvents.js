import React, { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import moment from 'moment';
import api from '../api/client';
import { formatPlace, formatWhen } from './feed/feedText';
import { usePreferences } from '../services/preferences';
import './RelatedEvents.css';

const EMPTY = { moreDates: [], similar: [] };
/** Dates shown at first, and how many more each "Show more" adds. */
export const DATES_SHOWN = 3;
const DATES_STEP = 10;

/**
 * What to show below an event (GET /v2/events/{id}/related): the show's other upcoming dates and similar events.
 * Empty while loading, when there is nothing related, and when it could not be loaded (it is only a suggestion).
 */
export const useRelatedEvents = (eventId) => {
    const [related, setRelated] = useState(EMPTY);
    useEffect(() => {
        setRelated(EMPTY);
        if (!eventId) return undefined;
        let gone = false;
        Promise.resolve(api.get(`/v2/events/${encodeURIComponent(eventId)}/related`))
            .then(res => {
                if (gone) return;
                const data = res?.data || {};
                const moreDates = Array.isArray(data.moreDates) ? data.moreDates : [];
                const similar = Array.isArray(data.similar) ? data.similar : [];
                // Nothing related: keep the same empty value, so nothing renders again
                setRelated(moreDates.length || similar.length ? { moreDates, similar } : EMPTY);
            })
            .catch(() => { if (!gone) setRelated(EMPTY); });
        return () => { gone = true; };
    }, [eventId]);
    return related;
};

export const hasRelated = (related) => related.moreDates.length > 0 || related.similar.length > 0;

const DateBlock = ({ start }) => (
    <span className="related-date-block" aria-hidden="true">
        <span className="related-date-month">{start.format('MMM').toUpperCase()}</span>
        <span className="related-date-day">{start.format('D')}</span>
    </span>
);

/**
 * "More dates" and "Similar events", each entry linking to that event's page. onNavigate runs when one is
 * chosen (e.g. to close the window the list is in).
 */
export const RelatedEventsList = ({ related, onNavigate, headingLevel = 3 }) => {
    const { timeFormat } = usePreferences();
    const Heading = `h${headingLevel}`;
    const uid = useId();
    // How many dates are open, for this list only: another event's list starts short again
    const [opened, setOpened] = useState({ list: related, shown: DATES_SHOWN });
    const datesShown = opened.list === related ? opened.shown : DATES_SHOWN;
    const showMore = () => setOpened({ list: related, shown: datesShown + DATES_STEP });
    if (!hasRelated(related)) return null;
    const hiddenDates = related.moreDates.length - datesShown;
    return (
        <div className="related-events">
            {related.moreDates.length > 0 && (
                <section aria-labelledby={`${uid}-dates`}>
                    <Heading id={`${uid}-dates`} className="related-heading">More dates</Heading>
                    <ul className="related-list">
                        {related.moreDates.slice(0, datesShown).map(e => {
                            const start = moment(e.startTime);
                            return (
                                <li key={e.id}>
                                    <Link to={`/events/${encodeURIComponent(e.id)}`} className="related-item" onClick={onNavigate}>
                                        <DateBlock start={start} />
                                        <span className="related-text">
                                            <span className="related-title">{start.format('dddd, D MMMM YYYY')}</span>
                                            <span className="related-meta">{formatWhen(e.startTime, e.endTime, timeFormat)}</span>
                                        </span>
                                        {e.going && <span className="pm-chip pm-chip-sm related-going">You're going</span>}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                    {hiddenDates > 0 && (
                        <button type="button" className="pm-glass-button related-show-more"
                            onClick={showMore}>
                            Show more
                        </button>
                    )}
                </section>
            )}
            {related.similar.length > 0 && (
                <section aria-labelledby={`${uid}-similar`}>
                    <Heading id={`${uid}-similar`} className="related-heading">Similar events</Heading>
                    <ul className="related-list">
                        {related.similar.map(e => {
                            const start = moment(e.startTime);
                            const place = formatPlace(e.location);
                            return (
                                <li key={e.id}>
                                    <Link to={`/events/${encodeURIComponent(e.id)}`} className="related-item" onClick={onNavigate}>
                                        <DateBlock start={start} />
                                        <span className="related-text">
                                            <span className="related-title">{e.title}</span>
                                            <span className="related-meta">
                                                {formatWhen(e.startTime, e.endTime, timeFormat)}{place && ` · ${place}`}
                                            </span>
                                            {e.moreDates > 0 && (
                                                <span className="related-meta">+{e.moreDates} more {e.moreDates === 1 ? 'date' : 'dates'}</span>
                                            )}
                                        </span>
                                        {e.going && <span className="pm-chip pm-chip-sm related-going">You're going</span>}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}
        </div>
    );
};

/** Loads and shows the related events of one event (see useRelatedEvents). */
const RelatedEvents = ({ eventId, onNavigate, headingLevel }) => {
    const related = useRelatedEvents(eventId);
    return <RelatedEventsList related={related} onNavigate={onNavigate} headingLevel={headingLevel} />;
};

export default RelatedEvents;
