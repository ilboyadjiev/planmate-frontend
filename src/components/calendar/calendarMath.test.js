import {
    monthDays, weekDays, shiftDate, periodTitle, segmentOn, segmentTime, layoutLanes, agendaDays, newEventSlot,
} from './calendarMath';

const at = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min);
const ev = (id, start, end) => ({ id, title: id, start, end });

test('a month view covers whole weeks from Monday to Sunday', () => {
    const days = monthDays(at(2026, 11, 4));
    expect(days).toHaveLength(42);
    expect(days[0]).toEqual(at(2026, 10, 26));
    expect(days[41]).toEqual(at(2026, 12, 6));
    expect(weekDays(at(2026, 11, 4))[0]).toEqual(at(2026, 11, 2));
});

test('titles for every view', () => {
    expect(periodTitle('month', at(2026, 11, 4))).toBe('November 2026');
    expect(periodTitle('week', at(2026, 11, 4))).toBe('2 – 8 Nov 2026');
    expect(periodTitle('week', at(2026, 12, 1))).toBe('30 Nov – 6 Dec 2026');
    expect(periodTitle('week', at(2026, 12, 30))).toBe('28 Dec 2026 – 3 Jan 2027');
    expect(periodTitle('day', at(2026, 11, 4))).toBe('Wednesday, 4 November');
    expect(periodTitle('agenda', at(2026, 11, 4))).toBe('4 – 17 Nov 2026');
});

test('the arrows move by a month, week, day or two weeks', () => {
    expect(shiftDate('month', at(2026, 11, 4), 1)).toEqual(at(2026, 12, 1));
    expect(shiftDate('week', at(2026, 11, 4), -1)).toEqual(at(2026, 10, 28));
    expect(shiftDate('day', at(2026, 11, 4), 1)).toEqual(at(2026, 11, 5));
    expect(shiftDate('agenda', at(2026, 11, 4), 1)).toEqual(at(2026, 11, 18));
});

test('events running past midnight show on both days', () => {
    const party = ev('party', at(2026, 11, 6, 22), at(2026, 11, 7, 2));
    const friday = segmentOn(party, at(2026, 11, 6));
    const saturday = segmentOn(party, at(2026, 11, 7));
    expect(segmentTime(friday)).toBe('from 22:00');
    expect(segmentTime(saturday)).toBe('until 02:00');
    expect(segmentOn(party, at(2026, 11, 8))).toBeNull();
    expect(segmentTime(segmentOn(ev('x', at(2026, 11, 6, 18), at(2026, 11, 6, 19, 30)), at(2026, 11, 6)))).toBe('18:00 – 19:30');
});

test('overlapping events sit side by side', () => {
    const day = at(2026, 11, 4);
    const segments = [
        ev('a', at(2026, 11, 4, 9), at(2026, 11, 4, 11)),
        ev('b', at(2026, 11, 4, 10), at(2026, 11, 4, 12)),
        ev('c', at(2026, 11, 4, 13), at(2026, 11, 4, 14)),
    ].map(e => segmentOn(e, day));
    const placed = layoutLanes(segments);
    expect(placed.map(p => [p.event.id, p.lane, p.lanes])).toEqual([['a', 0, 2], ['b', 1, 2], ['c', 0, 1]]);
});

test('the agenda lists the next two weeks that have events', () => {
    const events = [ev('soon', at(2026, 11, 5, 9), at(2026, 11, 5, 10)), ev('later', at(2026, 11, 30, 9), at(2026, 11, 30, 10))];
    const days = agendaDays(events, at(2026, 11, 4));
    expect(days).toHaveLength(1);
    expect(days[0].segments[0].event.id).toBe('soon');
});

test('a new event from the month panel starts at the next full hour today, at 18:00 on other days', () => {
    const now = at(2026, 11, 4, 15, 20);
    expect(newEventSlot(at(2026, 11, 4), now).start).toEqual(at(2026, 11, 4, 16));
    expect(newEventSlot(at(2026, 11, 9), now)).toEqual({ start: at(2026, 11, 9, 18), end: at(2026, 11, 9, 19) });
});

test('weeks can start on Sunday (settings)', () => {
    const days = monthDays(at(2026, 11, 4), 'sunday');
    expect(days[0]).toEqual(at(2026, 11, 1)); // 1 November 2026 is a Sunday
    expect(days[0].getDay()).toBe(0);
    expect(days.length % 7).toBe(0);
    expect(days[days.length - 1].getDay()).toBe(6);
    expect(weekDays(at(2026, 11, 4), 'sunday')[0]).toEqual(at(2026, 11, 1));
    expect(weekDays(at(2026, 11, 1), 'sunday')[6]).toEqual(at(2026, 11, 7));
    expect(periodTitle('week', at(2026, 11, 4), 'sunday')).toBe('1 – 7 Nov 2026');
    // A Sunday belongs to the week it starts, not the one before
    expect(periodTitle('week', at(2026, 11, 8), 'sunday')).toBe('8 – 14 Nov 2026');
    expect(periodTitle('week', at(2026, 11, 8))).toBe('2 – 8 Nov 2026');
});

test('times can be shown in 12-hour format (settings)', () => {
    const evening = segmentOn(ev('a', at(2026, 11, 6, 18, 30), at(2026, 11, 6, 20)), at(2026, 11, 6));
    expect(segmentTime(evening, '12h')).toBe('6:30 PM – 8:00 PM');
    expect(segmentTime(evening)).toBe('18:30 – 20:00');
    const late = segmentOn(ev('b', at(2026, 11, 6, 22), at(2026, 11, 7, 2)), at(2026, 11, 7));
    expect(segmentTime(late, '12h')).toBe('until 2:00 AM');
});
