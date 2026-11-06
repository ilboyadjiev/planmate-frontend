import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import DiscoveryFeed, { topicChips } from './DiscoveryFeed';
import { AuthContext } from '../context/AuthContext';
import api from '../api/client';
import { resetPreferences, setPreferences } from '../services/preferences';

jest.mock('../api/client', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }));

const card = (id, extra = {}) => ({
    id, title: `Event ${id}`, startTime: '2026-11-06T18:00:00Z', endTime: '2026-11-06T20:00:00Z',
    host: { name: 'Maya' }, attendeeCount: 0, friendsGoing: [], going: false, hosting: false, ...extra,
});

const renderFeed = (props = {}, url = '/dashboard') => render(
    <MemoryRouter initialEntries={[url]}>
        <AuthContext.Provider value={{ user: { id: 1, email: 'alice@example.com' } }}>
            <DiscoveryFeed onAttendanceChange={jest.fn()} onError={jest.fn()} {...props} />
        </AuthContext.Provider>
    </MemoryRouter>
);

// The feed asks for the user's friend groups as well; tests set up the feed responses in order
let feedResponses = [];
let groupsResponse = [];
const feedCalls = () => api.get.mock.calls.filter(([url]) => url === '/v2/events/feed');

beforeEach(() => {
    jest.resetAllMocks();
    resetPreferences();
    feedResponses = [];
    groupsResponse = [];
    api.get.mockImplementation(url => {
        if (url === '/v1/groups') return Promise.resolve({ data: groupsResponse });
        const next = feedResponses.length > 1 ? feedResponses.shift() : feedResponses[0];
        return next instanceof Error ? Promise.reject(next) : Promise.resolve(next || { data: { events: [], hasMore: false } });
    });
});

test('starts on "For you" and loads more cards on demand', async () => {
    feedResponses = [
        { data: { events: [card('a'), card('b')], hasMore: true } },
        { data: { events: [card('b'), card('c')], hasMore: false } },
    ];
    renderFeed();

    expect(await screen.findByText('Event a')).toBeInTheDocument();
    expect(feedCalls()[0]).toEqual(['/v2/events/feed', { params: { page: 0, size: 5 } }]);
    expect(screen.getByRole('button', { name: 'For you' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Show more' }));

    expect(await screen.findByText('Event c')).toBeInTheDocument();
    expect(screen.getAllByText('Event b')).toHaveLength(1); // no duplicates when the ranking shifts
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
});

test('nobody gets topic chips they did not choose', async () => {
    renderFeed();
    await screen.findByText('No upcoming public events yet.');
    const chips = within(screen.getByRole('group', { name: 'Filter events' })).getAllByRole('button').map(b => b.textContent);
    expect(chips).toEqual(['For you', 'Around me']);
});

test('a tag chip reloads the feed for that tag', async () => {
    setPreferences({ likedTags: ['#food'] });
    renderFeed();
    await screen.findByText('No upcoming public events yet.');

    fireEvent.click(screen.getByRole('button', { name: '#food' }));

    expect(await screen.findByText('No upcoming events for #food yet.')).toBeInTheDocument();
    expect(feedCalls().pop()).toEqual(['/v2/events/feed', { params: { tag: '#food', page: 0, size: 5 } }]);
});

test("joining updates the card in place and tells the dashboard", async () => {
    const onAttendanceChange = jest.fn();
    feedResponses = [{ data: { events: [card('a', { attendeeCount: 3 })], hasMore: false } }];
    const joined = card('a', { attendeeCount: 4, going: true });
    api.post.mockResolvedValue({ data: joined });
    renderFeed({ onAttendanceChange });

    fireEvent.click(await screen.findByRole('button', { name: /i'm going/i }));

    expect(await screen.findByRole('button', { name: /going.*leave/i })).toBeInTheDocument();
    expect(screen.getByText("You're going")).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/v2/events/a/attendance');
    expect(onAttendanceChange).toHaveBeenCalledWith(joined);
});

test('a failed join is reported and the card stays as it was', async () => {
    const onError = jest.fn();
    feedResponses = [{ data: { events: [card('a')], hasMore: false } }];
    api.post.mockRejectedValue({ response: { status: 500 } });
    renderFeed({ onError });

    fireEvent.click(await screen.findByRole('button', { name: /i'm going/i }));

    await waitFor(() => expect(onError).toHaveBeenCalledWith('Could not join the event. Please try again.'));
    expect(screen.getByRole('button', { name: /i'm going/i })).toBeEnabled();
});

describe('friend groups in the feed', () => {
    const boardGames = { id: 7, name: 'Board games', members: [] };
    const invite = card('dixit', { title: 'Dixit', invited: true, myResponse: 'pending', attendeeCount: 1 });

    test('each group gets a chip that shows only that group\'s events', async () => {
        groupsResponse = [boardGames, { id: 8, name: 'Trip to Italy', members: [] }];
        renderFeed();

        fireEvent.click(await screen.findByRole('button', { name: 'Group: Board games' }));

        await waitFor(() => expect(feedCalls().pop()).toEqual(['/v2/events/feed', { params: { group: 7, page: 0, size: 5 } }]));
        expect(screen.getByRole('button', { name: 'Group: Trip to Italy' })).toBeInTheDocument();
        expect(await screen.findByText(/No upcoming events for Board games yet/)).toBeInTheDocument();
    });

    test('invitations are answered right on the card', async () => {
        const onRespond = jest.fn();
        groupsResponse = [boardGames];
        feedResponses = [{ data: { events: [invite], hasMore: false } }];
        api.put.mockResolvedValue({ data: {} });
        renderFeed({ onRespond });

        expect(await screen.findByText("You're invited. Will you be there?")).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /i'm going/i })).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Going' }));

        await waitFor(() => expect(api.put).toHaveBeenCalledWith('/v2/events/dixit/response', { response: 'accepted' }));
        await waitFor(() => expect(screen.getByRole('button', { name: 'Going' })).toHaveAttribute('aria-pressed', 'true'));
        expect(screen.queryByText("You're invited. Will you be there?")).not.toBeInTheDocument();
        expect(screen.getByText('2 going in total')).toBeInTheDocument();
        expect(onRespond).toHaveBeenCalledWith(expect.objectContaining({ id: 'dixit', myResponse: 'accepted' }), 'accepted');
    });

    test('changing an answer from going to maybe updates the count', async () => {
        groupsResponse = [boardGames];
        feedResponses = [{ data: { events: [{ ...invite, myResponse: 'accepted', going: true, attendeeCount: 2 }], hasMore: false } }];
        api.put.mockResolvedValue({ data: {} });
        renderFeed();

        fireEvent.click(await screen.findByRole('button', { name: 'Maybe' }));

        await waitFor(() => expect(screen.getByRole('button', { name: 'Maybe' })).toHaveAttribute('aria-pressed', 'true'));
        expect(screen.getByText('1 person going')).toBeInTheDocument();
    });
});

describe('Around me', () => {
    test('shows public events in the profile city', async () => {
        feedResponses = [
            { data: { events: [], hasMore: false } },
            { data: { events: [card('beer', { title: 'Beer garden' })], hasMore: false, city: 'Munich' } },
        ];
        renderFeed();

        fireEvent.click(await screen.findByRole('button', { name: 'Around me' }));

        expect(await screen.findByText('Beer garden')).toBeInTheDocument();
        expect(screen.getByText('Public events in Munich')).toBeInTheDocument();
        expect(feedCalls().pop()).toEqual(['/v2/events/feed', { params: { nearby: true, page: 0, size: 5 } }]);
    });

    test('asks for a home city in Settings when there is none', async () => {
        feedResponses = [
            { data: { events: [], hasMore: false } },
            { data: { events: [], hasMore: false, city: null } },
        ];
        renderFeed();

        fireEvent.click(await screen.findByRole('button', { name: 'Around me' }));

        expect(await screen.findByText(/turns on once you set your home city/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings#discover');
    });
});

describe('opening a card', () => {
    const serverEvent = (extra) => ({
        id: 'a', title: 'Event a', startTime: '2026-11-06T18:00:00Z', endTime: '2026-11-06T20:00:00Z',
        description: 'Bring snacks', hostName: 'Maya', participantIds: [], groupIds: [], tags: [], ...extra,
    });

    const routeGets = (eventDoc) => api.get.mockImplementation(url => {
        if (url === '/v1/groups') return Promise.resolve({ data: [] });
        if (url === '/v2/events/a') return Promise.resolve({ data: eventDoc });
        if (url.startsWith('/v1/users/')) return Promise.resolve({ data: [] });
        return Promise.resolve({ data: { events: [card('a')], hasMore: false } });
    });

    test("other people's public events open read-only, like in the calendar", async () => {
        routeGets(serverEvent({ viewerRole: null }));
        renderFeed();

        fireEvent.click(await screen.findByRole('button', { name: 'Event a' }));

        const dialog = await screen.findByRole('dialog');
        expect(dialog).toHaveTextContent('Only the organizer can make changes');
        // Not answered yet: Going, Maybe and Can't go are right there, none chosen
        expect(within(dialog).getByRole('button', { name: 'Maybe' })).toHaveAttribute('aria-pressed', 'false');
        expect(within(dialog).getByText('Bring snacks')).toBeInTheDocument();
        expect(within(dialog).getByText('Maya')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    });

    test('your own events open for editing', async () => {
        routeGets(serverEvent({ viewerRole: 'host', creatorId: 'alice@example.com' }));
        renderFeed();

        fireEvent.click(await screen.findByRole('button', { name: 'Event a' }));

        expect(await screen.findByRole('button', { name: 'Save' })).toBeInTheDocument();
        expect(screen.getByDisplayValue('Event a')).toBeInTheDocument();
    });

    test('invitations can be answered in the details, and the card follows', async () => {
        const onRespond = jest.fn();
        api.get.mockImplementation(url => {
            if (url === '/v1/groups') return Promise.resolve({ data: [] });
            if (url === '/v2/events/a') return Promise.resolve({ data: serverEvent({ viewerRole: 'invited', participantIds: ['1'], responses: {} }) });
            if (url.startsWith('/v1/users/')) return Promise.resolve({ data: [] });
            return Promise.resolve({ data: { events: [card('a', { invited: true, myResponse: 'pending' })], hasMore: false } });
        });
        api.put.mockResolvedValue({ data: { responses: { 1: 'maybe' } } });
        renderFeed({ onRespond });

        fireEvent.click(await screen.findByRole('button', { name: 'Event a' }));
        const dialog = await screen.findByRole('dialog');
        fireEvent.click(within(dialog).getByRole('button', { name: 'Maybe' }));

        await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Maybe' })).toHaveAttribute('aria-pressed', 'true'));
        expect(api.put).toHaveBeenCalledWith('/v2/events/a/response', { response: 'maybe' });
        expect(onRespond).toHaveBeenCalledWith(expect.objectContaining({ id: 'a', myResponse: 'maybe' }), 'maybe');
    });
});

test('tag chips: only your topics, plus the tag you are looking at', () => {
    expect(topicChips()).toEqual([]);
    expect(topicChips(['#jazz', '#music'], ['#jazz'])).toEqual(['#music']);
    expect(topicChips(['#music'], [], '#christmasmarket')).toEqual(['#music', '#christmasmarket']);
    expect(topicChips(['#music'], [], '#music')).toEqual(['#music']);
});

test('a tag picked in an event\'s details opens that tag\'s feed, as a chip, and tidies the address', async () => {
    let location;
    const Where = () => { location = useLocation(); return null; };
    render(
        <MemoryRouter initialEntries={['/dashboard?tag=%23christmasmarket&calendar=open']}>
            <AuthContext.Provider value={{ user: { id: 1, email: 'alice@example.com' } }}>
                <Routes><Route path="/dashboard" element={<><DiscoveryFeed onAttendanceChange={jest.fn()} onError={jest.fn()} /><Where /></>} /></Routes>
            </AuthContext.Provider>
        </MemoryRouter>
    );

    expect(await screen.findByText('No upcoming events for #christmasmarket yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '#christmasmarket' })).toHaveAttribute('aria-pressed', 'true');
    expect(feedCalls().pop()).toEqual(['/v2/events/feed', { params: { tag: '#christmasmarket', page: 0, size: 5 } }]);
    expect(location.search).toBe('?calendar=open');
});
