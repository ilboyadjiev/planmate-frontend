import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PersonProfile from './PersonProfile';
import { AuthContext } from '../context/AuthContext';
import api from '../api/client';

jest.mock('../api/client', () => ({
    __esModule: true,
    default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const alice = { id: 1, firstName: 'Alice', username: 'alice' };
const bob = { id: 2, firstName: 'Bob', username: 'bob' };
const carol = { id: 3, firstName: 'Carol', username: 'carol' };

const card = (id, extra = {}) => ({
    id, title: `Event ${id}`, startTime: '2026-11-06T18:00:00Z', endTime: '2026-11-06T20:00:00Z',
    host: { name: 'Dave' }, attendeeCount: 0, friendsGoing: [], going: false, hosting: false, ...extra,
});

const daveProfile = (extra = {}) => ({
    id: 4, firstName: 'Dave', lastName: 'Fields', username: 'dave', self: false, friend: false,
    mutualFriends: [bob, carol], sharedGroups: ['Board games'], hosting: [card('bbq', { title: 'Barbecue' })], going: [],
    ...extra,
});

const renderProfile = (profile, friendships = []) => {
    api.get.mockImplementation(url => Promise.resolve({ data: url === '/v1/people/4' ? profile : friendships }));
    return render(
        <MemoryRouter initialEntries={['/people/4']}>
            <AuthContext.Provider value={{ user: alice }}>
                <Routes><Route path="/people/:id" element={<PersonProfile />} /></Routes>
            </AuthContext.Provider>
        </MemoryRouter>
    );
};

beforeEach(() => jest.resetAllMocks());

test('shows who someone is, what you have in common and what they host', async () => {
    renderProfile(daveProfile());

    expect(await screen.findByRole('heading', { name: 'Dave Fields' })).toBeInTheDocument();
    expect(screen.getByText('@dave')).toBeInTheDocument();
    const common = within(screen.getByRole('region', { name: 'In common' }));
    expect(common.getByRole('link', { name: 'Bob' })).toHaveAttribute('href', '/people/2');
    expect(common.getByText('Board games')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Public events Dave hosts' })).getByText('Barbecue')).toBeInTheDocument();
    expect(screen.getByText("Only Dave's friends can see which events they are going to.")).toBeInTheDocument();
});

test('you can add them as a friend from their profile', async () => {
    api.post.mockResolvedValue({ data: {} });
    renderProfile(daveProfile());

    fireEvent.click(await screen.findByRole('button', { name: 'Add Dave Fields as a friend' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/v1/friends/request/4', {}));
});

test("friends see where they are going and can join from the profile", async () => {
    const run = card('run', { title: 'Sunrise run' });
    api.post.mockResolvedValue({ data: { ...run, going: true, attendeeCount: 1 } });
    renderProfile(daveProfile({ friend: true, going: [run] }),
        [{ id: 9, status: 'accepted', userA: alice, userB: { id: 4, firstName: 'Dave', username: 'dave' } }]);

    const going = within(await screen.findByRole('region', { name: 'Dave is going to' }));
    expect(await screen.findByText('Friends')).toBeInTheDocument();
    fireEvent.click(going.getByRole('button', { name: /i'm going/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/v2/events/run/attendance'));
    expect(await going.findByRole('button', { name: /going.*leave/i })).toBeInTheDocument();
});

test('your own profile shows how others see you', async () => {
    renderProfile(daveProfile({ self: true }));

    expect(await screen.findByText('This is how others see your profile.')).toBeInTheDocument();
    const edit = screen.getByRole('link', { name: 'Edit profile' });
    const settings = screen.getByRole('link', { name: 'Settings' });
    expect(edit).toHaveAttribute('href', '/profile/edit');
    expect(settings).toHaveAttribute('href', '/settings');
    // The pencil comes first, left of the gear
    expect(edit.compareDocumentPosition(settings) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole('button', { name: /add .* as a friend/i })).not.toBeInTheDocument();
});

test('unknown people get a clear message', async () => {
    api.get.mockImplementation(url => (url === '/v1/people/4'
        ? Promise.reject({ response: { status: 404 } }) : Promise.resolve({ data: [] })));
    render(
        <MemoryRouter initialEntries={['/people/4']}>
            <AuthContext.Provider value={{ user: alice }}>
                <Routes><Route path="/people/:id" element={<PersonProfile />} /></Routes>
            </AuthContext.Provider>
        </MemoryRouter>
    );

    expect(await screen.findByText('This person could not be found.')).toBeInTheDocument();
});
