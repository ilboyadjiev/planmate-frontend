import { render, screen, fireEvent } from '@testing-library/react';
import EventModal from './EventModal';
import LocationSearch from './LocationSearch';
import { AuthContext } from '../context/AuthContext';
import api from '../api/client';

jest.mock('../api/client', () => ({ __esModule: true, default: { get: jest.fn() } }));

const bob = { id: 2, email: 'bob@example.com', username: 'bob', firstName: 'Bob' };
const alice = { id: 1, email: 'alice@example.com', username: 'alice', firstName: 'Alice' };

const invitedEvent = {
    id: 'e1',
    title: 'Climbing',
    creatorId: alice.email,
    start: new Date('2026-11-15T10:00:00Z'),
    end: new Date('2026-11-15T12:00:00Z'),
    description: 'Bring shoes',
    location: { name: 'Boulderwelt' },
    participants: [{ id: '2' }],
    tags: ['#sport'],
    isPublic: false,
};

const renderAs = (user, ui) => render(<AuthContext.Provider value={{ user }}>{ui}</AuthContext.Provider>);

beforeEach(() => {
    api.get.mockReset();
    // Bob's friends list contains the organizer, Alice
    api.get.mockResolvedValue({ data: [{ status: 'accepted', userA: alice, userB: bob }] });
});

test('participants see invited events read-only, with the organizer and no way to save', async () => {
    renderAs(bob, <EventModal show initialData={invitedEvent} onSave={jest.fn()} onHide={jest.fn()} readOnly />);

    expect(screen.getByText(/only the organizer can make changes/i)).toBeInTheDocument();
    expect(await screen.findByText('Alice @alice')).toBeInTheDocument();
    expect(screen.getByText('Boulderwelt')).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});

test('free text typed into the location field is kept as the location', () => {
    const onSelectLocation = jest.fn();
    renderAs(null, <LocationSearch onSelectLocation={onSelectLocation} enableSuggestions={false} />);

    fireEvent.change(screen.getByPlaceholderText(/type a location/i), { target: { value: '  Grandma\'s garden ' } });
    expect(onSelectLocation).toHaveBeenLastCalledWith({ name: 'Grandma\'s garden' });

    fireEvent.change(screen.getByPlaceholderText(/type a location/i), { target: { value: '   ' } });
    expect(onSelectLocation).toHaveBeenLastCalledWith(null);
    expect(api.get).not.toHaveBeenCalled(); // guests never hit the metered autocomplete
});

const ownEvent = { ...invitedEvent, creatorId: alice.email };

test('a rejected participant list is reported below the participants field and keeps the form open', async () => {
    const onSave = jest.fn().mockRejectedValue({ response: { status: 400 } });
    renderAs(alice, <EventModal show isNewEvent initialData={ownEvent} onSave={onSave} onHide={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /create event/i }));

    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent(/participants must be your friends/i);
    expect(screen.getByPlaceholderText(/search friends/i)).toHaveAttribute('aria-describedby', error.id);
    expect(onSave).toHaveBeenCalled();
});

test('a missing title is shown below the title field and clears when typing', () => {
    const onSave = jest.fn();
    renderAs(alice, <EventModal show isNewEvent initialData={{ ...ownEvent, title: '' }} onSave={onSave} onHide={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /create event/i }));

    const titleInput = screen.getByPlaceholderText(/weekend hike/i);
    const error = screen.getByRole('alert');
    expect(error).toHaveTextContent(/give the event a title/i);
    expect(titleInput).toHaveAttribute('aria-invalid', 'true');
    expect(titleInput).toHaveAttribute('aria-describedby', error.id);
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.change(titleInput, { target: { value: 'Climbing' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(titleInput).toHaveAttribute('aria-invalid', 'false');
});

test('all invalid fields are reported at once, each below its own field', () => {
    const backwards = { ...ownEvent, title: ' ', start: new Date('2026-11-15T12:00:00Z'), end: new Date('2026-11-15T10:00:00Z') };
    renderAs(alice, <EventModal show isNewEvent initialData={backwards} onSave={jest.fn()} onHide={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /create event/i }));

    const messages = screen.getAllByRole('alert').map(a => a.id);
    expect(messages).toEqual(['title-error', 'datetime-error']);
    expect(screen.getByText(/end must be after the start/i)).toBeInTheDocument();
});
