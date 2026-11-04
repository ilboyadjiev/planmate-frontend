import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Settings from './Settings';
import { AuthContext } from '../context/AuthContext';
import api from '../api/client';

jest.mock('../api/client', () => ({ __esModule: true, default: { get: jest.fn(), put: jest.fn(), post: jest.fn(), delete: jest.fn() } }));
const mockConnect = jest.fn();
jest.mock('@react-oauth/google', () => ({ useGoogleLogin: () => mockConnect }));

const renderSettings = (logout = jest.fn()) => render(
    <MemoryRouter>
        <AuthContext.Provider value={{ user: { id: 1, username: 'alice' }, logout }}>
            <Settings />
        </AuthContext.Provider>
    </MemoryRouter>
);

beforeEach(() => jest.resetAllMocks());

test('settings has the way back, a link to edit the profile, and log out', () => {
    const logout = jest.fn();
    renderSettings(logout);

    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Your profile' })).toHaveAttribute('href', '/people/1');
    expect(screen.getByRole('link', { name: 'edit your profile' })).toHaveAttribute('href', '/profile/edit');
    expect(screen.getByText('Logged in as @alice')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(logout).toHaveBeenCalled();
});

test('Google Calendar is connected from settings', () => {
    renderSettings();
    expect(screen.getByRole('heading', { name: 'Google Calendar' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Connect calendar' }));
    expect(mockConnect).toHaveBeenCalled();
});

test('deleting the account asks first, then deletes and logs out', async () => {
    const logout = jest.fn();
    api.delete.mockResolvedValue({});
    renderSettings(logout);

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
    renderSettings(logout);

    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete my data' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to delete account');
    expect(logout).not.toHaveBeenCalled();
});
