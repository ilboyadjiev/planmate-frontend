import { render, screen, fireEvent } from '@testing-library/react';
import DateRangeFilter from './DateRangeFilter';
import { resetPreferences, setPreferences } from '../../services/preferences';

// A fixed "today" (Wednesday 4 November 2026) so the weekend preset and the disabled past days are deterministic
const TODAY = new Date(2026, 10, 4);

const openPanel = () => fireEvent.click(screen.getByRole('button', { name: 'Have a date in mind?' }));

test('is one collapsed line by default, with no calendar showing', () => {
    render(<DateRangeFilter from="" to="" onChange={() => {}} today={TODAY} />);
    expect(screen.getByRole('button', { name: 'Have a date in mind?' })).toBeInTheDocument();
    expect(screen.queryByText('November 2026')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear dates' })).not.toBeInTheDocument();
});

test('clicking the line opens the range calendar, and clicking again closes it', () => {
    render(<DateRangeFilter from="" to="" onChange={() => {}} today={TODAY} />);
    openPanel();
    expect(screen.getByText('November 2026')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Have a date in mind?' }));
    expect(screen.queryByText('November 2026')).not.toBeInTheDocument();
});

test('"This weekend" picks the upcoming Saturday and Sunday and closes', () => {
    const onChange = vi.fn();
    render(<DateRangeFilter from="" to="" onChange={onChange} today={TODAY} />);
    openPanel();

    fireEvent.click(screen.getByRole('button', { name: 'This weekend' }));

    expect(onChange).toHaveBeenCalledWith('2026-11-07', '2026-11-08');
    expect(screen.queryByText('November 2026')).not.toBeInTheDocument();
});

test('picking a start then an end day applies the range on Done', () => {
    const onChange = vi.fn();
    render(<DateRangeFilter from="" to="" onChange={onChange} today={TODAY} />);
    openPanel();

    fireEvent.click(screen.getByRole('button', { name: '20 November 2026' }));
    fireEvent.click(screen.getByRole('button', { name: '22 November 2026' }));
    expect(onChange).not.toHaveBeenCalled(); // nothing applied until Done, so the feed does not reload mid-pick

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onChange).toHaveBeenCalledWith('2026-11-20', '2026-11-22');
});

test('a single day picked on its own applies as that one day', () => {
    const onChange = vi.fn();
    render(<DateRangeFilter from="" to="" onChange={onChange} today={TODAY} />);
    openPanel();

    fireEvent.click(screen.getByRole('button', { name: '20 November 2026' }));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));

    expect(onChange).toHaveBeenCalledWith('2026-11-20', '2026-11-20');
});

test('past days before today cannot be picked', () => {
    render(<DateRangeFilter from="" to="" onChange={() => {}} today={TODAY} />);
    openPanel();
    expect(screen.getByRole('button', { name: '1 November 2026' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '4 November 2026' })).not.toBeDisabled();
});

test('a set range shows on the collapsed line and can be cleared', () => {
    const onChange = vi.fn();
    render(<DateRangeFilter from="2026-11-20" to="2026-11-22" onChange={onChange} today={TODAY} />);
    const trigger = screen.getByRole('button', { name: /Nov/ });
    expect(trigger).toHaveTextContent('20');
    expect(trigger).toHaveTextContent('22');

    fireEvent.click(screen.getByRole('button', { name: 'Clear dates' }));
    expect(onChange).toHaveBeenCalledWith('', '');
});

const weekdayHeader = () => screen.getAllByText(/^(Mo|Tu|We|Th|Fr|Sa|Su)$/).map(el => el.textContent);

test('the week starts on Monday by default', () => {
    resetPreferences();
    render(<DateRangeFilter from="" to="" onChange={() => {}} today={TODAY} />);
    openPanel();
    expect(weekdayHeader()).toEqual(['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']);
});

test('the week starts on Sunday when the setting says so', () => {
    setPreferences({ weekStart: 'sunday' });
    render(<DateRangeFilter from="" to="" onChange={() => {}} today={TODAY} />);
    openPanel();
    expect(weekdayHeader()).toEqual(['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']);
    resetPreferences();
});
