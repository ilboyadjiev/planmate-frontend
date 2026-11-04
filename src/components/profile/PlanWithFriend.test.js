import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import moment from 'moment';
import ProfileModal from './ProfileModal';
import { dayLabel } from './PlanTogether';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/client';

jest.mock('../../api/client', () => ({
    __esModule: true,
    default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const alice = { id: 1, firstName: 'Alice', username: 'alice' };
const dave = { id: 4, firstName: 'Dave', lastName: 'Fields', username: 'dave' };
const today = moment().format('YYYY-MM-DD');
const tomorrow = moment().add(1, 'day').format('YYYY-MM-DD');
const at = (day, time) => moment(`${day} ${time}`, 'YYYY-MM-DD HH:mm').toISOString();

const profileOf = (extra) => ({ ...dave, self: false, friend: true, mutualFriends: [], sharedGroups: [], hosting: [], going: [], ...extra });

let freeSlots;
let availability;

beforeEach(() => {
    jest.resetAllMocks();
    freeSlots = {
        days: [
            { date: today, slots: [] },
            { date: tomorrow, slots: [{ part: 'Evening', start: at(tomorrow, '18:00'), end: at(tomorrow, '19:00') }] },
        ],
    };
    availability = { youFree: true, theyFree: true };
});

const renderProfile = (profile = profileOf(), onPlanned = jest.fn(), friendships = [{ id: 9, status: 'accepted', userA: alice, userB: dave }]) => {
    api.get.mockImplementation((url, config) => {
        if (url === '/v1/people/4') return Promise.resolve({ data: profile });
        if (url === '/v1/people/4/free-slots') return Promise.resolve({ data: freeSlots });
        if (url === '/v1/people/4/availability') return Promise.resolve({ data: availability });
        if (url === '/v1/groups') return Promise.resolve({ data: [] });
        return Promise.resolve({ data: friendships });
    });
    render(
        <MemoryRouter>
            <AuthContext.Provider value={{ user: alice }}>
                <ProfileModal personId={4} onHide={jest.fn()} onPlanned={onPlanned} />
            </AuthContext.Provider>
        </MemoryRouter>
    );
};

test('days are labelled the way people talk about them', () => {
    const now = moment('2026-11-10', 'YYYY-MM-DD');
    expect(dayLabel('2026-11-10', now)).toBe('Today');
    expect(dayLabel('2026-11-11', now)).toBe('Tomorrow');
    expect(dayLabel('2026-11-13', now)).toBe('Fri 13 Nov');
});

test('only friends can be planned with', async () => {
    renderProfile(profileOf({ friend: false }), jest.fn(), []);

    expect(await screen.findByRole('heading', { name: 'Dave Fields' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /plan something with dave/i })).not.toBeInTheDocument();
});

test('planning with a friend: pick a shared free time, then create the event with them invited', async () => {
    const onPlanned = jest.fn();
    renderProfile(profileOf(), onPlanned);
    api.post.mockResolvedValue({ data: { id: 'e1', title: 'Coffee' } });

    fireEvent.click(await screen.findByRole('button', { name: /plan something with dave/i }));

    const planner = await screen.findByRole('dialog', { name: 'Plan something with Dave' });
    expect(within(planner).getByRole('heading', { name: 'When suits you and Dave?' })).toBeInTheDocument();
    expect(await within(planner).findByText('No shared free time')).toBeInTheDocument(); // today
    expect(api.get).toHaveBeenCalledWith('/v1/people/4/free-slots', expect.objectContaining({
        params: expect.objectContaining({ from: today, days: 7, minutes: 60 }),
    }));

    fireEvent.click(within(planner).getByRole('button', { name: 'Tomorrow, evening: 18:00 to 19:00' }));

    // Step 2: the usual form, with Dave invited and the time filled in
    const form = await screen.findByRole('dialog', { name: /create new event/i });
    expect(within(form).getByText('Dave')).toBeInTheDocument(); // his pill: first name and @dave
    expect(within(form).getByText('@dave')).toBeInTheDocument();
    expect(await within(form).findByText('✓ You and Dave are both free then')).toBeInTheDocument();
    fireEvent.change(within(form).getByPlaceholderText(/weekend hike/i), { target: { value: 'Coffee' } });
    fireEvent.click(within(form).getByRole('button', { name: /create event/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/v2/events', expect.objectContaining({
        title: 'Coffee', participantIds: ['4'], startTime: at(tomorrow, '18:00'), endTime: at(tomorrow, '19:00'),
    })));
    await waitFor(() => expect(onPlanned).toHaveBeenCalledWith({ id: 'e1', title: 'Coffee' }, expect.objectContaining({ id: 4 })));
});

test('choosing a longer length asks for new free times', async () => {
    renderProfile();
    fireEvent.click(await screen.findByRole('button', { name: /plan something with dave/i }));
    const planner = await screen.findByRole('dialog', { name: 'Plan something with Dave' });

    fireEvent.click(within(planner).getByRole('button', { name: '2 hours' }));

    await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/v1/people/4/free-slots', expect.objectContaining({
        params: expect.objectContaining({ minutes: 120 }),
    })));
    expect(within(planner).getByRole('button', { name: '2 hours' })).toHaveAttribute('aria-pressed', 'true');
});

test('the form warns when the friend is busy at the chosen time', async () => {
    availability = { youFree: true, theyFree: false };
    renderProfile();
    fireEvent.click(await screen.findByRole('button', { name: /plan something with dave/i }));
    const planner = await screen.findByRole('dialog', { name: 'Plan something with Dave' });

    fireEvent.click(within(planner).getByRole('button', { name: 'Choose a time myself' }));

    const form = await screen.findByRole('dialog', { name: /create new event/i });
    expect(await within(form).findByText('Dave has something else then')).toBeInTheDocument();
});

test('going back from the free times returns to the profile', async () => {
    renderProfile();
    fireEvent.click(await screen.findByRole('button', { name: /plan something with dave/i }));
    const planner = await screen.findByRole('dialog', { name: 'Plan something with Dave' });

    fireEvent.click(within(planner).getByRole('button', { name: 'Close' }));

    expect(await screen.findByRole('heading', { name: 'Dave Fields' })).toBeInTheDocument();
});
