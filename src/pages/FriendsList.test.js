import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FriendsList, { suggestionReason } from './FriendsList';
import { AuthContext } from '../context/AuthContext';
import api from '../api/client';

jest.mock('../api/client', () => ({
    __esModule: true,
    default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const alice = { id: 1, firstName: 'Alice', username: 'alice' };
const bob = { id: 2, firstName: 'Bob', username: 'bob' };
const carol = { id: 3, firstName: 'Carol', username: 'carol' };
const dave = { id: 4, firstName: 'Dave', username: 'dave' };
const erin = { id: 5, firstName: 'Erin', username: 'erin' };

let friendships;
let suggestions;

beforeEach(() => {
    jest.resetAllMocks();
    friendships = [
        { id: 11, status: 'accepted', userA: alice, userB: bob },
        { id: 12, status: 'pending', userA: carol, userB: alice }, // Carol asked Alice
        { id: 13, status: 'pending', userA: alice, userB: dave }, // Alice asked Dave
    ];
    suggestions = [{ ...erin, mutualFriendCount: 1, mutualFriends: [bob], sharedGroups: ['Board games'] }];
    api.get.mockImplementation(url => Promise.resolve({
        data: url === '/v1/friends/suggestions' ? suggestions : friendships,
    }));
    api.delete.mockImplementation(url => {
        friendships = friendships.filter(f => `/v1/friends/${f.id}` !== url);
        return Promise.resolve({});
    });
    api.post.mockImplementation(url => {
        friendships = [...friendships, { id: 14, status: 'pending', userA: alice, userB: erin }];
        return Promise.resolve({ data: {} });
    });
});

const renderPage = () => render(
    <MemoryRouter>
        <AuthContext.Provider value={{ user: alice }}>
            <FriendsList />
        </AuthContext.Provider>
    </MemoryRouter>
);

test('suggestion reasons name the shared group and mutual friends', () => {
    expect(suggestionReason({ sharedGroups: ['Board games'], mutualFriendCount: 3, mutualFriends: [bob, carol] }))
        .toBe('In Board games with you · 3 mutual friends: Bob, Carol and 1 more');
    expect(suggestionReason({ sharedGroups: [], mutualFriendCount: 2, mutualFriends: [bob, carol] }))
        .toBe('2 mutual friends: Bob and Carol');
    expect(suggestionReason({ sharedGroups: ['A', 'B'], mutualFriendCount: 0 })).toBe('In 2 of your groups');
});

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

test('people you may know can be added in one tap and then show as requested', async () => {
    renderPage();
    const suggested = within(await screen.findByRole('region', { name: 'People you may know' }));
    expect(suggested.getByText('In Board games with you · 1 mutual friend: Bob')).toBeInTheDocument();

    fireEvent.click(suggested.getByRole('button', { name: 'Add Erin as a friend' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/v1/friends/request/5', {}));
    expect(await suggested.findByText('Requested')).toBeInTheDocument();
});

test('search runs as you type, by name, with mutual friends, and names open profiles', async () => {
    api.get.mockImplementation((url, config) => {
        if (url === '/v1/users/search') {
            return Promise.resolve({ data: [{ id: 7, firstName: 'Dave', lastName: 'Fields', username: 'dave', mutualFriendCount: 2, mutualFriends: [bob, carol] }] });
        }
        return Promise.resolve({ data: url === '/v1/friends/suggestions' ? [] : friendships });
    });
    renderPage();

    fireEvent.change(await screen.findByLabelText('Search people by name or username'), { target: { value: 'fie' } });

    const results = within(await screen.findByRole('region', { name: 'Search Results' }));
    expect(api.get).toHaveBeenCalledWith('/v1/users/search', { params: { term: 'fie' } });
    expect(results.getByText('2 mutual friends: Bob and Carol')).toBeInTheDocument();
});

test('a profile opens as a pop-up and closing it returns to the search results', async () => {
    const dave = { id: 7, firstName: 'Dave', lastName: 'Fields', username: 'dave', mutualFriendCount: 1, mutualFriends: [bob] };
    api.get.mockImplementation(url => {
        if (url === '/v1/users/search') return Promise.resolve({ data: [dave] });
        if (url === '/v1/people/7') {
            return Promise.resolve({ data: { ...dave, self: false, friend: false, mutualFriends: [bob], sharedGroups: [], hosting: [], going: [] } });
        }
        if (url === '/v1/people/2') {
            return Promise.resolve({ data: { ...bob, self: false, friend: true, mutualFriends: [], sharedGroups: [], hosting: [], going: [] } });
        }
        return Promise.resolve({ data: url === '/v1/friends/suggestions' ? [] : friendships });
    });
    renderPage();
    fireEvent.change(await screen.findByLabelText('Search people by name or username'), { target: { value: 'fie' } });
    const results = within(await screen.findByRole('region', { name: 'Search Results' }));

    fireEvent.click(results.getByRole('button', { name: /^Dave Fields @dave/ }));

    const profile = await screen.findByRole('dialog');
    expect(await within(profile).findByRole('heading', { name: 'Dave Fields' })).toBeInTheDocument();

    // A mutual friend opens in the same pop-up, with a way back
    fireEvent.click(within(profile).getByRole('button', { name: 'Bob' }));
    expect(await within(profile).findByRole('heading', { name: 'Bob' })).toBeInTheDocument();
    fireEvent.click(within(profile).getByRole('button', { name: '← Back to Dave' }));
    expect(await within(profile).findByRole('heading', { name: 'Dave Fields' })).toBeInTheDocument();

    fireEvent.click(within(profile).getByRole('button', { name: 'Close profile' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('region', { name: 'Search Results' })).toHaveTextContent('Dave Fields');
    expect(screen.getByLabelText('Search people by name or username')).toHaveValue('fie');
});

test('a single letter does not search yet', async () => {
    renderPage();

    fireEvent.change(await screen.findByLabelText('Search people by name or username'), { target: { value: 'd' } });
    await new Promise(r => setTimeout(r, 400));

    expect(api.get).not.toHaveBeenCalledWith('/v1/users/search', expect.anything());
});
