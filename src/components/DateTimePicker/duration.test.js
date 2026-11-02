import { formatDuration, describeDuration } from './duration';

const at = (iso) => new Date(`2026-11-15T${iso}:00Z`);
const MIN = 60 * 1000;

test.each([
    [10 * MIN, '10m'],
    [90 * MIN, '1h 30m'],
    [120 * MIN, '2h'],
    [(24 * 60 + 3 * 60 + 20) * MIN, '1d 3h'], // minutes are dropped once days appear
    [48 * 60 * MIN, '2d'],
])('formatDuration(%i) = %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
});

test('each duration range gets its own caption', () => {
    expect(describeDuration(at('10:00'), at('10:10'))).toMatch(/^10m, a quick lil' sesh/);
    expect(describeDuration(at('10:00'), at('10:45'))).toMatch(/^45m, lowkey a speedrun/);
    expect(describeDuration(at('10:00'), at('11:00'))).toMatch(/^1h of pure vibes/); // boundaries go to the longer range
    expect(describeDuration(at('10:00'), at('15:30'))).toMatch(/^5h 30m, that's a whole commitment/);
    expect(describeDuration(at('08:00'), at('20:00'))).toMatch(/^12h\?\? main character energy/);
    expect(describeDuration(at('10:00'), new Date('2026-11-18T10:00:00Z'))).toMatch(/^3d, it's giving side quest arc/);
});

test('no caption for an empty or backwards range (the form shows an error instead)', () => {
    expect(describeDuration(at('10:00'), at('10:00'))).toBeNull();
    expect(describeDuration(at('12:00'), at('10:00'))).toBeNull();
    expect(describeDuration('nonsense', at('10:00'))).toBeNull();
});
