import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
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

// The details link tags to Discover, so the modal lives inside a router like in the app
const renderAs = (user, ui, url = '/calendar') => render(
    <MemoryRouter initialEntries={[url]}>
        <AuthContext.Provider value={{ user }}>{ui}</AuthContext.Provider>
        <Routes>
            <Route path="*" element={<ShowLocation />} />
        </Routes>
    </MemoryRouter>
);
const ShowLocation = () => {
    const location = useLocation();
    return <output data-testid="location">{location.pathname + location.search}</output>;
};

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
    // Bob, the only invitee, is not listed as someone else: his own answer is in the answer buttons
    expect(screen.queryByText(/friends going/i)).not.toBeInTheDocument();
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

    // Participant 3 is not Bob's friend: listed under "Other people invited", closed at first
    const others = await screen.findByRole('button', { name: /other people invited/i });
    expect(others).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(others);
    expect(screen.getByText(/can't go$/i, { selector: '.person-line .participant-response' })).toBeVisible();
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

        const inviteGroup = await screen.findByRole('button', { name: /invite a group/i });
        expect(inviteGroup).toHaveAttribute('aria-expanded', 'false'); // closed by default
        fireEvent.click(inviteGroup);
        fireEvent.click(screen.getByRole('button', { name: '+ Board games (2)' }));

        expect(screen.getByText('2 invited')).toBeInTheDocument();
        expect(screen.getByText('Carol')).toBeInTheDocument(); // named via the group, though not a friend
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
});

test('the organizer sees who answered what, with names even for people who are not their friends', async () => {
    // As loaded from the server for the organizer: every invitee's name comes with the event
    const dinner = {
        ...ownEvent, id: 'e5', viewerRole: 'host',
        participants: [
            { id: '2', firstName: 'Bob', username: 'bob' },
            { id: '3', firstName: 'Carol', lastName: 'Jones', username: 'carol' },
            { id: '4', username: 'dave' },
            { id: '5', firstName: 'Erin', username: 'erin' },
        ],
        responses: { 2: 'accepted', 3: 'declined', 5: 'accepted' },
    };
    renderAs(alice, <EventModal show initialData={dinner} onSave={jest.fn()} onHide={jest.fn()} />);

    const answers = await screen.findByRole('region', { name: 'Answers' });
    expect(answers).toHaveTextContent("2 going · 1 can't go · 1 not answered");
    const rows = within(answers).getAllByRole('term').map((term, i) =>
        [term.textContent, within(answers).getAllByRole('definition')[i].textContent]);
    expect(rows).toEqual([
        ['Going (2)', 'Bob, Erin'],
        ["Can't go (1)", 'Carol Jones'],
        ['Not answered yet (1)', '@dave'],
    ]);
});

test('new events have no answers yet', () => {
    renderAs(alice, <EventModal show isNewEvent initialData={{ ...ownEvent, participants: [{ id: '2' }] }} onSave={jest.fn()} onHide={jest.fn()} />);

    expect(screen.queryByRole('region', { name: 'Answers' })).not.toBeInTheDocument();
});

describe("who's invited, as an invitee sees it (Alice's birthday)", () => {
    // Alice plans her birthday and invites the group "Trip to Italy" (Alice, Bob, Charlie) plus David, Elena and Fred.
    // David is friends with everyone but not in the group. Fred only knows Alice.
    const alice2 = { id: 1, firstName: 'Alice', username: 'alice' };
    const bob2 = { id: 2, firstName: 'Bob', username: 'bob' };
    const charlie = { id: 3, firstName: 'Charlie', username: 'charlie' };
    const david = { id: 4, firstName: 'David', username: 'david' };
    const elena = { id: 5, firstName: 'Elena', username: 'elena' };
    const fred = { id: 6, firstName: 'Fred', username: 'fred' };
    const tripToItaly = { id: 7, name: 'Trip to Italy', members: [alice2, bob2, charlie] };
    const everyone = [bob2, charlie, david, elena, fred];

    // What the server sends each invitee: everyone's names, and only the invited groups they are in
    const birthday = (viewer, groupIds) => ({
        id: 'bday', title: "Alice's birthday", start: new Date('2026-11-20T18:00:00Z'), end: new Date('2026-11-20T23:00:00Z'),
        viewerRole: 'invited', myResponse: 'pending', creatorId: 'alice@example.com', organizer: alice2, hostName: 'Alice',
        participants: everyone.map(p => ({ ...p, id: String(p.id) })), groups: groupIds.map(id => ({ id })),
        responses: { 2: 'accepted', 4: 'maybe', 5: 'accepted' }, tags: [],
    });

    const viewAs = (viewer, friends, groups, groupIds) => {
        api.get.mockImplementation(url => Promise.resolve({
            data: url === '/v1/groups' ? groups
                : friends.map((f, i) => ({ id: 100 + i, status: 'accepted', userA: viewer, userB: f })),
        }));
        renderAs(viewer, <EventModal show initialData={birthday(viewer, groupIds)} onSave={jest.fn()} onHide={jest.fn()} readOnly />);
    };

    // Each line's pill: "First name · answer" and "@username"
    const lineTexts = (container) => within(container).getAllByRole('listitem').map(li =>
        `${within(li).getByText(/./, { selector: '.person-pill-name' }).textContent} ${within(li).getByText(/^@/).textContent}`);

    test('Charlie (in the group) sees Alice and Bob inside a "Trip to Italy" bubble under Friends', async () => {
        viewAs(charlie, [alice2, bob2, david], [tripToItaly], [7]);

        const friendsToggle = await screen.findByRole('button', { name: /^Friends/ });
        expect(friendsToggle).toHaveAttribute('aria-expanded', 'true'); // open by default
        const group = await screen.findByRole('group', { name: 'Group: Trip to Italy' });
        expect(lineTexts(group)).toEqual(['Alice · organizer @alice', 'Bob · Going @bob']);
        // David is outside the group, Elena and Fred are not Charlie's friends
        expect(screen.getByText(/^David/, { selector: '.person-line .person-pill-name' })).toBeVisible();
        expect(screen.getByRole('button', { name: /other people invited/i })).toHaveAttribute('aria-expanded', 'false');
        expect(screen.getByRole('button', { name: /other people invited/i })).toHaveTextContent('2');
        expect(screen.queryByText(/invited groups/i)).not.toBeInTheDocument();
    });

    test('David (friends with everyone, not in the group) sees his friends one per line and nothing about the group', async () => {
        viewAs(david, [alice2, bob2, charlie, elena, fred], [], []); // the server sends him no group ids

        await screen.findByRole('button', { name: /^Friends/ });
        expect(screen.queryByRole('group', { name: /Group:/ })).not.toBeInTheDocument();
        expect(screen.queryByText('Trip to Italy')).not.toBeInTheDocument();
        const friends = screen.getAllByRole('list')[0];
        expect(lineTexts(friends)).toEqual(['Bob · Going @bob', 'Elena · Going @elena', 'Charlie · Not answered yet @charlie', 'Fred · Not answered yet @fred']);
        expect(screen.queryByRole('button', { name: /other people invited/i })).not.toBeInTheDocument();
    });

    test('Fred (only knows Alice) sees four other people invited, closed, each with Add friend', async () => {
        viewAs(fred, [alice2], [], []);

        const others = await screen.findByRole('button', { name: /other people invited/i });
        expect(others).toHaveTextContent('4');
        expect(others).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByRole('button', { name: /^Friends/ })).not.toBeInTheDocument();

        fireEvent.click(others);
        const lines = within(screen.getByRole('list')).getAllByRole('listitem');
        expect(lines).toHaveLength(4);
        expect(within(lines[0]).getByText('Bob')).toBeVisible();
        expect(within(lines[0]).getByRole('button', { name: 'Add Bob as a friend' })).toBeVisible();
    });
});

test('a tag in the details closes them and shows more events with that tag on Discover', () => {
    const onHide = jest.fn();
    renderAs(bob, <EventModal show initialData={invitedEvent} onSave={jest.fn()} onHide={onHide} readOnly />);

    fireEvent.click(screen.getByRole('button', { name: 'Show more #sport events' }));

    expect(onHide).toHaveBeenCalled();
    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard?tag=%23sport');
});

describe('Export to calendar', () => {
    const concert = {
        id: 'tm-1', title: 'Jazz night', creatorId: 'events@planmate.org', hostName: 'PlanMate Picks',
        start: new Date('2030-11-15T19:00:00Z'), end: new Date('2030-11-15T22:00:00Z'),
        participants: [], tags: [], isPublic: true, viewerRole: null, isOwn: false,
    };
    const exportTo = async (name) => {
        fireEvent.click(screen.getByRole('button', { name: 'Export to calendar' }));
        fireEvent.click(screen.getByRole('link', { name: new RegExp(name) }));
    };

    test('exporting a public event also joins it, so it is in the PlanMate calendar as going', async () => {
        const onJoin = jest.fn().mockResolvedValue({});
        renderAs(bob, <EventModal show initialData={concert} onSave={jest.fn()} onHide={jest.fn()} readOnly onJoin={onJoin} />);

        await exportTo('Google Calendar');
        expect(onJoin).toHaveBeenCalledTimes(1);
        expect(await screen.findByText(/You're going/)).toBeInTheDocument();
    });

    test('exporting an invitation accepts it', async () => {
        const onRespond = jest.fn().mockResolvedValue();
        const invite = { ...invitedEvent, start: concert.start, end: concert.end, viewerRole: 'invited', myResponse: 'pending' };
        renderAs(bob, <EventModal show initialData={invite} onSave={jest.fn()} onHide={jest.fn()} readOnly onRespond={onRespond} />);

        await exportTo('Outlook');
        expect(onRespond).toHaveBeenCalledWith('accepted');
    });

    test('people already going, guests and past events are left as they are', async () => {
        const onJoin = jest.fn().mockResolvedValue({});
        const { unmount } = renderAs(bob, <EventModal show initialData={{ ...concert, viewerRole: 'going' }} onSave={jest.fn()} onHide={jest.fn()} readOnly onJoin={onJoin} />);
        await exportTo('Google Calendar');
        unmount();

        const past = { ...concert, start: new Date('2020-01-01T19:00:00Z'), end: new Date('2020-01-01T22:00:00Z') };
        const view = renderAs(bob, <EventModal show initialData={past} onSave={jest.fn()} onHide={jest.fn()} readOnly onJoin={onJoin} />);
        await exportTo('Google Calendar');
        view.unmount();

        renderAs(null, <EventModal show initialData={concert} onSave={jest.fn()} onHide={jest.fn()} readOnly onJoin={onJoin} />);
        await exportTo('Google Calendar');
        expect(onJoin).not.toHaveBeenCalled();
    });
});
