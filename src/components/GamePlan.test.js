import { render, screen, fireEvent } from '@testing-library/react';
import moment from 'moment';
import GamePlan from './GamePlan';
import api from '../api/client';

jest.mock('../api/client', () => ({ __esModule: true, default: { get: jest.fn() } }));
// react-markdown is ESM-only and Jest (CRA) cannot load it; rendering markdown is not what is tested here
jest.mock('react-markdown', () => ({ children }) => <div>{children}</div>);

const alice = { id: 1, username: 'alice' };
const inMinutes = (m) => new Date(Date.now() + m * 60000).toISOString();

const serverPlan = (overrides = {}) => ({
    data: {
        summary: 'Dinner with **Bob** at 19:00.',
        creationDate: new Date().toISOString(),
        nextAvailableRefresh: inMinutes(5),
        remainingDailyCalls: 9,
        ...overrides,
    },
});

const cachePlan = (overrides = {}) => localStorage.setItem('planmate_game_plan_1', JSON.stringify({
    date: moment().format('YYYY-MM-DD'), summary: 'Cached plan', createdAt: inMinutes(-30),
    nextAvailableAt: inMinutes(-25), remaining: 8, ...overrides,
}));

beforeEach(() => {
    jest.resetAllMocks();
    localStorage.clear();
});

test('first use: nothing is generated until the user asks', async () => {
    api.get.mockResolvedValue(serverPlan());
    render(<GamePlan user={alice} calendarVersion="0-0" />);

    expect(api.get).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'AI Game plan' })).toBeInTheDocument();
    expect(screen.getByText(/which invites still need an answer/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '✨ Get my game plan' }));

    expect(await screen.findByText(/Dinner with/)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/v2/ai/summary', { params: { force: true } });
    expect(screen.getByText(/9 left today/)).toBeInTheDocument();
});

test('cooldown: the button says when the next plan is available', async () => {
    api.get.mockResolvedValue(serverPlan());
    render(<GamePlan user={alice} calendarVersion="0-0" />);
    fireEvent.click(screen.getByRole('button', { name: '✨ Get my game plan' }));

    const button = await screen.findByRole('button', { name: /^Available at \d{2}:\d{2}$/ });
    expect(button).toBeDisabled();
    expect(screen.getByText(/^Your next game plan is available at \d{2}:\d{2}\.$/)).toBeInTheDocument();
});

test("today's plan survives a reload without another call and can be refreshed", () => {
    cachePlan();
    render(<GamePlan user={alice} calendarVersion="0-0" />);

    expect(screen.getByText('Cached plan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh game plan' })).toBeEnabled();
    expect(api.get).not.toHaveBeenCalled();
});

test("yesterday's plan and the old recap cache are not shown", () => {
    localStorage.setItem('planmate_game_plan_1', JSON.stringify({ date: '2020-01-01', summary: 'Old plan' }));
    localStorage.setItem('planmate_ai_recap_1', JSON.stringify({ date: moment().format('YYYY-MM-DD'), summary: 'Recap' }));
    render(<GamePlan user={alice} calendarVersion="0-0" />);

    expect(screen.queryByText('Old plan')).not.toBeInTheDocument();
    expect(screen.queryByText('Recap')).not.toBeInTheDocument();
    expect(localStorage.getItem('planmate_ai_recap_1')).toBeNull();
});

test('calendar changed: the button offers an update, without calling by itself', () => {
    cachePlan();
    const { rerender } = render(<GamePlan user={alice} calendarVersion="0-0" />);

    rerender(<GamePlan user={alice} calendarVersion="1-0" />);

    expect(screen.getByRole('button', { name: '✨ Update my game plan' })).toBeEnabled();
    expect(screen.getByRole('status')).toHaveTextContent('Your calendar changed since this game plan. Refresh it to catch up.');
    expect(api.get).not.toHaveBeenCalled();
});

test('calendar changed during the cooldown: says when it can be updated', () => {
    cachePlan({ nextAvailableAt: inMinutes(3) });
    const { rerender } = render(<GamePlan user={alice} calendarVersion="0-0" />);

    rerender(<GamePlan user={alice} calendarVersion="1-0" />);

    expect(screen.getByRole('button', { name: /^Available at/ })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(/calendar changed since this game plan\. You can update it at \d{2}:\d{2}/);
});

test('daily limit: the button waits until tomorrow', async () => {
    api.get.mockResolvedValue(serverPlan({ remainingDailyCalls: 0, nextAvailableRefresh: inMinutes(-1) }));
    render(<GamePlan user={alice} calendarVersion="0-0" />);

    fireEvent.click(screen.getByRole('button', { name: '✨ Get my game plan' }));

    expect(await screen.findByRole('button', { name: 'More tomorrow' })).toBeDisabled();
    expect(screen.getByText("That's all the game plans for today. More tomorrow.")).toBeInTheDocument();
});

test('a failed request is reported and can be retried', async () => {
    api.get.mockRejectedValue(new Error('offline'));
    render(<GamePlan user={alice} calendarVersion="0-0" />);

    fireEvent.click(screen.getByRole('button', { name: '✨ Get my game plan' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't put your game plan together/i);
    expect(screen.getByRole('button', { name: '✨ Get my game plan' })).toBeEnabled();
});

describe('collapsing', () => {
    test('is open by default and collapses to the header line, remembered after a reload', () => {
        cachePlan();
        const { unmount } = render(<GamePlan user={alice} calendarVersion="0-0" />);
        const toggle = screen.getByRole('button', { name: 'AI Game plan' });

        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('Cached plan')).toBeVisible();

        fireEvent.click(toggle);

        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByText('Cached plan')).not.toBeVisible();
        expect(screen.queryByText(/Planned at/)).not.toBeInTheDocument();
        // The header line keeps the action
        expect(screen.getByRole('button', { name: 'Refresh game plan' })).toBeVisible();

        unmount();
        render(<GamePlan user={alice} calendarVersion="0-0" />);
        expect(screen.getByRole('button', { name: 'AI Game plan' })).toHaveAttribute('aria-expanded', 'false');
    });

    test('a new game plan opens the section again', async () => {
        localStorage.setItem('planmate_game_plan_collapsed_1', 'true');
        api.get.mockResolvedValue(serverPlan());
        render(<GamePlan user={alice} calendarVersion="0-0" />);

        fireEvent.click(screen.getByRole('button', { name: '✨ Get my game plan' }));

        expect(await screen.findByText(/Dinner with/)).toBeVisible();
        expect(screen.getByRole('button', { name: 'AI Game plan' })).toHaveAttribute('aria-expanded', 'true');
    });
});
