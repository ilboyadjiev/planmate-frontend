import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EventPage, { longWhen } from './EventPage';
import { AuthContext } from '../context/AuthContext';
import api from '../api/client';

jest.mock('../api/client', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }));

const card = (extra = {}) => ({
    id: 'abc', title: 'Jazz night', description: 'Live jazz.\nBring friends.',
    startTime: '2030-11-06T19:00:00', endTime: '2030-11-06T22:00:00',
    location: { name: 'Unterfahrt', street: 'Einsteinstraße 42', city: 'Munich' }, tags: ['#jazz', '#music'],
    host: { id: 4, name: 'Maya Schneider', username: 'maya', friend: false, you: false },
    attendeeCount: 3, friendsGoing: [], going: false, hosting: false, invited: false, myResponse: null, isPublic: true,
    ...extra,
});

const renderPage = (user = null) => render(
    <MemoryRouter initialEntries={['/events/abc']}>
        <AuthContext.Provider value={{ user }}>
            <Routes>
                <Route path="/events/:id" element={<EventPage />} />
            </Routes>
        </AuthContext.Provider>
    </MemoryRouter>
);

const failWith = (status) => api.get.mockRejectedValue({ response: { status } });

beforeEach(() => jest.resetAllMocks());

test('a shared public event shows everything, also without an account', async () => {
    api.get.mockResolvedValue({ data: card() });
    renderPage();

    expect(await screen.findByRole('heading', { level: 1, name: 'Jazz night' })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/v2/events/abc/card');
    expect(screen.getByText(/Einsteinstraße 42, Munich/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open in Maps/ })).toHaveAttribute('href', expect.stringContaining('google.com/maps'));
    expect(screen.getByText(/Live jazz\./)).toBeInTheDocument();
    expect(screen.queryByText(/Read more here/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Show more #jazz events' })).toHaveAttribute('href', '/dashboard?tag=%23jazz');
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export to calendar' })).toBeInTheDocument();
    // Joining needs an account, and logging in comes back here
    expect(screen.getByRole('link', { name: 'Log in to join' })).toHaveAttribute('href', '/login?next=%2Fevents%2Fabc');
    await waitFor(() => expect(document.title).toBe('Jazz night · PlanMate'));
});

test('a discovered event links to its source page so people can keep reading', async () => {
    api.get.mockResolvedValue({ data: card({ sourceUrl: 'https://www.ticketmaster.de/event/123' }) });
    renderPage();

    expect(await screen.findByText(/Read more here:/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ticketmaster.de' })).toHaveAttribute('href', 'https://www.ticketmaster.de/event/123');
});

test('below the event: its other dates and similar events', async () => {
    api.get.mockImplementation(url => Promise.resolve({ data: url.endsWith('/related')
        ? { moreDates: [card({ id: 'abc-2', startTime: '2030-11-13T19:00:00', endTime: '2030-11-13T22:00:00' })],
            similar: [card({ id: 'blues', title: 'Blues evening' })] }
        : card() }));
    renderPage();

    expect(await screen.findByRole('heading', { level: 2, name: 'More dates' })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/v2/events/abc/related');
    expect(screen.getByRole('link', { name: /Wednesday, 13 November 2030/ })).toHaveAttribute('href', '/events/abc-2');
    expect(screen.getByRole('heading', { level: 2, name: 'Similar events' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Blues evening/ })).toHaveAttribute('href', '/events/blues');
});

test('logged in, people join right from the page', async () => {
    api.get.mockResolvedValue({ data: card() });
    api.post.mockResolvedValue({ data: card({ going: true, attendeeCount: 4 }) });
    renderPage({ id: 1, email: 'alice@example.com' });

    fireEvent.click(await screen.findByRole('button', { name: "I'm going" }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/v2/events/abc/attendance'));
    expect(await screen.findByRole('button', { name: /Going/ })).toHaveAttribute('aria-pressed', 'true');
});

test('the host sees that it is private and can edit it', async () => {
    api.get.mockResolvedValue({ data: card({ hosting: true, isPublic: false, host: { name: 'Alice', you: true } }) });
    renderPage({ id: 1, email: 'alice@example.com' });

    expect(await screen.findByText(/only people invited can open this link/)).toBeInTheDocument();
    expect(screen.getByText("You're hosting")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit event' })).toBeInTheDocument();
});

test('a private event asks people who are not logged in to log in', async () => {
    failWith(401);
    renderPage();
    expect(await screen.findByText('Log in to view details on this event.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login?next=%2Fevents%2Fabc');
    expect(screen.queryByText('Jazz night')).toBeNull();
});

test('a private event tells logged-in people who were not invited why they cannot see it', async () => {
    failWith(403);
    renderPage({ id: 3, email: 'carol@example.com' });
    expect(await screen.findByText('The sender of this event has to invite you in order for you to see the details.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Log in' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Discover events' })).toHaveAttribute('href', '/dashboard');
});

test('a deleted event says it is not available', async () => {
    failWith(404);
    renderPage();
    expect(await screen.findByRole('heading', { name: "This event isn't available" })).toBeInTheDocument();
});

test('an event that is over says so and offers no joining', async () => {
    api.get.mockResolvedValue({ data: card({ startTime: '2020-01-01T19:00:00', endTime: '2020-01-01T22:00:00' }) });
    renderPage({ id: 1, email: 'alice@example.com' });
    expect(await screen.findByText('This event has ended')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: "I'm going" })).toBeNull();
});

test('the full date, with times in the chosen format', () => {
    expect(longWhen('2030-11-06T19:00:00', '2030-11-06T22:00:00')).toBe('Wednesday, 6 November 2030 · 19:00 – 22:00');
    expect(longWhen('2030-11-06T19:00:00', '2030-11-06T22:00:00', '12h')).toBe('Wednesday, 6 November 2030 · 7:00 PM – 10:00 PM');
});

test('a cancelled event says so and offers no joining or adding to calendars', async () => {
    api.get.mockResolvedValue({ data: card({ cancelled: true }) });
    renderPage({ id: 1, email: 'alice@example.com' });
    expect(await screen.findByText('This event was cancelled')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: "I'm going" })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add to calendar' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
});

describe('Export to calendar', () => {
    const exportToGoogle = async () => {
        fireEvent.click(await screen.findByRole('button', { name: 'Export to calendar' }));
        fireEvent.click(screen.getByRole('link', { name: /Google Calendar/ }));
    };

    test('exporting a public event also joins it', async () => {
        api.get.mockResolvedValue({ data: card() });
        api.post.mockResolvedValue({ data: card({ going: true, attendeeCount: 4 }) });
        renderPage({ id: 1, email: 'alice@example.com' });

        await exportToGoogle();
        await waitFor(() => expect(api.post).toHaveBeenCalledWith('/v2/events/abc/attendance'));
    });

    test('exporting an invitation accepts it', async () => {
        api.get.mockResolvedValue({ data: card({ isPublic: false, invited: true, myResponse: 'pending' }) });
        api.put.mockResolvedValue({ data: {} });
        renderPage({ id: 1, email: 'alice@example.com' });

        await exportToGoogle();
        await waitFor(() => expect(api.put).toHaveBeenCalledWith('/v2/events/abc/response', { response: 'accepted' }));
        expect(api.post).not.toHaveBeenCalled();
    });

    test('people already going and guests are left as they are', async () => {
        api.get.mockResolvedValue({ data: card({ going: true }) });
        const { unmount } = renderPage({ id: 1, email: 'alice@example.com' });
        await exportToGoogle();
        unmount();

        api.get.mockResolvedValue({ data: card() });
        renderPage();
        await exportToGoogle();
        expect(api.post).not.toHaveBeenCalled();
        expect(api.delete).not.toHaveBeenCalled();
    });
});
