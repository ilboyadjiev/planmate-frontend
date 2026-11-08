import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FindPeople from './FindPeople';
import { suggestionReason } from './socialShared';
import { AuthContext } from '../context/AuthContext';
import api from '../api/client';

jest.mock('../api/client', () => ({
    __esModule: true,
    default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const alice = { id: 1, firstName: 'Alice', username: 'alice' };
const bob = { id: 2, firstName: 'Bob', username: 'bob' };
const carol = { id: 3, firstName: 'Carol', username: 'carol' };
const erin = { id: 5, firstName: 'Erin', username: 'erin' };

let friendships;
let suggestions;

beforeEach(() => {
    jest.resetAllMocks();
    friendships = [{ id: 11, status: 'accepted', userA: alice, userB: bob }];
    suggestions = [{ ...erin, mutualFriendCount: 1, mutualFriends: [bob], sharedGroups: ['Board games'] }];
    api.get.mockImplementation(url => Promise.resolve({
        data: url === '/v1/friends/suggestions' ? suggestions : friendships,
    }));
    api.post.mockImplementation(() => {
        friendships = [...friendships, { id: 14, status: 'pending', userA: alice, userB: erin }];
        return Promise.resolve({ data: {} });
    });
});

const renderPage = () => render(
    <MemoryRouter>
        <AuthContext.Provider value={{ user: alice }}>
            <FindPeople />
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

test('people you may know can be added in one tap and then show as requested', async () => {
    renderPage();
    const suggested = within(await screen.findByRole('region', { name: 'People you may know' }));
    expect(suggested.getByText('In Board games with you · 1 mutual friend: Bob')).toBeInTheDocument();

    fireEvent.click(suggested.getByRole('button', { name: 'Add Erin as a friend' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/v1/friends/request/5', {}));
    expect(await suggested.findByText('Requested')).toBeInTheDocument();
});

test('search runs as you type, across everyone, with mutual friends', async () => {
    api.get.mockImplementation((url) => {
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

test('a profile opens as a pop-up from a search result', async () => {
    const dave = { id: 7, firstName: 'Dave', lastName: 'Fields', username: 'dave', mutualFriendCount: 1, mutualFriends: [bob] };
    api.get.mockImplementation(url => {
        if (url === '/v1/users/search') return Promise.resolve({ data: [dave] });
        if (url === '/v1/people/7') {
            return Promise.resolve({ data: { ...dave, self: false, friend: false, mutualFriends: [bob], sharedGroups: [], hosting: [], going: [] } });
        }
        return Promise.resolve({ data: url === '/v1/friends/suggestions' ? [] : friendships });
    });
    renderPage();
    fireEvent.change(await screen.findByLabelText('Search people by name or username'), { target: { value: 'fie' } });
    const results = within(await screen.findByRole('region', { name: 'Search Results' }));

    fireEvent.click(results.getByRole('button', { name: /^Dave Fields @dave/ }));

    const profile = await screen.findByRole('dialog');
    expect(await within(profile).findByRole('heading', { name: 'Dave Fields' })).toBeInTheDocument();
});

test('a single letter does not search yet', async () => {
    renderPage();

    fireEvent.change(await screen.findByLabelText('Search people by name or username'), { target: { value: 'd' } });
    await new Promise(r => setTimeout(r, 400));

    expect(api.get).not.toHaveBeenCalledWith('/v1/users/search', expect.anything());
});
