import { myResponse, eventStatus } from './calendarStatus';

test("the viewer's answer decides how an invitation looks", () => {
    const invite = { viewerRole: 'invited', responses: { 2: 'accepted', 3: 'declined' } };

    expect(myResponse(invite, 2)).toBe('accepted');
    expect(myResponse(invite, 3)).toBe('declined');
    expect(myResponse(invite, 4)).toBe('pending');
    expect(myResponse({ viewerRole: 'host' }, 2)).toBeNull();

    expect(eventStatus({ isOwn: true })).toBe('own');
    expect(eventStatus({ viewerRole: 'going' })).toBe('accepted'); // joined from the feed
    expect(eventStatus({ viewerRole: 'invited', myResponse: 'maybe' })).toBe('maybe');
    expect(eventStatus({ viewerRole: 'invited', myResponse: 'declined' })).toBe('declined');
    expect(eventStatus({ viewerRole: 'invited' })).toBe('pending');
});
