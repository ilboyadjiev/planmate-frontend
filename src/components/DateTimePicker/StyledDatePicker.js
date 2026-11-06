import React from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

const StyledDatePicker = ({ label, value, onChange }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            <label className="dtp-label">{label}</label>
            <DatePicker
                value={dayjs(value)}
                onChange={(newValue) => {
                    if (newValue) onChange(newValue.toDate());
                }}
                sx={{ width: '100%' }}
                slotProps={{
                    // The calendar that opens: glass, like the rest (see pickers.css)
                    desktopPaper: { className: 'pm-picker-paper' },
                    mobilePaper: { className: 'pm-picker-paper' },
                    textField: {
                        variant: 'outlined',
                        size: 'small',
                        sx: {
                            '& .MuiOutlinedInput-root': {
                                // A frosted pill, like the window's buttons
                                backgroundColor: 'rgba(255, 255, 255, 0.07)',
                                color: 'var(--text-main)',
                                borderRadius: '999px',
                                minHeight: '40px',
                                paddingLeft: '4px',
                                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
                                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.16)' },
                                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.26)' },
                                '&.Mui-focused fieldset': { borderColor: 'rgba(253, 186, 116, 0.7)', borderWidth: '1px' },
                            },
                            '& .MuiSvgIcon-root': { color: 'var(--text-muted)' }
                        }
                    }
                }}
            />
        </div>
    );
};

export default StyledDatePicker;