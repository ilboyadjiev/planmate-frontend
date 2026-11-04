import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EditProfile from './EditProfile';
import { AuthContext } from '../context/AuthContext';
import api from '../api/client';

jest.mock('../api/client', () => ({ __esModule: true, default: { get: jest.fn(), put: jest.fn(), post: jest.fn(), delete: jest.fn() } }));
jest.mock('@react-oauth/google', () => ({ useGoogleLogin: () => jest.fn() }));

const alice = { id: 1, firstName: 'Alice', lastName: 'Meier', email: 'alice@example.com', contactData: { city: 'Munich' } };

const renderPage = (updateCurrentUser = jest.fn()) => render(
    <MemoryRouter>
        <AuthContext.Provider value={{ user: alice, logout: jest.fn(), updateCurrentUser }}>
            <EditProfile />
        </AuthContext.Provider>
    </MemoryRouter>
);

beforeEach(() => jest.resetAllMocks());

test('the top line has the way back on the left and Save on the right, which saves the form', async () => {
    const updateCurrentUser = jest.fn();
    api.put.mockResolvedValue({ data: { ...alice, firstName: 'Ali' } });
    renderPage(updateCurrentUser);

    const back = screen.getByRole('link', { name: '← Your profile' });
    const save = screen.getByRole('button', { name: 'Save' });
    expect(back).toHaveAttribute('href', '/people/1');
    expect(back.compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(save.compareDocumentPosition(screen.getByLabelText('First Name')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Ali' } });
    fireEvent.click(save);

    expect(await screen.findByText('Profile updated successfully!')).toBeInTheDocument();
    expect(api.put).toHaveBeenCalledWith('/v1/users/1', expect.objectContaining({ firstName: 'Ali' }));
    expect(updateCurrentUser).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();
});

test('a failed save shows the error at the top', async () => {
    api.put.mockRejectedValue({ response: { data: { error: 'Name is too long.' } } });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Name is too long.');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());
});
