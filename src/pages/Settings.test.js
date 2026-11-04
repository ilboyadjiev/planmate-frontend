import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Settings from './Settings';
import { AuthContext } from '../context/AuthContext';

test('settings is a placeholder with a way back, to edit the profile, and to log out', () => {
    const logout = jest.fn();
    render(
        <MemoryRouter>
            <AuthContext.Provider value={{ user: { id: 1, username: 'alice' }, logout }}>
                <Settings />
            </AuthContext.Provider>
        </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nothing to set up yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Your profile' })).toHaveAttribute('href', '/people/1');
    expect(screen.getByRole('link', { name: 'edit your profile' })).toHaveAttribute('href', '/profile/edit');
    expect(screen.getByText('Logged in as @alice')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(logout).toHaveBeenCalled();
});
