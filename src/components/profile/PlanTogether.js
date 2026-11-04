import React, { useCallback, useEffect, useState } from 'react';
import moment from 'moment';
import api from '../../api/client';
import { formatTime, usePreferences } from '../../services/preferences';

const LENGTHS = [
    { minutes: 30, label: '30 min' },
    { minutes: 60, label: '1 hour' },
    { minutes: 120, label: '2 hours' },
    { minutes: 180, label: '3 hours' },
];
const DAYS = 7;

const timeZone = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin';
    } catch (e) {
        return 'Europe/Berlin';
    }
};

export const dayLabel = (date, today = moment()) => {
    const day = moment(date, 'YYYY-MM-DD');
    if (day.isSame(today, 'day')) return 'Today';
    if (day.isSame(moment(today).add(1, 'day'), 'day')) return 'Tomorrow';
    return day.format('ddd D MMM');
};

/**
 * "When suits you both?": the next days with times when you and a friend are both free, in the morning,
 * afternoon and evening. The server only says free or busy, never what anyone is doing.
 *
 * onPick({ start, end }) when a time is chosen; onPickOwnTime(minutes) to choose a time yourself.
 */
const PlanTogether = ({ person, onPick, onPickOwnTime }) => {
    const { timeFormat } = usePreferences();
    const [minutes, setMinutes] = useState(60);
    const [fromDay, setFromDay] = useState(() => moment().format('YYYY-MM-DD'));
    const [days, setDays] = useState([]);
    const [status, setStatus] = useState('loading'); // loading | ready | error
    const name = person.firstName || person.username;

    const load = useCallback(async () => {
        setStatus('loading');
        try {
            const res = await api.get(`/v1/people/${person.id}/free-slots`, {
                params: { from: fromDay, days: DAYS, minutes, tz: timeZone() },
            });
            setDays(res.data.days || []);
            setStatus('ready');
        } catch (err) {
            setStatus('error');
        }
    }, [person.id, fromDay, minutes]);

    useEffect(() => { load(); }, [load]);

    const isThisWeek = fromDay === moment().format('YYYY-MM-DD');
    const anySlot = days.some(d => d.slots.length > 0);
    const shiftWeek = (weeks) => setFromDay(prev => moment(prev, 'YYYY-MM-DD').add(weeks * DAYS, 'days').format('YYYY-MM-DD'));

    return (
        <div className="plan-together">
            <h2 className="plan-title">When suits you and {name}?</h2>
            <p className="plan-subtitle">
                These are times you're both free. PlanMate only checks whether you're free, never what you're doing.
            </p>

            <div className="plan-lengths" role="group" aria-label="How long">
                <span className="plan-lengths-label">How long?</span>
                {LENGTHS.map(l => (
                    <button key={l.minutes} type="button" className="feed-chip" aria-pressed={minutes === l.minutes}
                        onClick={() => setMinutes(l.minutes)}>
                        {l.label}
                    </button>
                ))}
            </div>

            <div className="plan-days" aria-busy={status === 'loading'} aria-live="polite">
                {status === 'loading' && <p className="group-muted">Finding times that suit you both…</p>}
                {status === 'error' && (
                    <p className="field-error" role="alert">
                        Free times could not be loaded. <button type="button" className="group-link" onClick={load}>Try again</button>
                    </p>
                )}
                {status === 'ready' && days.map(day => (
                    <div key={day.date} className="plan-day">
                        <span className="plan-day-label">{dayLabel(day.date)}</span>
                        {day.slots.length === 0 ? (
                            <span className="plan-day-none">No shared free time</span>
                        ) : (
                            <div className="plan-slots">
                                {day.slots.map(slot => (
                                    <button key={slot.start} type="button" className="plan-slot"
                                        onClick={() => onPick({ start: new Date(slot.start), end: new Date(slot.end) })}
                                        aria-label={`${dayLabel(day.date)}, ${slot.part.toLowerCase()}: ${formatTime(slot.start, timeFormat)} to ${formatTime(slot.end, timeFormat)}`}>
                                        <span className="plan-slot-part">{slot.part}</span>
                                        <span className="plan-slot-time">{formatTime(slot.start, timeFormat)}–{formatTime(slot.end, timeFormat)}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                {status === 'ready' && !anySlot && (
                    <p className="plan-empty">You and {name} have no shared free time these days. Try another week or a shorter length.</p>
                )}
            </div>

            <div className="plan-footer">
                <div className="plan-weeks">
                    <button type="button" className="group-button" disabled={isThisWeek} onClick={() => shiftWeek(-1)}>← Earlier</button>
                    <button type="button" className="group-button" onClick={() => shiftWeek(1)}>Later →</button>
                </div>
                <button type="button" className="group-link" onClick={() => onPickOwnTime(minutes)}>
                    Choose a time myself
                </button>
            </div>
        </div>
    );
};

export default PlanTogether;
