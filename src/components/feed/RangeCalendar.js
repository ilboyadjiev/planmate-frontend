import React from 'react';

// Indexed by JS getDay() (Sun = 0 … Sat = 6), so the header can start on any weekday
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const firstCol = (weekStart) => (weekStart === 'sunday' ? 0 : 1);

const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const atMidnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const monthLabel = (d) => d.toLocaleDateString('en', { month: 'long', year: 'numeric' });

const Arrow = ({ dir }) => (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={dir < 0 ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
    </svg>
);

/**
 * One month, selecting a date range on a single calendar: click a start day, then an end day. from / to are Date
 * objects (or null); onPick(date) reports a clicked day; onPrev / onNext change the shown month. Days before
 * minDate are disabled (the feed only holds upcoming events).
 */
const RangeCalendar = ({ month, from, to, onPick, onPrev, onNext, minDate, weekStart = 'monday' }) => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const start = firstCol(weekStart);
    const weekdays = Array.from({ length: 7 }, (_, i) => DAY_NAMES[(start + i) % 7]);
    const lead = (new Date(year, m, 1).getDay() - start + 7) % 7; // blanks before the 1st
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const min = minDate ? atMidnight(minDate) : null;
    const canPrev = !min || new Date(year, m, 1) > new Date(min.getFullYear(), min.getMonth(), 1);

    const cells = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, m, d));

    const dayClass = (date) => {
        const classes = ['rc-day'];
        const isFrom = sameDay(date, from);
        const isTo = sameDay(date, to);
        if (isFrom || isTo) classes.push('is-end');
        else if (from && to && date > from && date < to) classes.push('is-between');
        if (isFrom && to && !sameDay(from, to)) classes.push('is-start-edge');
        if (isTo && from && !sameDay(from, to)) classes.push('is-end-edge');
        return classes.join(' ');
    };

    return (
        <div className="rc">
            <div className="rc-head">
                <button type="button" className="rc-nav" onClick={onPrev} disabled={!canPrev} aria-label="Previous month">
                    <Arrow dir={-1} />
                </button>
                <span className="rc-month" aria-live="polite">{monthLabel(month)}</span>
                <button type="button" className="rc-nav" onClick={onNext} aria-label="Next month"><Arrow dir={1} /></button>
            </div>
            <div className="rc-weekdays" aria-hidden="true">
                {weekdays.map((w, i) => <span key={`${w}-${i}`}>{w}</span>)}
            </div>
            <div className="rc-grid">
                {cells.map((date, i) => (date === null ? (
                    <span key={`blank-${i}`} className="rc-blank" />
                ) : (
                    <button
                        key={date.toISOString()}
                        type="button"
                        className={dayClass(date)}
                        disabled={min && date < min}
                        aria-pressed={sameDay(date, from) || sameDay(date, to)}
                        aria-label={`${date.getDate()} ${date.toLocaleDateString('en', { month: 'long' })} ${date.getFullYear()}`}
                        onClick={() => onPick(date)}>
                        {date.getDate()}
                    </button>
                )))}
            </div>
        </div>
    );
};

export default RangeCalendar;
