import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import ShareButton from './ShareButton';

const URL_TO_SHARE = 'https://www.planmate.org/events/abc';
const setPointer = (coarse) => {
    window.matchMedia = jest.fn().mockImplementation(query => ({ matches: coarse && query.includes('coarse'), media: query }));
};

afterEach(() => {
    delete navigator.share;
    delete navigator.clipboard;
    jest.useRealTimers();
});

test('on a computer it copies the link and says so for a moment', async () => {
    jest.useFakeTimers();
    setPointer(false);
    const writeText = jest.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<ShareButton url={URL_TO_SHARE} title="Party" />);

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));

    expect(await screen.findByRole('button', { name: 'Link copied' })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(URL_TO_SHARE);
    expect(screen.getByRole('status')).toHaveTextContent('The link is copied');
    act(() => { jest.advanceTimersByTime(3000); });
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
});

test('on a phone it opens the share sheet', async () => {
    setPointer(true);
    const share = jest.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    render(<ShareButton url={URL_TO_SHARE} title="Party" />);

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));

    await waitFor(() => expect(share).toHaveBeenCalledWith({ title: 'Party', url: URL_TO_SHARE }));
    expect(screen.queryByText('Link copied')).toBeNull();
});

test('when the browser cannot copy, the link is shown to copy by hand', async () => {
    setPointer(false);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: jest.fn().mockRejectedValue(new Error('denied')) }, configurable: true });
    document.execCommand = jest.fn(() => false);
    render(<ShareButton url={URL_TO_SHARE} title="Party" />);

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));

    expect(await screen.findByLabelText('Link to copy')).toHaveValue(URL_TO_SHARE);
});
