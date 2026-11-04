import moment from 'moment';

/** Date helpers for the calendar views. Weeks start on Monday; times are the browser's local time. */

export const VIEWS = [
    { key: 'month', label: 'Month' },
    { key: 'week', label: 'Week' },
    { key: 'day', label: 'Day' },
    { key: 'agenda', label: 'Agenda' },
];

export const AGENDA_DAYS = 14;
const DAY_MINUTES = 24 * 60;

export const startOfDay = (date) => moment(date).startOf('day').toDate();
export const sameDay = (a, b) => moment(a).isSame(b, 'day');
export const startOfWeek = (date) => moment(date).startOf('isoWeek').toDate();

/** The days shown in a month view: whole weeks, Monday to Sunday, covering the month. */
export const monthDays = (date) => {
    const first = moment(date).startOf('month');
    const last = moment(date).endOf('month');
    const days = [];
    for (let day = first.clone().startOf('isoWeek'); day.isBefore(last) || day.isoWeekday() !== 1; day.add(1, 'day')) {
        days.push(day.toDate());
    }
    return days;
};

export const weekDays = (date) => {
    const monday = moment(date).startOf('isoWeek');
    return [0, 1, 2, 3, 4, 5, 6].map(i => monday.clone().add(i, 'day').toDate());
};

/** Moves the visible period by one step (dir = -1 or 1). */
export const shiftDate = (view, date, dir) => {
    const m = moment(date);
    if (view === 'month') return m.add(dir, 'month').startOf('month').toDate();
    if (view === 'week') return m.add(dir, 'week').toDate();
    if (view === 'day') return m.add(dir, 'day').toDate();
    return m.add(dir * AGENDA_DAYS, 'day').toDate();
};

const range = (from, to) => {
    if (from.year() !== to.year()) return `${from.format('D MMM YYYY')} – ${to.format('D MMM YYYY')}`;
    if (from.month() !== to.month()) return `${from.format('D MMM')} – ${to.format('D MMM YYYY')}`;
    return `${from.format('D')} – ${to.format('D MMM YYYY')}`;
};

/** The toolbar title: "November 2026", "2 – 8 Nov 2026", "Wednesday, 4 November", "4 – 17 Nov 2026". */
export const periodTitle = (view, date) => {
    const m = moment(date);
    if (view === 'month') return m.format('MMMM YYYY');
    if (view === 'week') return range(m.clone().startOf('isoWeek'), m.clone().endOf('isoWeek'));
    if (view === 'day') return m.format('dddd, D MMMM');
    return range(m, m.clone().add(AGENDA_DAYS - 1, 'day'));
};

export const NAV_UNITS = { month: 'month', week: 'week', day: 'day', agenda: 'two weeks' };

/**
 * The part of an event that falls on one day, in minutes from midnight (0 to 1440). Events running past midnight
 * show on each day they touch. Null when the event is not on that day.
 */
export const segmentOn = (event, day) => {
    if (!event.start) return null;
    const dayStart = moment(day).startOf('day');
    const dayEnd = dayStart.clone().add(1, 'day');
    const start = moment(event.start);
    const end = event.end && moment(event.end).isAfter(start) ? moment(event.end) : start.clone().add(30, 'minutes');
    if (!start.isBefore(dayEnd) || !end.isAfter(dayStart)) return null;
    return {
        event,
        startMin: Math.max(0, start.diff(dayStart, 'minutes')),
        endMin: Math.min(DAY_MINUTES, end.diff(dayStart, 'minutes')),
    };
};

/** An event's segments on one day, earliest first. */
export const segmentsOn = (events, day) => events
    .map(event => segmentOn(event, day))
    .filter(Boolean)
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

export const eventsOn = (events, day) => segmentsOn(events, day).map(s => s.event);

/**
 * Side by side placement for overlapping events in a day column: each segment gets a lane and the number of
 * lanes in its group of overlapping events, so it can take 1/lanes of the width.
 */
export const layoutLanes = (segments) => {
    const placed = [];
    let group = [];
    let groupEnd = -1;
    const closeGroup = () => {
        const lanes = group.reduce((max, s) => Math.max(max, s.lane + 1), 1);
        group.forEach(s => { s.lanes = lanes; });
        group = [];
    };
    segments.forEach(segment => {
        if (segment.startMin >= groupEnd && group.length) closeGroup();
        const laneEnds = [];
        group.forEach(s => { laneEnds[s.lane] = Math.max(laneEnds[s.lane] || 0, s.endMin); });
        let lane = 0;
        while (laneEnds[lane] !== undefined && laneEnds[lane] > segment.startMin) lane += 1;
        const item = { ...segment, lane, lanes: 1 };
        group.push(item);
        placed.push(item);
        groupEnd = Math.max(groupEnd, segment.endMin);
    });
    if (group.length) closeGroup();
    return placed;
};

const hhmm = (minutes) => moment().startOf('day').add(minutes, 'minutes').format('HH:mm');

/** "18:00 – 19:30", or "from 22:00" / "until 02:00" / "All day" for events crossing midnight. */
export const segmentTime = ({ startMin, endMin }) => {
    if (startMin === 0 && endMin === DAY_MINUTES) return 'All day';
    if (endMin === DAY_MINUTES) return `from ${hhmm(startMin)}`;
    if (startMin === 0) return `until ${hhmm(endMin)}`;
    return `${hhmm(startMin)} – ${hhmm(endMin)}`;
};

/** Agenda: the days from date on (AGENDA_DAYS of them) that have events, each with its segments. */
export const agendaDays = (events, date) => {
    const days = [];
    for (let i = 0; i < AGENDA_DAYS; i += 1) {
        const day = moment(date).startOf('day').add(i, 'day').toDate();
        const segments = segmentsOn(events, day);
        if (segments.length) days.push({ day, segments });
    }
    return days;
};

/**
 * A sensible new event for a day picked in the month view: the next full hour today, 18:00 on other days.
 * One hour long.
 */
export const newEventSlot = (day, now = new Date()) => {
    const start = sameDay(day, now)
        ? moment(now).add(1, 'hour').startOf('hour')
        : moment(day).startOf('day').hour(18);
    return { start: start.toDate(), end: start.clone().add(1, 'hour').toDate() };
};
