import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InvitationsPanel from './InvitationsPanel';

const mockRespond = vi.fn().mockResolvedValue({});
const mockList = vi.fn();
const mockDismiss = vi.fn().mockResolvedValue();

vi.mock('../../services/preferences', () => ({
    usePreferences: () => ({ timeFormat: '24h' }),
    formatTime: () => '18:30',
}));
vi.mock('../../services/eventService', () => ({
    respondToInvite: (...args) => mockRespond(...args),
    toCalendarEvent: (event) => event,
}));
vi.mock('../../services/inviteEvents', () => ({
    listUnansweredInvites: (...args) => mockList(...args),
    dismissInvite: (...args) => mockDismiss(...args),
    notifyInvitesChanged: () => {},
    INVITES_CHANGED: 'planmate:invites-changed',
}));

const invites = () => ([
    { id: 'a', title: 'Board game night', startTime: '2026-11-10T18:00:00Z', location: { name: 'Café' }, organizer: { firstName: 'Maya', lastName: 'Schmidt' } },
    { id: 'b', title: "Lena's dinner", startTime: '2026-11-15T19:00:00Z', location: { name: 'Trattoria' }, organizer: { username: 'lena' } },
]);

const renderPanel = (props) => render(
    <InvitationsPanel user={{ id: 1 }} onOpen={vi.fn()} onChanged={vi.fn()} {...props} />
);

beforeEach(() => {
    mockRespond.mockClear();
    mockDismiss.mockClear();
    mockList.mockResolvedValue(invites());
});

test('lists the unanswered invitations', async () => {
    renderPanel();
    expect(await screen.findByText('Board game night')).toBeInTheDocument();
    expect(screen.getByText("Lena's dinner")).toBeInTheDocument();
});

test('renders nothing when there are no invitations', async () => {
    mockList.mockResolvedValue([]);
    const { container } = renderPanel();
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
});

test('answering Going sends the response and removes the invitation', async () => {
    const onChanged = vi.fn();
    renderPanel({ onChanged });
    await screen.findByText('Board game night');

    fireEvent.click(screen.getAllByRole('button', { name: 'Respond' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Going' })[0]);

    await waitFor(() => expect(mockRespond).toHaveBeenCalledWith('a', 'accepted'));
    await waitFor(() => expect(screen.queryByText('Board game night')).not.toBeInTheDocument());
    expect(onChanged).toHaveBeenCalled();
});

test('dismissing removes the invitation without answering', async () => {
    renderPanel();
    await screen.findByText("Lena's dinner");

    fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss' })[1]);

    await waitFor(() => expect(mockDismiss).toHaveBeenCalledWith('b'));
    await waitFor(() => expect(screen.queryByText("Lena's dinner")).not.toBeInTheDocument());
    expect(mockRespond).not.toHaveBeenCalled();
});

test('opens the event details when a row is clicked', async () => {
    const onOpen = vi.fn();
    renderPanel({ onOpen });
    fireEvent.click(await screen.findByRole('button', { name: 'Open Board game night' }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
});
