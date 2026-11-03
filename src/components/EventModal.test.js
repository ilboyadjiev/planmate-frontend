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
    // Bob's friends list contains the organizer, Alice; nobody is in a group
    api.get.mockImplementation(url => Promise.resolve({
        data: url === '/v1/groups' ? [] : [{ status: 'accepted', userA: alice, userB: bob }],
    }));
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
    expect(error).toHaveTextContent(/can no longer be invited/i);
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

test('invitees answer from the details view and see everyone\'s answers', async () => {
    const onRespond = jest.fn().mockResolvedValue();
    const answered = { ...invitedEvent, viewerRole: 'invited', myResponse: 'pending', participants: [{ id: '2' }, { id: '3' }], responses: { 3: 'declined' } };
    renderAs(bob, <EventModal show initialData={answered} onSave={jest.fn()} onHide={jest.fn()} readOnly onRespond={onRespond} />);

    expect(await screen.findByText(/not answered yet/i)).toBeInTheDocument(); // Bob himself
    expect(screen.getByText(/can't go$/i, { selector: '.participant-response' })).toBeInTheDocument(); // participant 3
    const going = screen.getByRole('button', { name: 'Going' });
    expect(going).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(going);
    expect(onRespond).toHaveBeenCalledWith('accepted');
});

test('a failed answer is reported below the answer buttons', async () => {
    const onRespond = jest.fn().mockRejectedValue(new Error('offline'));
    renderAs(bob, <EventModal show initialData={{ ...invitedEvent, viewerRole: 'invited', myResponse: 'maybe' }} onSave={jest.fn()} onHide={jest.fn()} readOnly onRespond={onRespond} />);

    expect(screen.getByRole('button', { name: 'Maybe' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: "Can't go" }));

    expect(await screen.findByText(/could not be saved/i)).toHaveAttribute('id', 'rsvp-error');
});

describe('inviting friend groups', () => {
    const carol = { id: 3, username: 'carol', firstName: 'Carol' }; // not Alice's friend, but in her group
    const boardGames = { id: 7, name: 'Board games', members: [alice, bob, carol] };
    const dixit = { title: 'Dixit', start: new Date('2026-11-15T18:00:00Z'), end: new Date('2026-11-15T20:00:00Z'), participants: [], groups: [], tags: [] };

    beforeEach(() => {
        api.get.mockImplementation(url => Promise.resolve({
            data: url === '/v1/groups' ? [boardGames] : [{ status: 'accepted', userA: alice, userB: bob }],
        }));
    });

    test('one click invites the whole group, and the group is saved with the event', async () => {
        const onSave = jest.fn().mockResolvedValue();
        renderAs(alice, <EventModal show isNewEvent initialData={dixit} onSave={onSave} onHide={jest.fn()} />);

        fireEvent.click(await screen.findByRole('button', { name: '+ Board games (2)' }));

        expect(screen.getByText('2 invited')).toBeInTheDocument();
        expect(screen.getByText('@carol')).toBeInTheDocument(); // named via the group, though not a friend
        expect(screen.queryByRole('button', { name: /\+ Board games/ })).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /create event/i }));
        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ groups: [{ id: 7 }] }));
    });

    test('removing a group uninvites its members but keeps people invited on their own', async () => {
        const onSave = jest.fn().mockResolvedValue();
        // As loaded from the server: the group's members were added to the participants
        const saved = { ...dixit, id: 'e9', participants: [{ id: '2' }, { id: '3' }, { id: '4' }], groups: [{ id: '7' }], responses: {} };
        renderAs(alice, <EventModal show initialData={saved} onSave={onSave} onHide={jest.fn()} />);

        fireEvent.click(await screen.findByRole('button', { name: 'Remove group Board games' }));
        fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ groups: [], participants: [{ id: '4' }] }));
    });

    test('invitees see the groups they are in', async () => {
        const invite = { ...dixit, id: 'e9', creatorId: alice.email, viewerRole: 'invited', participants: [{ id: '2' }, { id: '3' }], groups: [{ id: '7' }], responses: { 3: 'accepted' } };
        api.get.mockImplementation(url => Promise.resolve({
            data: url === '/v1/groups' ? [boardGames] : [{ status: 'accepted', userA: alice, userB: bob }],
        }));
        renderAs(bob, <EventModal show initialData={invite} onSave={jest.fn()} onHide={jest.fn()} readOnly />);

        expect(await screen.findByText('Invited groups')).toBeInTheDocument();
        expect(screen.getByText('Board games')).toBeInTheDocument();
        expect(screen.getByText(/going$/i, { selector: '.participant-response' })).toBeInTheDocument(); // Carol
    });
});
