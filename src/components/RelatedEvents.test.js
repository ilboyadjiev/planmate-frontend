import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RelatedEvents from './RelatedEvents';
import api from '../api/client';

jest.mock('../api/client', () => ({ __esModule: true, default: { get: jest.fn() } }));

const date = (id, startTime, extra = {}) => ({
    id, title: 'HULLIS - Comedy. Dinner. Show.', startTime, endTime: startTime.replace('T19', 'T22'),
    location: { name: 'Hullis Theater' }, ...extra,
});

const renderList = (props = {}) => render(
    <MemoryRouter><RelatedEvents eventId="tm-2" {...props} /></MemoryRouter>
);

beforeEach(() => jest.resetAllMocks());

test('lists the other dates and similar events, each linking to its page', async () => {
    api.get.mockResolvedValue({ data: {
        moreDates: [date('tm-3', '2030-11-14T19:00:00'), date('tm-4', '2030-11-21T19:00:00', { going: true })],
        similar: [{ id: 'tm-9', title: 'Stand-up Night', startTime: '2030-11-15T20:00:00', endTime: '2030-11-15T22:00:00',
            location: { name: 'Club' }, moreDates: 2 }],
    } });
    const onNavigate = jest.fn();
    renderList({ onNavigate });

    expect(await screen.findByRole('heading', { name: 'More dates' })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/v2/events/tm-2/related');
    expect(within(screen.getByRole('region', { name: 'More dates' })).getAllByRole('link')).toHaveLength(2);
    expect(screen.getByRole('link', { name: /Thursday, 14 November 2030/ })).toHaveAttribute('href', '/events/tm-3');
    expect(screen.getByText("You're going")).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Similar events' })).toBeInTheDocument();
    const standUp = screen.getByRole('link', { name: /Stand-up Night/ });
    expect(standUp).toHaveAttribute('href', '/events/tm-9');
    expect(standUp).toHaveTextContent('Club');
    expect(standUp).toHaveTextContent('+2 more dates');

    fireEvent.click(standUp);
    expect(onNavigate).toHaveBeenCalled();
});

test('shows nothing when there is nothing related or it could not be loaded', async () => {
    api.get.mockResolvedValue({ data: { moreDates: [], similar: [] } });
    const { unmount } = renderList();
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    unmount();

    api.get.mockRejectedValue(new Error('offline'));
    renderList();
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
});
