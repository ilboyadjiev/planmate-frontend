import config from '../config/config';
import {
    feedUrl, googleCalendarUrl, googleSubscribeUrl, icsUrl, outlookCalendarUrl, outlookSubscribeUrl, webcalUrl,
} from './calendarLinks';

const jazz = {
    id: 'abc', title: 'Jazz night', description: 'Live jazz.',
    start: '2026-11-07T18:00:00Z', end: '2026-11-07T22:00:00Z',
    location: { name: 'Unterfahrt', street: 'Einsteinstraße 42', zipcode: '81675', city: 'Munich' },
};

test('Google Calendar opens with the event filled in, in UTC', () => {
    const url = new URL(googleCalendarUrl(jazz));
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('text')).toBe('Jazz night');
    expect(url.searchParams.get('dates')).toBe('20261107T180000Z/20261107T220000Z');
    expect(url.searchParams.get('location')).toBe('Unterfahrt, Einsteinstraße 42, 81675 Munich');
    expect(url.searchParams.get('details')).toContain('/events/abc');
});

test('events without an end last an hour', () => {
    const url = new URL(googleCalendarUrl({ ...jazz, end: null }));
    expect(url.searchParams.get('dates')).toBe('20261107T180000Z/20261107T190000Z');
});

test('Outlook gets the same event', () => {
    const url = new URL(outlookCalendarUrl(jazz));
    expect(url.hostname).toBe('outlook.live.com');
    expect(url.searchParams.get('subject')).toBe('Jazz night');
    expect(url.searchParams.get('startdt')).toBe('2026-11-07T18:00:00.000Z');
});

test('the .ics file and the subscription links', () => {
    expect(icsUrl('abc')).toBe(`${config.baseUrl}/api/v2/events/abc/calendar.ics`);
    expect(feedUrl('KEY123')).toBe(`${config.baseUrl}/api/v2/calendar/KEY123.ics`);
    expect(webcalUrl('KEY123')).toMatch(/^webcal:\/\/.*\/api\/v2\/calendar\/KEY123\.ics$/);
    expect(new URL(googleSubscribeUrl('KEY123')).searchParams.get('cid')).toBe(webcalUrl('KEY123'));
    expect(new URL(outlookSubscribeUrl('KEY123')).searchParams.get('url')).toBe(feedUrl('KEY123'));
});
