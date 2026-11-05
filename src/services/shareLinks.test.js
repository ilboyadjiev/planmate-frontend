import { eventPath, loginPathTo, nextPathFrom } from './shareLinks';

test('event links and the way back after logging in', () => {
    expect(eventPath('65f1a2')).toBe('/events/65f1a2');
    expect(loginPathTo('/events/65f1a2')).toBe('/login?next=%2Fevents%2F65f1a2');
    expect(nextPathFrom('?next=%2Fevents%2F65f1a2')).toBe('/events/65f1a2');
    expect(nextPathFrom('')).toBe('/dashboard');
});

test('after logging in, people are only ever sent to a page of ours', () => {
    expect(nextPathFrom('?next=https%3A%2F%2Fevil.example')).toBe('/dashboard');
    expect(nextPathFrom('?next=%2F%2Fevil.example')).toBe('/dashboard');
    expect(nextPathFrom('?next=%2F%5Cevil.example')).toBe('/dashboard');
    expect(nextPathFrom('?next=javascript%3Aalert(1)')).toBe('/dashboard');
});
