import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FriendsList from './FriendsList';
import { AuthContext } from '../context/AuthContext';
import api from '../api/client';

vi.mock('../api/client', () => ({
    __esModule: true,
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const alice = { id: 1, firstName: 'Alice', username: 'alice' };
const bob = { id: 2, firstName: 'Bob', username: 'bob' };
const carol = { id: 3, firstName: 'Carol', username: 'carol' };
const dave = { id: 4, firstName: 'Dave', username: 'dave' };

let friendships;

beforeEach(() => {
    vi.resetAllMocks();
    friendships = [
        { id: 11, status: 'accepted', userA: alice, userB: bob },
        { id: 12, status: 'pending', userA: carol, userB: alice }, // Carol asked Alice
        { id: 13, status: 'pending', userA: alice, userB: dave }, // Alice asked Dave
    ];
    api.get.mockImplementation(url => Promise.resolve({
        data: url === '/v1/friends/suggestions' ? [] : friendships,
    }));
    api.delete.mockImplementation(url => {
        friendships = friendships.filter(f => `/v1/friends/${f.id}` !== url);
        return Promise.resolve({});
    });
});

const renderPage = () => render(
    <MemoryRouter>
        <AuthContext.Provider value={{ user: alice }}>
            <FriendsList />
        </AuthContext.Provider>
    </MemoryRouter>
);

test('a received request can be declined', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: "Decline Carol's request" }));

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/v1/friends/12'));
    await waitFor(() => expect(screen.queryByText('Wants to be your friend')).not.toBeInTheDocument());
});

test('a sent request can be cancelled', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel your request to Dave' }));

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/v1/friends/13'));
    await waitFor(() => expect(screen.queryByText('Requests you sent')).not.toBeInTheDocument());
});

test('removing a friend asks for confirmation first', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Remove Bob from your friends' }));
    expect(api.delete).not.toHaveBeenCalled();
    expect(screen.getByText('Remove Bob?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/v1/friends/11'));
    expect(await screen.findByText('My Friends (0)')).toBeInTheDocument();
});

test('the search box filters only among my friends, by name or username', async () => {
    friendships = [
        { id: 11, status: 'accepted', userA: alice, userB: bob },
        { id: 12, status: 'accepted', userA: alice, userB: { id: 5, firstName: 'Erin', username: 'erin' } },
    ];
    renderPage();
    await screen.findByText('My Friends (2)');

    fireEvent.change(screen.getByLabelText('Search your friends'), { target: { value: 'erin' } });

    const friends = within(screen.getByRole('region', { name: 'My Friends (2)' }));
    expect(friends.getByText(/Erin/)).toBeInTheDocument();
    expect(friends.queryByText(/Bob/)).not.toBeInTheDocument();
    // It never calls the people search endpoint — friends are filtered on the client
    expect(api.get).not.toHaveBeenCalledWith('/v1/users/search', expect.anything());

    fireEvent.change(screen.getByLabelText('Search your friends'), { target: { value: 'zzz' } });
    expect(friends.getByText(/None of your friends match/)).toBeInTheDocument();
});

test('clicking a friend opens their profile', async () => {
    api.get.mockImplementation(url => {
        if (url === '/v1/people/2') {
            return Promise.resolve({ data: { ...bob, self: false, friend: true, mutualFriends: [], sharedGroups: [], hosting: [], going: [] } });
        }
        return Promise.resolve({ data: url === '/v1/friends/suggestions' ? [] : friendships });
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /^Bob @bob/ }));

    const profile = await screen.findByRole('dialog');
    expect(await within(profile).findByRole('heading', { name: 'Bob' })).toBeInTheDocument();
});
