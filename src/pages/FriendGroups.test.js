import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FriendGroups from './FriendGroups';
import { AuthContext } from '../context/AuthContext';
import api from '../api/client';

jest.mock('../api/client', () => ({
    __esModule: true,
    default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const alice = { id: 1, firstName: 'Alice', username: 'alice' };
const bob = { id: 2, firstName: 'Bob', username: 'bob' };
const charlie = { id: 3, firstName: 'Charlie', username: 'charlie' };
const david = { id: 4, firstName: 'David', username: 'david' };

const sports = { id: 10, name: 'Sports team', members: [alice, bob, charlie] };

const renderPage = () => render(
    <MemoryRouter>
        <AuthContext.Provider value={{ user: alice }}>
            <FriendGroups />
        </AuthContext.Provider>
    </MemoryRouter>
);

beforeEach(() => {
    jest.resetAllMocks();
    api.get.mockImplementation(url => Promise.resolve({
        data: url === '/v1/groups' ? [sports] : [bob, charlie, david].map(f => ({ status: 'accepted', userA: alice, userB: f })),
    }));
});

const card = (name) => screen.findByRole('article', { name });

test('shows each group with its members, yourself as "You"', async () => {
    renderPage();

    const group = within(await card('Sports team'));
    expect(group.getByText('3 members')).toBeInTheDocument();
    expect(group.getByText('You')).toBeInTheDocument();
    expect(group.getByText('Bob')).toBeInTheDocument();
    expect(group.queryByRole('button', { name: /remove you/i })).not.toBeInTheDocument();
});

test('creating a group opens the friend picker, and only friends not yet in it are offered', async () => {
    api.post.mockImplementation(url => Promise.resolve({
        data: url === '/v1/groups' ? { id: 11, name: 'Board games', members: [alice] }
            : { id: 11, name: 'Board games', members: [alice, david] },
    }));
    renderPage();
    await card('Sports team');

    fireEvent.change(screen.getByLabelText('New group name'), { target: { value: 'Board games' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create group' }));

    const group = within(await card('Board games'));
    expect(api.post).toHaveBeenCalledWith('/v1/groups', { name: 'Board games', memberIds: [] });
    fireEvent.click(group.getByRole('button', { name: 'Add David to Board games' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/v1/groups/11/members', { userIds: [4] }));
    expect(await group.findByText('2 members')).toBeInTheDocument();
    // the same friends can be in several groups: Bob is offered although he is in "Sports team"
    expect(group.getByRole('button', { name: 'Add Bob to Board games' })).toBeInTheDocument();
});

test('an empty name is rejected before calling the server', async () => {
    renderPage();
    await card('Sports team');

    fireEvent.click(screen.getByRole('button', { name: 'Create group' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Give the group a name.');
    expect(api.post).not.toHaveBeenCalled();
});

test('any member can rename the group and remove people', async () => {
    api.patch.mockResolvedValue({ data: { ...sports, name: 'Football' } });
    api.delete.mockResolvedValue({ data: { ...sports, members: [alice, bob] } });
    renderPage();
    const group = within(await card('Sports team'));

    fireEvent.click(group.getByRole('button', { name: 'Remove Charlie from Sports team' }));
    expect(await group.findByText('2 members')).toBeInTheDocument();
    expect(api.delete).toHaveBeenCalledWith('/v1/groups/10/members/3');

    fireEvent.click(group.getByRole('button', { name: 'Rename Sports team' }));
    fireEvent.change(group.getByLabelText('Group name'), { target: { value: 'Football' } });
    fireEvent.click(group.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('heading', { name: 'Football' })).toBeInTheDocument();
});

test('leaving asks for confirmation and removes the group from the page', async () => {
    api.delete.mockResolvedValue({ data: { ...sports, members: [bob, charlie] } });
    renderPage();
    const group = within(await card('Sports team'));

    fireEvent.click(group.getByRole('button', { name: 'Leave group' }));
    expect(group.getByText('Leave "Sports team"?')).toBeInTheDocument();
    fireEvent.click(group.getByRole('button', { name: 'Leave' }));

    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Sports team' })).not.toBeInTheDocument());
    expect(api.delete).toHaveBeenCalledWith('/v1/groups/10/members/1');
});

describe('more social groups', () => {
    const erin = { id: 5, firstName: 'Erin', username: 'erin' }; // in the group, not Alice's friend

    test('group members who are not your friends can be added from the card', async () => {
        api.get.mockImplementation(url => Promise.resolve({
            data: url === '/v1/groups' ? [{ ...sports, members: [alice, bob, erin] }]
                : [{ status: 'accepted', userA: alice, userB: bob }],
        }));
        api.post.mockResolvedValue({ data: {} });
        renderPage();
        const group = within(await card('Sports team'));

        expect(await group.findByRole('button', { name: 'Add Erin as a friend' })).toBeInTheDocument();
        expect(group.queryByRole('button', { name: 'Add Bob as a friend' })).not.toBeInTheDocument();

        fireEvent.click(group.getByRole('button', { name: 'Add Erin as a friend' }));
        await waitFor(() => expect(api.post).toHaveBeenCalledWith('/v1/friends/request/5', {}));
    });

    test('"Plan something" opens a new event with the group already invited', async () => {
        api.post.mockResolvedValue({ data: { id: 'e1' } });
        renderPage();
        const group = within(await card('Sports team'));

        fireEvent.click(group.getByRole('button', { name: 'Plan something with Sports team' }));

        const dialog = await screen.findByRole('dialog');
        expect(await within(dialog).findByText('2 invited')).toBeInTheDocument();
        fireEvent.change(within(dialog).getByPlaceholderText(/weekend hike/i), { target: { value: 'Football' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

        await waitFor(() => expect(api.post).toHaveBeenCalledWith('/v2/events', expect.objectContaining({ title: 'Football', groupIds: ['10'] })));
        expect(await screen.findByText(/"Football" is planned and Sports team invited/)).toBeInTheDocument();
    });
});
