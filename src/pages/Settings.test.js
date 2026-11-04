import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Settings from './Settings';
import { AuthContext } from '../context/AuthContext';
import api from '../api/client';
import { getPreferences, resetPreferences } from '../services/preferences';

jest.mock('../api/client', () => ({
    __esModule: true,
    default: { get: jest.fn(), put: jest.fn(), patch: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));
const mockConnect = jest.fn();
jest.mock('@react-oauth/google', () => ({ useGoogleLogin: () => mockConnect }));

const DEFAULTS = {
    weekStart: 'monday', timeFormat: '24h', calendarView: 'auto', goingVisibility: 'friends', showInSuggestions: true,
    groupAdds: 'friends', searchable: true, likedTags: [], hiddenTags: [], homeCity: 'Munich', passwordLogin: true,
};
const alice = { id: 1, username: 'alice', contactData: { city: 'Munich', mobile: '123' } };

let serverSettings;

const renderSettings = ({ logout = jest.fn(), updateCurrentUser = jest.fn() } = {}) => render(
    <MemoryRouter>
        <AuthContext.Provider value={{ user: alice, logout, updateCurrentUser }}>
            <Settings />
        </AuthContext.Provider>
    </MemoryRouter>
);

/** The server applies a PATCH like the real one: merges and answers with all settings. */
const serverSaves = () => api.patch.mockImplementation((url, changes) => {
    serverSettings = { ...serverSettings, ...changes };
    return Promise.resolve({ data: serverSettings });
});

beforeEach(() => {
    jest.resetAllMocks();
    resetPreferences();
    serverSettings = { ...DEFAULTS };
    api.get.mockImplementation(url => (url === '/v1/settings'
        ? Promise.resolve({ data: serverSettings })
        : Promise.reject(new Error(`unexpected ${url}`))));
});

const loaded = () => screen.findByRole('heading', { name: 'Discover' });

test('settings has the way back, a link to edit the profile, and log out', async () => {
    const logout = jest.fn();
    renderSettings({ logout });
    await loaded();

    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Your profile' })).toHaveAttribute('href', '/people/1');
    expect(screen.getByRole('link', { name: 'edit your profile' })).toHaveAttribute('href', '/profile/edit');
    expect(screen.getByText('Logged in as @alice')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(logout).toHaveBeenCalled();
});

test('shows the saved settings', async () => {
    serverSettings = { ...DEFAULTS, weekStart: 'sunday', searchable: false, likedTags: ['#music'] };
    renderSettings();
    await loaded();

    expect(within(screen.getByRole('radiogroup', { name: 'Week starts on' })).getByRole('radio', { name: 'Sunday' })).toBeChecked();
    expect(within(screen.getByRole('radiogroup', { name: 'Time format' })).getByRole('radio', { name: '24-hour' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Let people find me by name' })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: 'Show me in friend suggestions' })).toBeChecked();
    expect(screen.getByLabelText('Home city')).toHaveValue('Munich');
    expect(within(screen.getByRole('list', { name: 'Topics I like' })).getByText('#music')).toBeInTheDocument();
    expect(getPreferences().weekStart).toBe('sunday');
});

test('a change is saved straight away and applies to the whole app', async () => {
    serverSaves();
    renderSettings();
    await loaded();

    fireEvent.click(screen.getByRole('radio', { name: '12-hour' }));

    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/v1/settings', { timeFormat: '12h' }));
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(getPreferences().timeFormat).toBe('12h');

    fireEvent.click(screen.getByRole('switch', { name: 'Show me in friend suggestions' }));
    await waitFor(() => expect(api.patch).toHaveBeenLastCalledWith('/v1/settings', { showInSuggestions: false }));

    fireEvent.click(screen.getByRole('radio', { name: 'Only me' }));
    await waitFor(() => expect(api.patch).toHaveBeenLastCalledWith('/v1/settings', { goingVisibility: 'only_me' }));
});

test('a refused change goes back and says why', async () => {
    api.patch.mockRejectedValue({ response: { data: { error: 'weekStart must be one of monday, sunday.' } } });
    renderSettings();
    await loaded();

    fireEvent.click(screen.getByRole('radio', { name: 'Sunday' }));

    expect(await screen.findByText('weekStart must be one of monday, sunday.')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Monday' })).toBeChecked();
    expect(getPreferences().weekStart).toBe('monday');
});

test('the home city has its own Save button and updates the cached profile', async () => {
    serverSaves();
    const updateCurrentUser = jest.fn();
    renderSettings({ updateCurrentUser });
    await loaded();

    const save = within(screen.getByRole('form', { name: 'Set your home city' })).getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Home city'), { target: { value: 'Berlin' } });
    fireEvent.click(save);

    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/v1/settings', { homeCity: 'Berlin' }));
    await waitFor(() => expect(updateCurrentUser).toHaveBeenCalledWith({ ...alice, contactData: { city: 'Berlin', mobile: '123' } }));
});

test('topics can be typed, picked from suggestions and removed', async () => {
    serverSaves();
    renderSettings();
    await loaded();

    fireEvent.change(screen.getByLabelText('Add a topic to topics i like'), { target: { value: 'Street Food' } });
    fireEvent.click(within(screen.getByRole('form', { name: 'Add to topics i like' })).getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(api.patch).toHaveBeenLastCalledWith('/v1/settings', { likedTags: ['#streetfood'] }));

    fireEvent.click(within(screen.getByRole('group', { name: 'Suggestions for topics to hide' })).getByRole('button', { name: '+ #gaming' }));
    await waitFor(() => expect(api.patch).toHaveBeenLastCalledWith('/v1/settings', { hiddenTags: ['#gaming'] }));
    // A hidden topic is not suggested as a liked one any more
    expect(within(screen.getByRole('group', { name: 'Suggestions for topics i like' })).queryByRole('button', { name: '+ #gaming' })).toBeNull();

    fireEvent.click(await screen.findByRole('button', { name: 'Remove #streetfood' }));
    await waitFor(() => expect(api.patch).toHaveBeenLastCalledWith('/v1/settings', { likedTags: [] }));
});

test('changing the password checks the new one first, then asks the server', async () => {
    api.put.mockResolvedValue({ data: { message: 'Password updated successfully.' } });
    renderSettings();
    await loaded();

    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'old-password' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'new-password-1' } });
    fireEvent.change(screen.getByLabelText('Repeat new password'), { target: { value: 'new-password-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByText("The new passwords don't match.")).toBeInTheDocument();
    expect(api.put).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Repeat new password'), { target: { value: 'new-password-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByText('Your password was changed.')).toBeInTheDocument();
    expect(api.put).toHaveBeenCalledWith('/v1/auth/password', { currentPassword: 'old-password', newPassword: 'new-password-1' });
    expect(screen.getByLabelText('Current password')).toHaveValue('');
});

test('a wrong current password shows the server reason', async () => {
    api.put.mockRejectedValue({ response: { status: 400, data: { error: 'Your current password is incorrect.' } } });
    renderSettings();
    await loaded();
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'nope' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'new-password-1' } });
    fireEvent.change(screen.getByLabelText('Repeat new password'), { target: { value: 'new-password-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Your current password is incorrect.');
});

test('Google accounts see why there is no password to change', async () => {
    serverSettings = { ...DEFAULTS, passwordLogin: false };
    renderSettings();
    await loaded();
    expect(screen.getByText('You sign in with Google, so there is no PlanMate password to change.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Current password')).toBeNull();
});

test('download my data saves a JSON file', async () => {
    const exported = { account: { email: 'alice@example.com' } };
    api.get.mockImplementation(url => Promise.resolve({ data: url === '/v1/account/export' ? exported : serverSettings }));
    const createObjectURL = jest.fn(() => 'blob:export');
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = jest.fn();
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    renderSettings();
    await loaded();
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/v1/account/export');
    const blob = createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe('application/json');
    click.mockRestore();
});

test('settings that fail to load can be tried again; Google Calendar and deleting still work', async () => {
    api.get.mockRejectedValueOnce(new Error('down'));
    renderSettings();

    expect(await screen.findByText(/Your settings could not be loaded/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect calendar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete account' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await loaded()).toBeInTheDocument();
});

test('Google Calendar is connected from settings', async () => {
    renderSettings();
    await loaded();
    expect(screen.getByRole('heading', { name: 'Google Calendar' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Connect calendar' }));
    expect(mockConnect).toHaveBeenCalled();
});

test('deleting the account asks first, then deletes and logs out', async () => {
    const logout = jest.fn();
    api.delete.mockResolvedValue({});
    renderSettings({ logout });
    await loaded();

    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
    expect(api.delete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Are you absolutely sure?')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete my data' }));

    await waitFor(() => expect(logout).toHaveBeenCalled());
    expect(api.delete).toHaveBeenCalledWith('/v1/users/1');
});

test('a failed delete says so and keeps you logged in', async () => {
    const logout = jest.fn();
    api.delete.mockRejectedValue(new Error('down'));
    renderSettings({ logout });
    await loaded();

    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete my data' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to delete account');
    expect(logout).not.toHaveBeenCalled();
});
