import { useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import GlassCalendar from './GlassCalendar';

const at = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min);
const NOW = at(2026, 11, 4, 15, 20);

const EVENTS = [
    { id: 'lunch', title: 'Lunch with Jonas', start: at(2026, 11, 4, 12, 30), end: at(2026, 11, 4, 13, 30), viewerRole: 'going', location: { name: 'Viktualienmarkt' } },
    { id: 'games', title: 'Board game night', start: at(2026, 11, 4, 19), end: at(2026, 11, 4, 22), viewerRole: 'invited', myResponse: 'maybe' },
    { id: 'jazz', title: 'Jazz night', start: at(2026, 11, 6, 20), end: at(2026, 11, 6, 23), isOwn: true },
];

let navigations;
const Harness = (props) => {
    const [date, setDate] = useState(NOW);
    return (
        <GlassCalendar events={EVENTS} date={date} now={NOW}
            onNavigate={d => { navigations.push(d); setDate(d); }} {...props} />
    );
};

const setup = (props = {}) => {
    navigations = [];
    const handlers = { onSelectEvent: jest.fn(), onSelectSlot: jest.fn(), onCreateEvent: jest.fn() };
    render(<Harness {...handlers} {...props} />);
    return handlers;
};

const panel = () => screen.getByRole('complementary');

test('the month view shows today in the day panel and another day when it is picked', () => {
    const { onSelectEvent, onSelectSlot } = setup();
    expect(screen.getByRole('heading', { name: 'November 2026' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wednesday 4 November, 2 events' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(panel()).getByText('Today')).toBeInTheDocument();
    expect(within(panel()).getByText('Lunch with Jonas')).toBeInTheDocument();
    expect(within(panel()).getByText('Going')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Friday 6 November, 1 event' }));
    expect(within(panel()).getByRole('heading', { name: '6 November' })).toBeInTheDocument();
    fireEvent.click(within(panel()).getByRole('button', { name: 'Jazz night, 20:00 – 23:00, Mine' }));
    expect(onSelectEvent).toHaveBeenCalledWith(EVENTS[2]);

    fireEvent.click(within(panel()).getByRole('button', { name: 'New event on 6 November' }));
    expect(onSelectSlot).toHaveBeenCalledWith(at(2026, 11, 6, 18), at(2026, 11, 6, 19));
});

test('a day without plans says so', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Thursday 5 November' }));
    expect(within(panel()).getByText(/Nothing planned/)).toBeInTheDocument();
});

test('the arrows move by the view, and Today comes back', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByRole('heading', { name: 'December 2026' })).toBeInTheDocument();
    expect(within(panel()).getByRole('heading', { name: '1 December' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(screen.getByRole('heading', { name: 'November 2026' })).toBeInTheDocument();
    expect(navigations[navigations.length - 1]).toEqual(NOW);
    expect(within(panel()).getByText('Today')).toBeInTheDocument();
});

test('the week view places events by time, and a day heading opens that day', () => {
    const { onSelectEvent } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Week' }));
    expect(screen.getByRole('button', { name: 'Week' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: '2 – 8 Nov 2026' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous week' })).toBeInTheDocument();

    const games = screen.getByRole('button', { name: 'Board game night, 19:00 – 22:00, Maybe' });
    expect(games).toHaveStyle({ top: `${(19 * 60 / 1440) * 100}%` });
    fireEvent.click(games);
    expect(onSelectEvent).toHaveBeenCalledWith(EVENTS[1]);

    fireEvent.click(screen.getByRole('button', { name: 'Show Friday 6 November' }));
    expect(screen.getByRole('button', { name: 'Day' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'Friday, 6 November' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jazz night, 20:00 – 23:00, Mine' })).toBeInTheDocument();
});

test('the agenda lists the next two weeks', () => {
    setup({ defaultView: 'agenda' });
    expect(screen.getByRole('heading', { name: '4 – 17 Nov 2026' })).toBeInTheDocument();
    const days = screen.getAllByRole('listitem').filter(li => li.classList.contains('cal-agenda-day'));
    expect(days).toHaveLength(2);
    expect(within(days[0]).getByText('Today')).toBeInTheDocument();
    expect(within(days[0]).getByText('Board game night')).toBeInTheDocument();
});

test('New event is in the toolbar when the page offers it', () => {
    const { onCreateEvent } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'New event' }));
    expect(onCreateEvent).toHaveBeenCalled();
});

test('private events get a lock, public ones do not', () => {
    const events = [
        { id: 'secret', title: 'Surprise party', start: at(2026, 11, 4, 18), end: at(2026, 11, 4, 20), isOwn: true, isPublic: false },
        { id: 'open', title: 'Open mic', start: at(2026, 11, 4, 21), end: at(2026, 11, 4, 22), isOwn: true, isPublic: true },
    ];
    render(<GlassCalendar events={events} date={NOW} now={NOW} onNavigate={() => {}} onSelectEvent={() => {}} />);
    const secret = within(panel()).getByRole('button', { name: 'Surprise party, 18:00 – 20:00, Mine, Private' });
    expect(within(secret).getByTitle('Private event')).toBeInTheDocument();
    const open = within(panel()).getByRole('button', { name: 'Open mic, 21:00 – 22:00, Mine' });
    expect(within(open).queryByTitle('Private event')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Week' }));
    expect(within(screen.getByRole('button', { name: /Surprise party/ })).getByTitle('Private event')).toBeInTheDocument();
});
