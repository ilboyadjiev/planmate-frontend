import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FeedEventCard from './FeedEventCard';
import { socialProof, formatWhen } from './feedText';

const jonas = { id: 2, firstName: 'Jonas', lastName: 'Schmidt', username: 'jonas' };
const lena = { id: 3, firstName: 'Lena', username: 'lena' };
const tim = { id: 4, firstName: 'Tim', username: 'tim' };
const ana = { id: 5, username: 'ana' };

const boardGames = {
    id: 'e1',
    title: 'Board game night',
    description: 'Bring your favourite game.',
    startTime: '2026-11-06T18:00:00Z',
    endTime: '2026-11-06T22:00:00Z',
    location: { name: 'Café Spielwiese' },
    tags: ['#gaming', '#munich'],
    host: { name: 'Maya Schneider', username: 'maya', friend: true, you: false },
    attendeeCount: 14,
    friendsGoing: [jonas, lena, tim, ana],
    going: false,
    hosting: false,
};

const renderCard = (props) => render(
    <MemoryRouter>
        <FeedEventCard event={boardGames} loggedIn pending={false} onToggleGoing={jest.fn()} {...props} />
    </MemoryRouter>
);

describe('who is going', () => {
    test.each([
        [{ friendsGoing: [jonas, lena, tim, ana], attendeeCount: 14 }, 'Jonas, Lena + 2 friends going', '14 going in total'],
        [{ friendsGoing: [lena], attendeeCount: 23 }, 'Lena is going', '23 going in total'],
        [{ friendsGoing: [jonas, lena], attendeeCount: 2 }, 'Jonas and Lena are going', ''],
        [{ friendsGoing: [], attendeeCount: 38 }, '38 people going', 'None of your friends yet'],
        [{ friendsGoing: [], attendeeCount: 1 }, '1 person going', 'None of your friends yet'],
        [{ friendsGoing: [], attendeeCount: 0 }, 'Be the first to go', ''],
        [{ friendsGoing: [jonas, lena], attendeeCount: 15, going: true }, 'You, Jonas + 1 friend going', '15 going in total'],
        [{ friendsGoing: [], attendeeCount: 1, going: true }, "You're going", ''],
    ])('%j', (event, headline, detail) => {
        expect(socialProof(event, true)).toEqual({ headline, detail });
    });

    test('guests only see the total and a nudge to log in', () => {
        expect(socialProof({ friendsGoing: [], attendeeCount: 23 }, false))
            .toEqual({ headline: '23 people going', detail: 'Log in to see which friends' });
    });
});

test('times show both dates only when an event runs past midnight', () => {
    expect(formatWhen('2026-11-06T18:00:00', '2026-11-06T22:00:00')).toBe('Fri, 18:00 – 22:00');
    expect(formatWhen('2026-11-06T22:00:00', '2026-11-07T02:00:00')).toBe('Fri 6 Nov, 22:00 – Sat 7 Nov, 02:00');
    expect(formatWhen('2026-11-06T18:00:00', '2026-11-06T22:00:00', '12h')).toBe('Fri, 6:00 PM – 10:00 PM');
});

test('the card shows host, place, tags and up to three friend avatars', () => {
    renderCard();

    expect(screen.getByRole('heading', { name: 'Board game night' })).toBeInTheDocument();
    expect(screen.getByText('Maya Schneider')).toBeInTheDocument();
    expect(screen.getByText('Friend')).toBeInTheDocument();
    expect(screen.getByText('Café Spielwiese')).toBeInTheDocument();
    expect(screen.getByText('#gaming')).toBeInTheDocument();
    expect(screen.getByText('Jonas, Lena + 2 friends going')).toBeInTheDocument();
    expect(screen.getByText('JS')).toBeInTheDocument();
    expect(screen.queryByText('A')).not.toBeInTheDocument(); // the fourth friend is only counted
});

test("I'm going joins, and Going leaves", () => {
    const onToggleGoing = jest.fn();
    const { unmount } = renderCard({ onToggleGoing });
    fireEvent.click(screen.getByRole('button', { name: /i'm going/i }));
    expect(onToggleGoing).toHaveBeenCalledWith(boardGames);
    unmount();

    renderCard({ event: { ...boardGames, going: true }, onToggleGoing });
    const going = screen.getByRole('button', { name: /going.*leave/i });
    expect(going).toHaveAttribute('aria-pressed', 'true');
});

test('own events have no button, and guests are sent to log in', () => {
    const { unmount } = renderCard({ event: { ...boardGames, hosting: true, host: { name: 'Alice', you: true } } });
    expect(screen.getByText("You're hosting")).toBeInTheDocument();
    expect(screen.getByText('you')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    unmount();

    renderCard({ loggedIn: false, event: { ...boardGames, friendsGoing: [] } });
    expect(screen.getByRole('link', { name: 'Log in to join' })).toHaveAttribute('href', '/login');
});

test('a cancelled event says so instead of offering to join', () => {
    render(
        <MemoryRouter>
            <FeedEventCard event={{ ...boardGames, cancelled: true }} loggedIn onToggleGoing={jest.fn()} />
        </MemoryRouter>
    );
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: "I'm going" })).toBeNull();
});

describe('source link', () => {
    test('a discovered event links to its source page', () => {
        renderCard({ event: { ...boardGames, sourceUrl: 'https://www.ticketmaster.de/event/9' } });
        expect(screen.getByText(/Read more here:/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'ticketmaster.de' })).toHaveAttribute('href', 'https://www.ticketmaster.de/event/9');
    });

    test('other events show no source link', () => {
        renderCard();
        expect(screen.queryByText(/Read more here/)).not.toBeInTheDocument();
    });
});

describe('more dates', () => {
    test('a show with more dates says how many', () => {
        renderCard({ event: { ...boardGames, moreDates: 4 } });
        expect(screen.getByText('+4 more dates')).toBeInTheDocument();
    });

    test('one more date, and none', () => {
        const { unmount } = renderCard({ event: { ...boardGames, moreDates: 1 } });
        expect(screen.getByText('+1 more date')).toBeInTheDocument();
        unmount();
        renderCard();
        expect(screen.queryByText(/more date/)).not.toBeInTheDocument();
    });
});
