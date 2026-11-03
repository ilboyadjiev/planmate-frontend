import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DiscoveryFeed from './DiscoveryFeed';
import { AuthContext } from '../context/AuthContext';
import api from '../api/client';

jest.mock('../api/client', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() } }));

const card = (id, extra = {}) => ({
    id, title: `Event ${id}`, startTime: '2026-11-06T18:00:00Z', endTime: '2026-11-06T20:00:00Z',
    host: { name: 'Maya' }, attendeeCount: 0, friendsGoing: [], going: false, hosting: false, ...extra,
});

const renderFeed = (props = {}) => render(
    <MemoryRouter>
        <AuthContext.Provider value={{ user: { id: 1, email: 'alice@example.com' } }}>
            <DiscoveryFeed onAttendanceChange={jest.fn()} onError={jest.fn()} {...props} />
        </AuthContext.Provider>
    </MemoryRouter>
);

beforeEach(() => jest.resetAllMocks());

test('starts on "For you" and loads more cards on demand', async () => {
    api.get
        .mockResolvedValueOnce({ data: { events: [card('a'), card('b')], hasMore: true } })
        .mockResolvedValueOnce({ data: { events: [card('b'), card('c')], hasMore: false } });
    renderFeed();

    expect(await screen.findByText('Event a')).toBeInTheDocument();
    expect(api.get).toHaveBeenLastCalledWith('/v2/events/feed', { params: { page: 0, size: 5 } });
    expect(screen.getByRole('button', { name: 'For you' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Show more' }));

    expect(await screen.findByText('Event c')).toBeInTheDocument();
    expect(screen.getAllByText('Event b')).toHaveLength(1); // no duplicates when the ranking shifts
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
});

test('a tag chip reloads the feed for that tag', async () => {
    api.get.mockResolvedValue({ data: { events: [], hasMore: false } });
    renderFeed();
    await screen.findByText('No upcoming public events yet.');

    fireEvent.click(screen.getByRole('button', { name: '#food' }));

    expect(await screen.findByText('No upcoming events for #food yet.')).toBeInTheDocument();
    expect(api.get).toHaveBeenLastCalledWith('/v2/events/feed', { params: { tag: '#food', page: 0, size: 5 } });
});

test("joining updates the card in place and tells the dashboard", async () => {
    const onAttendanceChange = jest.fn();
    api.get.mockResolvedValue({ data: { events: [card('a', { attendeeCount: 3 })], hasMore: false } });
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
    api.get.mockResolvedValue({ data: { events: [card('a')], hasMore: false } });
    api.post.mockRejectedValue({ response: { status: 500 } });
    renderFeed({ onError });

    fireEvent.click(await screen.findByRole('button', { name: /i'm going/i }));

    await waitFor(() => expect(onError).toHaveBeenCalledWith('Could not join the event. Please try again.'));
    expect(screen.getByRole('button', { name: /i'm going/i })).toBeEnabled();
});
