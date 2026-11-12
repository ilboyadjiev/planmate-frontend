import { render, screen, within, act, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import { AuthContext } from '../context/AuthContext';
import api from '../api/client';
import { countIncomingRequests, notifyFriendsChanged } from '../services/friendEvents';
import { notifyInvitesChanged } from '../services/inviteEvents';

vi.mock('../api/client', () => ({ __esModule: true, default: { get: vi.fn() } }));

const alice = { id: 1, firstName: 'Alice', lastName: 'Meier', username: 'alice', email: 'alice@example.com' };
const bob = { id: 2 };
const carol = { id: 3 };

const LocationProbe = () => {
    const location = useLocation();
    return <div data-testid="location">{location.pathname + location.search}</div>;
};

const renderNavbar = (user, path = '/dashboard') => render(
    <MemoryRouter initialEntries={[path]}>
        <AuthContext.Provider value={{ user, authToken: user ? 'token' : null, logout: vi.fn() }}>
            <Navbar />
            <Routes><Route path="*" element={<LocationProbe />} /></Routes>
        </AuthContext.Provider>
    </MemoryRouter>
);

const tabBar = () => screen.getAllByRole('navigation', { name: 'Main' })[1];

beforeEach(() => {
    vi.resetAllMocks();
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

test('the order is Social, Search, Discover, Calendar, You on phones and in the top bar', async () => {
    renderNavbar(alice, '/search');
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    const tabs = within(tabBar()).getAllByRole('link').map(link => link.textContent.trim());
    expect(tabs).toEqual(['Social', 'Search', 'Discover', 'Calendar', 'You']);
    expect(within(tabBar()).getByRole('link', { name: 'Search' })).toHaveAttribute('aria-current', 'page');

    const topBar = screen.getAllByRole('navigation', { name: 'Main' })[0];
    expect(within(topBar).getAllByRole('link').map(link => link.textContent.trim()))
        .toEqual(['Social', 'Search', 'Discover', 'Calendar']);
    expect(within(topBar).getByRole('link', { name: 'Calendar' })).toHaveAttribute('href', '/calendar');
    expect(within(screen.getByRole('banner')).getByRole('link', { name: /You$/ })).toHaveAttribute('href', '/people/1');
});

test('Social stays marked on the groups page, which it shares', async () => {
    renderNavbar(alice, '/profile/groups');
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(within(tabBar()).getByRole('link', { name: 'Social' })).toHaveClass('active');
});

describe('the top bar while scrolling', () => {
    const topBar = () => screen.getByRole('banner');
    const scrollTo = async (y) => {
        await act(async () => {
            window.scrollY = y;
            window.dispatchEvent(new Event('scroll'));
            await new Promise(resolve => window.requestAnimationFrame(resolve));
        });
    };
    afterEach(() => { window.scrollY = 0; });

    test('slides away while scrolling down and comes back on scrolling up', async () => {
        renderNavbar(alice);
        await waitFor(() => expect(api.get).toHaveBeenCalled());
        expect(topBar()).not.toHaveClass('is-hidden');

        await scrollTo(400);
        expect(topBar()).toHaveClass('is-hidden');
        await scrollTo(404); // a jitter changes nothing
        expect(topBar()).toHaveClass('is-hidden');
        await scrollTo(300);
        expect(topBar()).not.toHaveClass('is-hidden');
    });

    test('always shows near the top of the page', async () => {
        renderNavbar(alice);
        await waitFor(() => expect(api.get).toHaveBeenCalled());
        await scrollTo(40);
        expect(topBar()).not.toHaveClass('is-hidden');
    });
});

test('tapping Search again on the search page focuses the field instead of reloading the page', async () => {
    const focus = vi.fn();
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

    const picture = within(screen.getByRole('banner')).getByRole('link', { name: /You$/ });
    expect(picture).toHaveAttribute('href', '/people/1');
    expect(picture).toHaveTextContent('AM');
    expect(picture).toHaveClass('active');
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

test('unanswered invitations show as a badge on Calendar, and it refreshes when one is answered', async () => {
    let unanswered = 2;
    api.get.mockImplementation(url => Promise.resolve({
        data: url === '/v2/events/invitations/count' ? { count: unanswered } : [],
    }));
    renderNavbar(alice);

    const calendarTab = within(tabBar()).getByRole('link', { name: /^Calendar/ });
    expect(await within(calendarTab).findByText('2')).toBeInTheDocument();
    expect(calendarTab).toHaveTextContent('invitations to answer');
    const topBar = screen.getAllByRole('navigation', { name: 'Main' })[0];
    expect(within(topBar).getByRole('link', { name: /^Calendar/ })).toHaveTextContent('2');

    unanswered = 0;
    await act(async () => { notifyInvitesChanged(); });
    expect(within(calendarTab).queryByText('2')).not.toBeInTheDocument();
});
