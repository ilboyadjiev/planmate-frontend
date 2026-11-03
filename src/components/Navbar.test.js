import { render, screen, within, act, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import { AuthContext } from '../context/AuthContext';
import api from '../api/client';
import { countIncomingRequests, notifyFriendsChanged } from '../services/friendEvents';

jest.mock('../api/client', () => ({ __esModule: true, default: { get: jest.fn() } }));

const alice = { id: 1, firstName: 'Alice', lastName: 'Meier', username: 'alice', email: 'alice@example.com' };
const bob = { id: 2 };
const carol = { id: 3 };

const LocationProbe = () => {
    const location = useLocation();
    return <div data-testid="location">{location.pathname + location.search}</div>;
};

const renderNavbar = (user, path = '/dashboard') => render(
    <MemoryRouter initialEntries={[path]}>
        <AuthContext.Provider value={{ user, authToken: user ? 'token' : null, logout: jest.fn() }}>
            <Navbar />
            <Routes><Route path="*" element={<LocationProbe />} /></Routes>
        </AuthContext.Provider>
    </MemoryRouter>
);

const tabBar = () => screen.getAllByRole('navigation', { name: 'Main' })[1];

beforeEach(() => {
    jest.resetAllMocks();
    api.get.mockResolvedValue({ data: [] });
});

test('only requests sent to me count as new', () => {
    const friendships = [
        { status: 'pending', userA: bob, userB: alice }, // incoming
        { status: 'pending', userA: alice, userB: carol }, // I sent it
        { status: 'accepted', userA: carol, userB: alice },
    ];
    expect(countIncomingRequests(friendships, 1)).toBe(1);
});

test('the tab bar opens the calendar drawer and marks it active', async () => {
    renderNavbar(alice, '/dashboard?calendar=open');
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    const calendarTab = within(tabBar()).getByRole('link', { name: 'Calendar' });
    expect(calendarTab).toHaveAttribute('href', '/dashboard?calendar=open');
    expect(calendarTab).toHaveAttribute('aria-current', 'page');
    expect(within(tabBar()).getByRole('link', { name: 'Discover' })).not.toHaveAttribute('aria-current');
});

test('logged-in users get Friends with a request badge, and the badge refreshes when friends change', async () => {
    api.get.mockResolvedValueOnce({ data: [{ status: 'pending', userA: bob, userB: alice }] });
    renderNavbar(alice);

    expect(await within(tabBar()).findByText('1')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/v1/users/1/friends');
    expect(within(tabBar()).getByRole('link', { name: /you/i })).toHaveAttribute('href', '/profile/edit');
    expect(screen.getByRole('button', { name: /account menu for alice/i })).toHaveTextContent('AM');

    api.get.mockResolvedValueOnce({ data: [] });
    await act(async () => { notifyFriendsChanged(); });
    expect(within(tabBar()).queryByText('1')).not.toBeInTheDocument();
});

test('guests see local mode, log in and sign up, and no friends', () => {
    renderNavbar(null);

    expect(screen.getByRole('button', { name: /local mode/i })).toBeInTheDocument();
    expect(within(tabBar()).getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/register');
    expect(screen.queryByRole('link', { name: /friends/i })).not.toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
});
