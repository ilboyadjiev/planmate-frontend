import React, { useState } from 'react';
import RangeCalendar from './RangeCalendar';
import { usePreferences } from '../../services/preferences';
import './DateRangeFilter.css';

const toKey = (d) => (d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    : '');
const fromKey = (s) => (s ? new Date(`${s}T00:00:00`) : null);
const atMidnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** The upcoming Saturday and Sunday, with the start never in the past. */
const thisWeekend = (today) => {
    const t = atMidnight(today);
    const dow = t.getDay(); // 0 Sun .. 6 Sat
    let sat = dow === 0 ? addDays(t, -1) : addDays(t, (6 - dow + 7) % 7);
    if (sat < t) sat = t; // on Sunday the Saturday is past; clamp to today
    return { from: sat, to: addDays(sat, 1) };
};

const short = (d) => d.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' });
const rangeLabel = (from, to) => {
    if (!from) return 'Have a date in mind?';
    if (!to || toKey(from) === toKey(to)) return short(from);
    return `${from.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })} – ${short(to)}`;
};

const CalendarIcon = () => (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
);
const Chevron = ({ open }) => (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
        <path d="M6 9l6 6 6-6" />
    </svg>
);
const CloseIcon = () => (
    <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
);

/**
 * The date filter for the feed and search. Collapsed it is a single line ("Have a date in mind?"); clicking it opens
 * a liquid-glass range calendar where you pick a start and end day. It reports the choice to its parent with
 * onChange(from, to) as "YYYY-MM-DD" strings (empty when cleared), applied on Done so the feed does not reload
 * mid-pick. `today` (optional) fixes "now" for the weekend preset and for disabling past days.
 */
const DateRangeFilter = ({ from, to, onChange, today = new Date() }) => {
    const { weekStart } = usePreferences();
    const [open, setOpen] = useState(false);
    const [draftFrom, setDraftFrom] = useState(null);
    const [draftTo, setDraftTo] = useState(null);
    const [month, setMonth] = useState(atMidnight(today));

    const appliedFrom = fromKey(from);
    const appliedTo = fromKey(to);
    const hasRange = !!from;

    const openPanel = () => {
        const f = fromKey(from);
        setDraftFrom(f);
        setDraftTo(fromKey(to));
        setMonth(f ? new Date(f.getFullYear(), f.getMonth(), 1) : new Date(today.getFullYear(), today.getMonth(), 1));
        setOpen(true);
    };

    const close = () => setOpen(false);

    // Apply a draft and leave the panel; a start without an end means that single day
    const apply = (f, t) => {
        onChange(toKey(f), toKey(t || f));
        setOpen(false);
    };

    const pick = (date) => {
        if (!draftFrom || draftTo) { setDraftFrom(date); setDraftTo(null); }
        else if (date < draftFrom) { setDraftFrom(date); }
        else { setDraftTo(date); }
    };

    const clearAll = () => { onChange('', ''); setOpen(false); };
    const weekend = () => { const w = thisWeekend(today); apply(w.from, w.to); };

    return (
        <div className="feed-dates">
            <div className="feed-dates-bar">
                <button type="button" className={`feed-dates-trigger${hasRange ? ' has-range' : ''}`}
                    aria-expanded={open} onClick={() => (open ? close() : openPanel())}>
                    <CalendarIcon />
                    <span className="feed-dates-label">{rangeLabel(appliedFrom, appliedTo)}</span>
                    <Chevron open={open} />
                </button>
                {hasRange && (
                    <button type="button" className="feed-dates-x" aria-label="Clear dates" onClick={clearAll}>
                        <CloseIcon />
                    </button>
                )}
            </div>

            {open && (
                <div className="feed-dates-panel">
                    <div className="feed-dates-presets">
                        <button type="button" className="feed-dates-preset" onClick={weekend}>This weekend</button>
                        <span className="feed-dates-pick-hint">
                            {!draftFrom ? 'Pick a start day' : !draftTo ? 'Now pick the end day' : 'Tap a day to change'}
                        </span>
                    </div>
                    <RangeCalendar
                        month={month}
                        from={draftFrom}
                        to={draftTo}
                        weekStart={weekStart}
                        minDate={atMidnight(today)}
                        onPick={pick}
                        onPrev={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                        onNext={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                    />
                    <div className="feed-dates-actions">
                        <button type="button" className="feed-dates-clear" onClick={clearAll}>Clear</button>
                        <button type="button" className="feed-dates-done" disabled={!draftFrom}
                            onClick={() => apply(draftFrom, draftTo)}>Done</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DateRangeFilter;
