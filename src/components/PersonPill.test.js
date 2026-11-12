import { render, screen, fireEvent } from '@testing-library/react';
import PersonPill from './PersonPill';

const bob = { id: 2, firstName: 'Bob', lastName: 'Brown', username: 'bob' };

test('shows the picture, first name on top and @username below', () => {
    render(<PersonPill person={bob} />);

    expect(screen.getByText('BB')).toHaveClass('person-pill-picture'); // initials until profile pictures exist
    expect(screen.getByText('Bob')).toHaveClass('person-pill-name');
    expect(screen.getByText('@bob')).toHaveClass('person-pill-handle');
});

test('adds the answer, or a note such as "organizer", next to the name', () => {
    const { rerender } = render(<PersonPill person={bob} answer="accepted" />);
    expect(screen.getByText(/Going/)).toHaveClass('response-accepted');

    rerender(<PersonPill person={bob} note="organizer" answer="maybe" />);
    expect(screen.getByText(/organizer/)).toBeInTheDocument();
    expect(screen.queryByText(/Maybe/)).not.toBeInTheDocument();
});

test('"You" replaces the name, and someone without a first name shows only their username once', () => {
    const { rerender } = render(<PersonPill person={bob} label="You" />);
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText('@bob')).toBeInTheDocument();

    rerender(<PersonPill person={{ id: 3, username: 'dave' }} />);
    expect(screen.getByText('dave')).toBeInTheDocument();
    expect(screen.queryByText('@dave')).not.toBeInTheDocument();
});

test('is a button when it opens something', () => {
    const onClick = vi.fn();
    render(<PersonPill person={bob} onClick={onClick} ariaLabel="Open Bob's profile" />);

    fireEvent.click(screen.getByRole('button', { name: "Open Bob's profile" }));
    expect(onClick).toHaveBeenCalled();
});
