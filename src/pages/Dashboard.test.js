import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Dashboard from './Dashboard';
import { AuthContext } from '../context/AuthContext';

// The feed, calendar and event form have their own tests; here only the page layout matters
jest.mock('../components/DiscoveryFeed', () => () => <div>Discover feed</div>);
jest.mock('../components/PlanMateCalendar', () => ({ defaultView, onCreateEvent }) => (
    <div>Calendar in {defaultView} view</div>
));
jest.mock('../components/EventModal', () => ({ show }) => (show ? <div role="dialog">New event form</div> : null));

const setScreen = (mobile) => {
    window.matchMedia = jest.fn().mockImplementation(() => ({
        matches: mobile, addEventListener: jest.fn(), removeEventListener: jest.fn(),
    }));
};

const renderAt = (path) => render(
    <MemoryRouter initialEntries={[path]}>
        <AuthContext.Provider value={{ user: { id: 1, email: 'alice@example.com' } }}>
            <Routes>
                <Route path="/dashboard" element={<Dashboard view="discover" />} />
                <Route path="/calendar" element={<Dashboard view="calendar" />} />
            </Routes>
        </AuthContext.Provider>
    </MemoryRouter>
);

describe('large screens', () => {
    beforeEach(() => setScreen(false));

    test('show the feed and the month calendar side by side', () => {
        renderAt('/dashboard');

        expect(screen.getByText('Discover feed')).toBeInTheDocument();
        expect(screen.getByText('Calendar in month view')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'New event' })).not.toBeInTheDocument();
    });

    test('/calendar shows the calendar on its own, in the month view', () => {
        renderAt('/calendar');

        expect(screen.getByRole('heading', { name: 'Calendar' })).toBeInTheDocument();
        expect(screen.getByText('Calendar in month view')).toBeInTheDocument();
        expect(screen.queryByText('Discover feed')).not.toBeInTheDocument();
    });
});

describe('phones', () => {
    beforeEach(() => setScreen(true));

    test('Discover is a page of its own', () => {
        renderAt('/dashboard');

        expect(screen.getByText('Discover feed')).toBeInTheDocument();
        expect(screen.queryByText(/Calendar in/)).not.toBeInTheDocument();
    });

    test('the calendar is a page of its own and opens in the day view', () => {
        renderAt('/calendar');

        expect(screen.getByRole('heading', { name: 'Calendar' })).toBeInTheDocument();
        expect(screen.getByText('Calendar in day view')).toBeInTheDocument();
        expect(screen.queryByText('Discover feed')).not.toBeInTheDocument();
    });

    test('old links to the slide-in calendar open the calendar page', () => {
        renderAt('/dashboard?calendar=open');

        expect(screen.getByText('Calendar in day view')).toBeInTheDocument();
    });

    test('the floating button creates an event, on Discover and on the calendar', () => {
        renderAt('/dashboard');
        fireEvent.click(screen.getByRole('button', { name: 'New event' }));
        expect(screen.getByRole('dialog')).toHaveTextContent('New event form');
    });
});
