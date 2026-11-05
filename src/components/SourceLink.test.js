import React from 'react';
import { render, screen } from '@testing-library/react';
import SourceLink, { sourceHost } from './SourceLink';

describe('SourceLink', () => {
    it('links to the source page in a new tab, named by its site', () => {
        render(<SourceLink url="https://www.ticketmaster.de/event/123" />);
        expect(screen.getByText(/Read more here:/)).toBeInTheDocument();
        const link = screen.getByRole('link', { name: 'ticketmaster.de' });
        expect(link).toHaveAttribute('href', 'https://www.ticketmaster.de/event/123');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('renders nothing without a web link', () => {
        const { container } = render(<SourceLink url={null} />);
        expect(container).toBeEmptyDOMElement();
        // eslint-disable-next-line no-script-url
        render(<SourceLink url="javascript:alert(1)" />);
        expect(screen.queryByText(/Read more here/)).not.toBeInTheDocument();
    });

    it('only accepts http and https links', () => {
        expect(sourceHost('http://tickets.example/a')).toBe('tickets.example');
        expect(sourceHost('data:text/html,hi')).toBeNull();
        expect(sourceHost('not a url')).toBeNull();
    });
});
