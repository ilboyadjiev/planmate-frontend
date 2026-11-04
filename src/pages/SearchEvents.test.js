import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import SearchEvents, { matchedByText } from './SearchEvents';
import { AuthContext } from '../context/AuthContext';
import api from '../api/client';
import { historyKey } from '../hooks/useSearchHistory';
import { requestSearchFocus } from '../services/searchFocus';

jest.mock('../api/client', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }));

const card = (id, extra = {}) => ({
    id, title: `Event ${id}`, startTime: '2026-11-06T18:00:00Z', endTime: '2026-11-06T20:00:00Z',
    host: { name: 'Maya' }, attendeeCount: 0, friendsGoing: [], going: false, hosting: false, ...extra,
});

let lastSearch = '';
const ShowLocation = () => {
    lastSearch = useLocation().search;
    return null;
};

const renderPage = (url = '/search') => render(
    <MemoryRouter initialEntries={[url]}>
        <AuthContext.Provider value={{ user: { id: 1, email: 'alice@example.com' } }}>
            <Routes>
                <Route path="/search" element={<><SearchEvents /><ShowLocation /></>} />
            </Routes>
        </AuthContext.Provider>
    </MemoryRouter>
);

const searchCalls = () => api.get.mock.calls.filter(([url]) => url === '/v2/events/search');
const field = () => screen.getByRole('searchbox', { name: 'Search events' });

const saveHistory = (queries) => window.localStorage.setItem(historyKey(1), JSON.stringify(queries));
const storedHistory = () => JSON.parse(window.localStorage.getItem(historyKey(1)) || '[]');
const recentList = () => screen.queryByRole('list', { name: 'Recent searches' });

beforeEach(() => {
    jest.resetAllMocks();
    window.localStorage.clear();
    lastSearch = '';
    api.get.mockResolvedValue({ data: { events: [], hasMore: false, total: 0 } });
});

test('matchedByText lists the reasons in plain words', () => {
    expect(matchedByText(['title'])).toBe('title');
    expect(matchedByText(['title', 'location'])).toBe('title and location');
    expect(matchedByText(['title', 'tags', 'friend'])).toBe("title, tags and a friend's name");
    expect(matchedByText([])).toBeNull();
    expect(matchedByText(undefined)).toBeNull();
});

test('typing does not search until Enter is pressed', async () => {
    renderPage();
    expect(screen.getByText(/Press Enter to search/)).toBeInTheDocument();

    fireEvent.change(field(), { target: { value: 'jazz' } });
    expect(screen.getByText('Enter ↵')).toBeInTheDocument();
    expect(searchCalls()).toHaveLength(0);

    fireEvent.submit(field());
    await waitFor(() => expect(searchCalls()).toHaveLength(1));
    expect(searchCalls()[0]).toEqual(['/v2/events/search', { params: { q: 'jazz', page: 0, size: 10 } }]);
    expect(lastSearch).toBe('?q=jazz');
    expect(await screen.findByRole('heading', { name: 'No upcoming events match “jazz”' })).toBeInTheDocument();
});

test('shows results as feed cards with why they matched, and loads more on demand', async () => {
    api.get
        .mockResolvedValueOnce({ data: { events: [card('a', { matchedBy: ['title', 'location'] }), card('b')], hasMore: true, total: 3 } })
        .mockResolvedValueOnce({ data: { events: [card('c', { matchedBy: ['friend'] })], hasMore: false, total: 3 } });
    renderPage('/search?q=jazz%20munich');

    expect(await screen.findByText('Event a')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('3 events for “jazz munich”, best match first');
    expect(screen.getByText('Matched by title and location')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show more' }));

    expect(await screen.findByText('Event c')).toBeInTheDocument();
    expect(screen.getByText("Matched by a friend's name")).toBeInTheDocument();
    expect(searchCalls()[1][1].params.page).toBe(1);
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
});

test('says so when nothing matches', async () => {
    renderPage('/search?q=salsa');
    expect(await screen.findByRole('heading', { name: 'No upcoming events match “salsa”' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Discover' })).toHaveAttribute('href', '/dashboard');
});

test('asks for at least two letters', () => {
    renderPage();
    fireEvent.change(field(), { target: { value: 'j' } });
    fireEvent.submit(field());
    expect(screen.getByRole('alert')).toHaveTextContent('Type at least two letters.');
    expect(searchCalls()).toHaveLength(0);
});

test('an example search runs straight away', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'board games' }));
    await waitFor(() => expect(searchCalls()).toHaveLength(1));
    expect(searchCalls()[0][1].params.q).toBe('board games');
    expect(field()).toHaveValue('board games');
    await screen.findByRole('heading', { name: 'No upcoming events match “board games”' });
});

test('clearing the field goes back to the start', async () => {
    api.get.mockResolvedValue({ data: { events: [card('a')], hasMore: false, total: 1 } });
    renderPage('/search?q=jazz');
    await screen.findByText('Event a');

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(field()).toHaveValue('');
    expect(screen.queryByText('Event a')).not.toBeInTheDocument();
    expect(screen.getByText(/Press Enter to search/)).toBeInTheDocument();
    expect(lastSearch).toBe('');
});

test('recent searches show only while the field has focus, in place of the tips', async () => {
    saveHistory(['jazz', 'board games']);
    renderPage();
    expect(recentList()).not.toBeInTheDocument();
    expect(screen.getByText(/Press Enter to search/)).toBeInTheDocument();

    fireEvent.focus(field());

    expect(recentList()).toBeInTheDocument();
    expect(screen.queryByText(/Press Enter to search/)).not.toBeInTheDocument();
    expect(within(recentList()).getAllByRole('listitem').map(item => item.textContent))
        .toEqual(['jazz', 'board games']);

    fireEvent.keyDown(field(), { key: 'Escape' });
    expect(recentList()).not.toBeInTheDocument();
    expect(screen.getByText(/Press Enter to search/)).toBeInTheDocument();
});

test('without recent searches, focusing the field keeps the tips', () => {
    renderPage();
    fireEvent.focus(field());
    expect(recentList()).not.toBeInTheDocument();
    expect(screen.getByText(/Press Enter to search/)).toBeInTheDocument();
});

test('searching remembers the search at the top, without duplicates', async () => {
    saveHistory(['running', 'Jazz']);
    renderPage();
    fireEvent.change(field(), { target: { value: 'jazz' } });
    fireEvent.submit(field());
    await screen.findByRole('heading', { name: 'No upcoming events match “jazz”' });
    expect(storedHistory()).toEqual(['jazz', 'running']);
});

test('typing narrows the recent searches, and choosing one searches it', async () => {
    saveHistory(['jazz night', 'board games', 'jazz brunch']);
    renderPage();
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: 'jaz' } });

    expect(within(recentList()).getAllByRole('listitem')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'jazz brunch' }));

    await waitFor(() => expect(searchCalls()).toHaveLength(1));
    expect(searchCalls()[0][1].params.q).toBe('jazz brunch');
    expect(recentList()).not.toBeInTheDocument();
    await screen.findByRole('heading', { name: 'No upcoming events match “jazz brunch”' });
});

test('single searches can be removed, or all at once', () => {
    saveHistory(['jazz', 'running', 'food']);
    renderPage();
    fireEvent.focus(field());

    fireEvent.click(screen.getByRole('button', { name: 'Remove “running” from recent searches' }));
    expect(storedHistory()).toEqual(['jazz', 'food']);
    expect(within(recentList()).getAllByRole('listitem')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(storedHistory()).toEqual([]);
    expect(recentList()).not.toBeInTheDocument();
});

test('the navbar can put the cursor in the field', () => {
    renderPage();
    expect(field()).not.toHaveFocus();
    act(() => requestSearchFocus());
    expect(field()).toHaveFocus();
});
