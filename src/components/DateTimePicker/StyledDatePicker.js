import React from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

const StyledDatePicker = ({ label, value, onChange }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            <label style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{label}</label>
            <DatePicker
                value={dayjs(value)}
                onChange={(newValue) => {
                    if (newValue) onChange(newValue.toDate());
                }}
                sx={{ width: '100%' }}
                slotProps={{
                    textField: {
                        variant: 'outlined',
                        size: 'small',
                        sx: {
                            '& .MuiOutlinedInput-root': {
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                color: 'var(--text-main)',
                                borderRadius: '8px',
                                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                                '&.Mui-focused fieldset': { borderColor: '#F06A25', borderWidth: '1px' },
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