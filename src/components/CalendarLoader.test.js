import { render, screen } from '@testing-library/react';
import CalendarLoader from './CalendarLoader';

test('it tells screen readers what is loading, without showing the text', () => {
    render(<CalendarLoader label="Loading events…" />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Loading events…');
    expect(screen.getByText('Loading events…')).toHaveClass('visually-hidden');
});

test('showLabel puts the text under the calendar', () => {
    render(<CalendarLoader label="Searching…" showLabel />);
    expect(screen.getByText('Searching…')).toHaveClass('cal-loader-label');
});

test('size and delay are passed to the drawing, so quick loads never flash it', () => {
    render(<CalendarLoader size={88} delay={500} className="is-page" />);
    const status = screen.getByRole('status');
    expect(status).toHaveClass('cal-loader', 'is-page');
    expect(status.style.getPropertyValue('--cal-loader-size')).toBe('88px');
    expect(status.style.getPropertyValue('--cal-loader-delay')).toBe('500ms');
});
