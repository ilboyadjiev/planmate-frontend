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
