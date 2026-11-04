import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import moment from 'moment';
import { eventStatus, STATUS_STYLES, STATUS_LEGEND } from '../calendarStatus';
import { formatPlace } from '../feed/feedText';
import {
    VIEWS, NAV_UNITS, AGENDA_DAYS, monthDays, weekDays, shiftDate, periodTitle, sameDay, segmentsOn, eventsOn,
    layoutLanes, segmentTime, agendaDays, newEventSlot,
} from './calendarMath';
import GlassPanel from '../GlassPanel';
import { formatHour, usePreferences } from '../../services/preferences';
import './GlassCalendar.css';

const STATUS_NAMES = Object.fromEntries(STATUS_LEGEND.map(({ status, label }) => [status, label]));
const MAX_DOTS = 3;

const Chevron = ({ dir }) => (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={dir < 0 ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
    </svg>
);

const PlusIcon = ({ size = 16 }) => (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M12 5v14M5 12h14" />
    </svg>
);

const placeOf = (event) => formatPlace(event.location) || '';
const describe = (event, time) => [event.title, time, STATUS_NAMES[eventStatus(event)]].filter(Boolean).join(', ');

/** The status label as a small pill, in the event's own colours. */
const StatusPill = ({ event }) => {
    const status = eventStatus(event);
    return <span className={`cal-pill event-status-${status}`} style={STATUS_STYLES[status]}>{STATUS_NAMES[status]}</span>;
};

/* ---------- Toolbar: title and quiet arrows on the left, Today, New event and the views on the right ---------- */

const Toolbar = ({ title, view, onView, onPrev, onNext, onToday, onCreateEvent }) => (
    <div className="cal-toolbar">
        <div className="cal-toolbar-period">
            <h2 className="cal-title" aria-live="polite">{title}</h2>
            <div className="cal-arrows">
                <button type="button" className="cal-arrow" onClick={onPrev} aria-label={`Previous ${NAV_UNITS[view]}`}><Chevron dir={-1} /></button>
                <button type="button" className="cal-arrow" onClick={onNext} aria-label={`Next ${NAV_UNITS[view]}`}><Chevron dir={1} /></button>
            </div>
        </div>
        <div className="cal-toolbar-actions">
            <button type="button" className="pm-glass-button" onClick={onToday}>Today</button>
            {onCreateEvent && (
                <button type="button" className="pm-glass-button cal-new-event" onClick={onCreateEvent}>
                    <PlusIcon /><span className="cal-new-event-label">New event</span>
                </button>
            )}
            <div className="cal-views" role="group" aria-label="Calendar view">
                {VIEWS.map(v => (
                    <button key={v.key} type="button" className="cal-view" aria-pressed={view === v.key} onClick={() => onView(v.key)}>
                        {v.label}
                    </button>
                ))}
            </div>
        </div>
    </div>
);

/* ---------- Month: day numbers with coloured dots, and the chosen day's events in a panel ---------- */

const MonthView = ({ date, events, now, selectedDay, onSelectDay, onSelectEvent, onSelectSlot }) => {
    const { weekStart, timeFormat } = usePreferences();
    const days = monthDays(date, weekStart);
    const selected = segmentsOn(events, selectedDay);
    const isToday = sameDay(selectedDay, now);
    const panelTitle = moment(selectedDay).format('D MMMM');

    return (
        <div className="cal-month">
            <div className="cal-month-main">
                <div className="cal-weekdays" aria-hidden="true">
                    {weekDays(date, weekStart).map(d => <span key={d.toISOString()}>{moment(d).format('ddd')}</span>)}
                </div>
                <div className="cal-month-grid">
                    {days.map(day => {
                        const dayEvents = eventsOn(events, day);
                        const classes = ['cal-day'];
                        if (!moment(day).isSame(date, 'month')) classes.push('is-outside');
                        if (sameDay(day, now)) classes.push('is-today');
                        if (sameDay(day, selectedDay)) classes.push('is-selected');
                        const count = dayEvents.length;
                        return (
                            <button key={day.toISOString()} type="button" className={classes.join(' ')}
                                aria-pressed={sameDay(day, selectedDay)}
                                aria-label={`${moment(day).format('dddd D MMMM')}${count ? `, ${count} ${count === 1 ? 'event' : 'events'}` : ''}`}
                                onClick={() => onSelectDay(day)}>
                                <span className="cal-day-num">{moment(day).date()}</span>
                                <span className="cal-dots" aria-hidden="true">
                                    {dayEvents.slice(0, MAX_DOTS).map(e => (
                                        <span key={e.id} className={`cal-dot event-status-${eventStatus(e)}`} />
                                    ))}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <aside className="cal-day-panel" aria-labelledby="cal-day-panel-title">
                <div className="cal-day-panel-head">
                    <div>
                        <span className="cal-kicker">{isToday ? 'Today' : moment(selectedDay).format('dddd')}</span>
                        <h3 id="cal-day-panel-title" className="cal-day-panel-title">{panelTitle}</h3>
                    </div>
                    {onSelectSlot && (
                        <button type="button" className="cal-arrow cal-panel-add" aria-label={`New event on ${panelTitle}`}
                            onClick={() => { const slot = newEventSlot(selectedDay, now); onSelectSlot(slot.start, slot.end); }}>
                            <PlusIcon size={18} />
                        </button>
                    )}
                </div>
                {selected.length === 0 && <p className="cal-muted">Nothing planned. A good day to plan something.</p>}
                <ul className="cal-panel-list">
                    {selected.map(segment => {
                        const { event } = segment;
                        const time = segmentTime(segment, timeFormat);
                        const [from, to] = time.includes('–') ? time.split(' – ') : [time, ''];
                        return (
                            <li key={event.id}>
                                <button type="button" className="cal-panel-event" onClick={() => onSelectEvent(event)}
                                    aria-label={describe(event, time)}>
                                    <span className="cal-panel-time"><strong>{from}</strong>{to && <span>{to}</span>}</span>
                                    <span className="cal-panel-text">
                                        <span className={`cal-event-name event-status-${eventStatus(event)}`}>{event.title}</span>
                                        {placeOf(event) && <span className="cal-muted-small">{placeOf(event)}</span>}
                                        <StatusPill event={event} />
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </aside>
        </div>
    );
};

/* ---------- Week and day: a scrolling timeline with events placed by time ---------- */

const TimeGrid = ({ days, events, now, onSelectEvent, onSelectSlot, onOpenDay, compact }) => {
    const { timeFormat } = usePreferences();
    const scrollRef = useRef(null);
    const firstDayKey = days[0].toDateString();

    // Start at the first event of the visible days (an hour before it), otherwise at 08:00
    useLayoutEffect(() => {
        const body = scrollRef.current;
        if (!body) return;
        const earliest = days.flatMap(day => segmentsOn(events, day)).reduce((min, s) => Math.min(min, s.startMin), Infinity);
        const hour = Number.isFinite(earliest) ? Math.max(0, Math.floor(earliest / 60) - 1) : 8;
        // A little above the hour, so its label is not cut off at the top
        body.scrollTop = Math.max(0, (body.scrollHeight / 24) * hour - 12);
        // Only when the period changes, not on every refresh of the events
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [firstDayKey, days.length]);

    const pickSlot = (day, e) => {
        if (!onSelectSlot) return;
        const rect = e.currentTarget.getBoundingClientRect();
        if (!rect.height) return;
        const minutes = Math.floor(((e.clientY - rect.top) / rect.height) * 48) * 30;
        const start = moment(day).startOf('day').add(minutes, 'minutes');
        onSelectSlot(start.toDate(), start.clone().add(1, 'hour').toDate());
    };

    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    return (
        <div className={`cal-timegrid${compact ? ' is-compact' : ''}`}>
            {days.length > 1 && (
                <div className="cal-col-heads">
                    <span className="cal-gutter" />
                    {days.map(day => (
                        <button key={day.toISOString()} type="button" className={`cal-col-head${sameDay(day, now) ? ' is-today' : ''}`}
                            onClick={() => onOpenDay(day)} aria-label={`Show ${moment(day).format('dddd D MMMM')}`}>
                            <span className="cal-col-dow">{moment(day).format(compact ? 'dd' : 'ddd')}</span>
                            <span className="cal-col-num">{moment(day).date()}</span>
                        </button>
                    ))}
                </div>
            )}
            <div className="cal-timegrid-body" ref={scrollRef}>
                <div className="cal-timegrid-inner">
                    <div className="cal-hours" aria-hidden="true">
                        {Array.from({ length: 23 }, (_, i) => i + 1).map(h => (
                            <span key={h} className="cal-hour" style={{ top: `${(h / 24) * 100}%` }}>{formatHour(h, timeFormat)}</span>
                        ))}
                    </div>
                    <div className="cal-columns">
                        {days.map(day => (
                            <div key={day.toISOString()} className={`cal-column${sameDay(day, now) && days.length > 1 ? ' is-today' : ''}`}>
                                {/* Click an empty spot to plan something then (the New event button does the same by keyboard) */}
                                <div className="cal-slot-layer" aria-hidden="true" onClick={e => pickSlot(day, e)} />
                                {layoutLanes(segmentsOn(events, day)).map(segment => {
                                    const { event } = segment;
                                    const status = eventStatus(event);
                                    const time = segmentTime(segment, timeFormat);
                                    return (
                                        <button key={event.id} type="button" className={`cal-event event-status-${status}`}
                                            style={{
                                                ...STATUS_STYLES[status],
                                                top: `${(segment.startMin / 1440) * 100}%`,
                                                height: `${((segment.endMin - segment.startMin) / 1440) * 100}%`,
                                                left: `calc(${(segment.lane / segment.lanes) * 100}% + 2px)`,
                                                width: `calc(${100 / segment.lanes}% - 4px)`,
                                            }}
                                            onClick={() => onSelectEvent(event)} aria-label={describe(event, time)} title={describe(event, time)}>
                                            <span className="cal-event-title">{event.title}</span>
                                            <span className="cal-event-time">{time}</span>
                                            {days.length === 1 && placeOf(event) && <span className="cal-event-time">{placeOf(event)}</span>}
                                        </button>
                                    );
                                })}
                                {sameDay(day, now) && (
                                    <div className="cal-now" style={{ top: `${(nowMinutes / 1440) * 100}%` }} aria-hidden="true" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ---------- Agenda: the next two weeks, day by day ---------- */

const AgendaView = ({ date, events, now, onSelectEvent }) => {
    const { timeFormat } = usePreferences();
    const days = agendaDays(events, date);
    if (days.length === 0) return <p className="cal-muted cal-agenda-empty">Nothing planned in these {AGENDA_DAYS / 7} weeks.</p>;
    return (
        <ol className="cal-agenda">
            {days.map(({ day, segments }) => (
                <li key={day.toISOString()} className="cal-agenda-day">
                    <div className={`cal-agenda-date${sameDay(day, now) ? ' is-today' : ''}`}>
                        <span className="cal-kicker">{sameDay(day, now) ? 'Today' : moment(day).format('ddd · MMM')}</span>
                        <span className="cal-agenda-num">{moment(day).date()}</span>
                    </div>
                    <ul className="cal-agenda-events">
                        {segments.map(segment => {
                            const { event } = segment;
                            const time = segmentTime(segment, timeFormat);
                            return (
                                <li key={event.id}>
                                    <button type="button" className="cal-agenda-event" onClick={() => onSelectEvent(event)} aria-label={describe(event, time)}>
                                        <span className="cal-agenda-time">{time}</span>
                                        <span className={`cal-marker event-status-${eventStatus(event)}`} aria-hidden="true" />
                                        <span className="cal-panel-text">
                                            <span className={`cal-event-name event-status-${eventStatus(event)}`}>{event.title}</span>
                                            {placeOf(event) && <span className="cal-muted-small">{placeOf(event)}</span>}
                                        </span>
                                        <StatusPill event={event} />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </li>
            ))}
        </ol>
    );
};

/**
 * PlanMate's calendar (see the "Calendar Redesign" canvas, A + C in liquid glass): a frosted panel over soft colour
 * glows, with Month (dots and a day panel), Week, Day and Agenda views.
 *
 * date / onNavigate(date): the visible period (controlled, the parent loads events for it).
 * onSelectEvent(event): an event was clicked. onSelectSlot(start, end): plan something at that time.
 * onCreateEvent(): the New event button (left out on phones, which have a floating button).
 */
const GlassCalendar = ({
    events, date, onNavigate, defaultView = 'month', onSelectEvent, onSelectSlot, onCreateEvent, compact = false, now: fixedNow,
}) => {
    const { weekStart } = usePreferences();
    const [view, setView] = useState(defaultView);
    const [selectedDay, setSelectedDay] = useState(date);
    const [clock, setClock] = useState(() => new Date());
    const now = fixedNow || clock;

    // Keep "now" (the orange line, today's highlight) current
    useEffect(() => {
        if (fixedNow) return undefined;
        const timer = setInterval(() => setClock(new Date()), 60 * 1000);
        return () => clearInterval(timer);
    }, [fixedNow]);

    const navigate = (next) => {
        onNavigate(next);
        // In the month view the panel follows: today if it is in the new month, else the 1st
        setSelectedDay(moment(now).isSame(next, 'month') && view === 'month' ? now : next);
    };

    const goToday = () => {
        onNavigate(now);
        setSelectedDay(now);
    };

    const openDay = (day) => {
        setView('day');
        onNavigate(day);
        setSelectedDay(day);
    };

    let body;
    if (view === 'month') {
        body = (
            <MonthView date={date} events={events} now={now} selectedDay={selectedDay} onSelectDay={setSelectedDay}
                onSelectEvent={onSelectEvent} onSelectSlot={onSelectSlot} />
        );
    } else if (view === 'agenda') {
        body = <AgendaView date={date} events={events} now={now} onSelectEvent={onSelectEvent} />;
    } else {
        body = (
            <TimeGrid days={view === 'week' ? weekDays(date, weekStart) : [date]} events={events} now={now} compact={compact}
                onSelectEvent={onSelectEvent} onSelectSlot={onSelectSlot} onOpenDay={openDay} />
        );
    }

    return (
        <GlassPanel shellClassName="cal-shell" className="cal-panel" aria-label="Calendar">
                <Toolbar title={periodTitle(view, date, weekStart)} view={view}
                    onView={next => { setView(next); if (next === 'month') setSelectedDay(date); }}
                    onPrev={() => navigate(shiftDate(view, date, -1))} onNext={() => navigate(shiftDate(view, date, 1))}
                    onToday={goToday} onCreateEvent={onCreateEvent} />
                {body}
        </GlassPanel>
    );
};

export default GlassCalendar;
