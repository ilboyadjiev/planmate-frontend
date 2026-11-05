import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddToCalendar from './AddToCalendar';
import api from '../../api/client';

jest.mock('../../api/client', () => ({ __esModule: true, default: { get: jest.fn() } }));

const jazz = { id: 'abc', title: 'Jazz night', start: '2026-11-07T18:00:00Z', end: '2026-11-07T22:00:00Z', isPublic: true };

beforeEach(() => jest.resetAllMocks());

test('offers Google Calendar, Outlook and an .ics file, and closes with Escape', () => {
    render(<AddToCalendar event={jazz} />);
    const button = screen.getByRole('button', { name: 'Add to calendar' });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: /Google Calendar/ })).toHaveAttribute('href', expect.stringContaining('calendar.google.com'));
    expect(screen.getByRole('link', { name: /Outlook/ })).toHaveAttribute('target', '_blank');
    // Public events link straight to the file, which phones open in their calendar app
    expect(screen.getByRole('link', { name: /Apple, Samsung & other apps/ })).toHaveAttribute('href', expect.stringContaining('/api/v2/events/abc/calendar.ics'));

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('group', { name: 'Add to calendar' })).toBeNull();
});

test('private events are downloaded with the login', async () => {
    api.get.mockResolvedValue({ data: new Blob(['BEGIN:VCALENDAR'], { type: 'text/calendar' }) });
    URL.createObjectURL = jest.fn(() => 'blob:ics');
    URL.revokeObjectURL = jest.fn();
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<AddToCalendar event={{ ...jazz, isPublic: false }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add to calendar' }));
    fireEvent.click(screen.getByRole('button', { name: /Apple, Samsung & other apps/ }));

    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/v2/events/abc/calendar.ics', { responseType: 'blob' });
    click.mockRestore();
});
