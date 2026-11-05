import config from '../config/config';
import { eventUrl } from './shareLinks';

/**
 * Links that put PlanMate events into other calendar apps.
 * event: { id, title, description, start, end, location } (Dates or ISO strings).
 */

const API = () => `${config.baseUrl}/api`;

/** "20261107T180000Z": UTC, as Google Calendar expects. */
const utc = (date) => new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

const endOf = (event) => (event.end && new Date(event.end) > new Date(event.start)
    ? event.end : new Date(new Date(event.start).getTime() + 60 * 60 * 1000));

const placeOf = (location) => {
    if (!location) return '';
    if (typeof location === 'string') return location;
    const cityLine = [location.zipcode, location.city].filter(Boolean).join(' ');
    return [...new Set([location.name, location.street, cityLine, location.country].filter(Boolean))].join(', ');
};

const detailsOf = (event) => [event.description, `On PlanMate: ${eventUrl(event.id)}`].filter(Boolean).join('\n\n');

/** Opens Google Calendar with the event filled in, ready to save. */
export const googleCalendarUrl = (event) => {
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.title || 'PlanMate event',
        dates: `${utc(event.start)}/${utc(endOf(event))}`,
        details: detailsOf(event),
        location: placeOf(event.location),
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/** Opens Outlook on the web with the event filled in. */
export const outlookCalendarUrl = (event) => {
    const params = new URLSearchParams({
        path: '/calendar/action/compose',
        rru: 'addevent',
        subject: event.title || 'PlanMate event',
        startdt: new Date(event.start).toISOString(),
        enddt: new Date(endOf(event)).toISOString(),
        body: detailsOf(event),
        location: placeOf(event.location),
    });
    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
};

/** The event as an .ics file, which Apple Calendar, Samsung Calendar and other apps open. */
export const icsPath = (id) => `/v2/events/${encodeURIComponent(id)}/calendar.ics`;
export const icsUrl = (id) => `${API()}${icsPath(id)}`;

/** The whole PlanMate calendar as a subscription (Settings), and the links that add it to apps. */
export const feedUrl = (key) => `${API()}/v2/calendar/${encodeURIComponent(key)}.ics`;
export const webcalUrl = (key) => feedUrl(key).replace(/^https?:/, 'webcal:');
export const googleSubscribeUrl = (key) => `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl(key))}`;
export const outlookSubscribeUrl = (key) =>
    `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(feedUrl(key))}&name=PlanMate`;
