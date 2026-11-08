import { dateWindowParams } from './dateFilter';

test('empty inputs produce no params', () => {
    expect(dateWindowParams('', '')).toEqual({});
});

test('a single from-day sends the start of that local day as "from", open-ended', () => {
    const params = dateWindowParams('2026-11-20', '');
    expect(Object.keys(params)).toEqual(['from']);
    // local midnight of Nov 20 as an instant
    expect(params.from).toBe(new Date('2026-11-20T00:00:00').toISOString());
});

test('a range sends the start of the from-day and the end of the to-day', () => {
    const params = dateWindowParams('2026-11-20', '2026-11-22');
    expect(params.from).toBe(new Date('2026-11-20T00:00:00').toISOString());
    expect(params.to).toBe(new Date('2026-11-22T23:59:59.999').toISOString());
});

test('garbage dates are ignored', () => {
    expect(dateWindowParams('not-a-date', '')).toEqual({});
});
