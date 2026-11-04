import { render, screen, fireEvent } from '@testing-library/react';
import Avatar, { avatarUrl } from './Avatar';
import config from '../config/config';

const alice = { id: 7, firstName: 'Alice', lastName: 'Meier', username: 'alice' };
// The photo is decorative (alt=""), next to the person's name
const photo = () => screen.queryByRole('img', { hidden: true });

test('without a photo it shows the initials on the person\'s colour', () => {
    render(<Avatar person={alice} className="person-pill-picture" />);
    const circle = screen.getByText('AM');
    expect(circle).toHaveClass('person-pill-picture');
    expect(circle.style.background).not.toBe('');
    expect(photo()).toBeNull();
});

test('with a photo it shows the picture by its key, and falls back to initials if it fails to load', () => {
    render(<Avatar person={{ ...alice, avatarKey: 'k3y_-abc' }} className="profile-avatar" />);
    expect(photo()).toHaveAttribute('src', `${config.baseUrl}/api/v1/avatars/7/k3y_-abc`);
    expect(screen.queryByText('AM')).not.toBeInTheDocument();

    fireEvent.error(photo());
    expect(photo()).toBeNull();
    expect(screen.getByText('AM')).toHaveClass('profile-avatar');
});

test('there is no URL without both an id and a key', () => {
    expect(avatarUrl(alice)).toBeNull();
    expect(avatarUrl({ avatarKey: 'k' })).toBeNull();
    expect(avatarUrl(null)).toBeNull();
});

test('tint={false} leaves the colour to the CSS class (the navbar\'s own gradient)', () => {
    render(<Avatar person={alice} className="pm-avatar" text="A" tint={false} />);
    expect(screen.getByText('A')).not.toHaveAttribute('style');
});
