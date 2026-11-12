import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import { AuthContext } from '../context/AuthContext';

vi.mock('../api/client', () => ({ __esModule: true, default: { get: vi.fn() } }));
vi.mock('@react-oauth/google', () => ({ GoogleLogin: () => <button type="button">Sign in with Google</button> }));

const mockNavigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => ({ ...(await importOriginal()), useNavigate: () => mockNavigate }));

const renderPage = (page, auth = {}) => render(
    <MemoryRouter>
        <AuthContext.Provider value={{ login: vi.fn(), googleLogin: vi.fn(), register: vi.fn(), ...auth }}>
            {page}
        </AuthContext.Provider>
    </MemoryRouter>
);

test('Login is one glass panel, named by its heading, with a way to create an account', () => {
    renderPage(<Login />);
    const panel = screen.getByRole('region', { name: 'Welcome back' });
    expect(panel).toHaveClass('pm-glass-panel', 'auth-panel');
    expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/register');
});

test('Login still logs in and shows a failure at the form', async () => {
    const login = vi.fn().mockRejectedValue({ response: { data: { error: 'Wrong password.' } } });
    renderPage(<Login />, { login });
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'a@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log In' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong password.');
    expect(login).toHaveBeenCalledWith('a@example.com', 'secret');
});

test('Register is a glass panel whose fields are labelled, with a way back to logging in', () => {
    renderPage(<Register />);
    expect(screen.getByRole('region', { name: 'Create your account' })).toHaveClass('pm-glass-panel');
    ['First Name', 'Last Name', 'Email Address *', 'Username *', 'Password *', 'Street', 'Zipcode', 'City', 'Country', 'Mobile']
        .forEach(label => expect(screen.getByLabelText(label)).toBeInTheDocument());
    expect(screen.getAllByRole('button', { name: 'Check' })).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
});
