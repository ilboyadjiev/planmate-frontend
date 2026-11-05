import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PlanMateCalendar from './PlanMateCalendar';
import { AuthContext } from '../context/AuthContext';
import api from '../api/client';
import { resetPreferences, setPreferences } from '../services/preferences';

jest.mock('../api/client', () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock('./GamePlan', () => ({ __esModule: true, default: () => <section aria-label="AI Game plan" /> }));

const renderCalendar = () => render(
    <MemoryRouter>
        <AuthContext.Provider value={{ user: { id: 1, email: 'alice@example.com' } }}>
            <PlanMateCalendar userEmail="alice@example.com" refreshKey={0} onSlotSelect={jest.fn()} onCreateEvent={jest.fn()} />
        </AuthContext.Provider>
    </MemoryRouter>
);

beforeEach(() => {
    jest.resetAllMocks();
    resetPreferences();
    api.get.mockResolvedValue({ data: [] });
});

test('the AI Game plan shows above the calendar, unless it is turned off in Settings', async () => {
    renderCalendar();
    expect(await screen.findByRole('region', { name: 'AI Game plan' })).toBeInTheDocument();

    act(() => setPreferences({ aiGamePlan: false }));
    expect(screen.queryByRole('region', { name: 'AI Game plan' })).toBeNull();
    expect(screen.getByRole('region', { name: 'Calendar' })).toBeInTheDocument();
});
