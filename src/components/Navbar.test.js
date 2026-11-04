import { render, screen, within, act, waitFor, fireEvent } from '@testing-library/react';
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

test('the Calendar tab is its own page and is marked active there', async () => {
    renderNavbar(alice, '/calendar');
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    const calendarTab = within(tabBar()).getByRole('link', { name: 'Calendar' });
    expect(calendarTab).toHaveAttribute('href', '/calendar');
    expect(calendarTab).toHaveAttribute('aria-current', 'page');
    expect(within(tabBar()).getByRole('link', { name: 'Discover' })).not.toHaveAttribute('aria-current');
});

test('Search sits between Calendar and Friends on phones, and after Discover in the top bar', async () => {
    renderNavbar(alice, '/search');
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    const tabs = within(tabBar()).getAllByRole('link').map(link => link.textContent.trim());
    expect(tabs.slice(0, 4)).toEqual(['Discover', 'Calendar', 'Search', 'Friends']);
    expect(within(tabBar()).getByRole('link', { name: 'Search' })).toHaveAttribute('aria-current', 'page');

    const topBar = screen.getAllByRole('navigation', { name: 'Main' })[0];
    expect(within(topBar).getAllByRole('link').map(link => link.textContent.trim()).slice(0, 3))
        .toEqual(['Discover', 'Search', 'Friends']);
});

test('tapping Search again on the search page focuses the field instead of reloading the page', async () => {
    const focus = jest.fn();
    window.addEventListener('planmate:focus-search', focus);
    renderNavbar(alice, '/search');
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    fireEvent.click(within(tabBar()).getByRole('link', { name: 'Search' }));
    expect(focus).toHaveBeenCalledTimes(1);
    window.removeEventListener('planmate:focus-search', focus);
});

test('logged-in users get Friends with a request badge, and the badge refreshes when friends change', async () => {
    api.get.mockResolvedValueOnce({ data: [{ status: 'pending', userA: bob, userB: alice }] });
    renderNavbar(alice);

    expect(await within(tabBar()).findByText('1')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/v1/users/1/friends');

    api.get.mockResolvedValueOnce({ data: [] });
    await act(async () => { notifyFriendsChanged(); });
    expect(within(tabBar()).queryByText('1')).not.toBeInTheDocument();
});

test('"You" and your picture open your profile, and "You" stays active in settings', async () => {
    renderNavbar(alice, '/settings');
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    const you = within(tabBar()).getByRole('link', { name: 'You' });
    expect(you).toHaveAttribute('href', '/people/1');
    expect(you).toHaveClass('active');

    const picture = screen.getByRole('link', { name: 'Your profile' });
    expect(picture).toHaveAttribute('href', '/people/1');
    expect(picture).toHaveTextContent('AM');
    expect(screen.queryByRole('button', { name: /account menu/i })).not.toBeInTheDocument();

    fireEvent.click(picture);
    expect(screen.getByTestId('location')).toHaveTextContent('/people/1');
});

test('guests see log in and sign up, no friends and no local mode warning', () => {
    renderNavbar(null);

    expect(screen.queryByRole('button', { name: /local mode/i })).not.toBeInTheDocument();
    expect(within(tabBar()).getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/register');
    expect(screen.queryByRole('link', { name: /friends/i })).not.toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
});
