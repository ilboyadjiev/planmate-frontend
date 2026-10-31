import React, { useState } from 'react';
import { Modal, Form } from 'react-bootstrap';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { StaticTimePicker } from '@mui/x-date-pickers/StaticTimePicker';
import dayjs from 'dayjs';

const getDateString = (dateObj) => {
    if (!dateObj) return '';
    const d = new Date(dateObj);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d - offset).toISOString().split('T')[0];
};

const formatTime12Hour = (dateObj) => {
    return new Date(dateObj).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
};

const DateTimePicker = ({ start, end, onChange }) => {
    // Tracks which clock is open: 'start', 'end', or null
    const [activeClock, setActiveClock] = useState(null); 

    const handleStartDateChange = (e) => {
        const [y, m, d] = e.target.value.split('-');
        const newStart = new Date(start);
        newStart.setFullYear(y, m - 1, d);
        
        const newEnd = new Date(newStart.getTime() + 60 * 60 * 1000); 
        onChange(newStart, newEnd);
    };

    const handleEndDateChange = (e) => {
        const [y, m, d] = e.target.value.split('-');
        const newEnd = new Date(end);
        newEnd.setFullYear(y, m - 1, d);
        
        onChange(start, newEnd);
    };

    const handleTimeChange = (newDayjsObj) => {
        if (!newDayjsObj) return;

        if (activeClock === 'start') {
            const newStart = new Date(start);
            newStart.setHours(newDayjsObj.hour(), newDayjsObj.minute(), 0);
            
            const newEnd = new Date(newStart.getTime() + 60 * 60 * 1000); 
            onChange(newStart, newEnd);
        } else if (activeClock === 'end') {
            const newEnd = new Date(end);
            newEnd.setHours(newDayjsObj.hour(), newDayjsObj.minute(), 0);
            
            onChange(start, newEnd);
        }
    };

    return (
        <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px' }}>
            
            {/* Start Date & Time */}
            <Form.Group style={{ marginBottom: '16px' }}>
                <Form.Label style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Kick off at:</Form.Label>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Form.Control 
                        type="date" 
                        value={getDateString(start)} 
                        onChange={handleStartDateChange} 
                        style={{ borderRadius: '8px', cursor: 'pointer', flex: 1 }} 
                    />
                    <div 
                        onClick={() => setActiveClock('start')}
                        style={{ 
                            padding: '0 16px', border: '1px solid var(--border)', borderRadius: '8px', 
                            background: 'var(--background)', cursor: 'pointer', display: 'flex', 
                            alignItems: 'center', justifyContent: 'center',
                            fontWeight: '600', color: '#4F46E5', userSelect: 'none', minWidth: '100px', whiteSpace: 'nowrap'
                        }}
                    >
                        {formatTime12Hour(start)}
                    </div>
                </div>
            </Form.Group>

            <hr style={{ borderColor: 'var(--border)', margin: '16px 0' }} />
            
            {/* End Date & Time */}
            <Form.Group>
                <Form.Label style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Wrap it up by:</Form.Label>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Form.Control 
                        type="date" 
                        value={getDateString(end)} 
                        onChange={handleEndDateChange} 
                        style={{ borderRadius: '8px', cursor: 'pointer', flex: 1 }} 
                    />
                    <div 
                        onClick={() => setActiveClock('end')}
                        style={{ 
                            padding: '0 16px', border: '1px solid var(--border)', borderRadius: '8px', 
                            background: 'var(--background)', cursor: 'pointer', display: 'flex', 
                            alignItems: 'center', justifyContent: 'center',
                            fontWeight: '600', color: 'var(--text-main)', userSelect: 'none', minWidth: '100px', whiteSpace: 'nowrap'
                        }}
                    >
                        {formatTime12Hour(end)}
                    </div>
                </div>
            </Form.Group>

            {/* Shared Floating MUI Android Clock Modal */}
            <Modal show={!!activeClock} onHide={() => setActiveClock(null)} centered size="sm">
                <div style={{ 
                    background: 'var(--surface)',
                    borderRadius: '8px', 
                    overflow: 'hidden',
                    display: 'flex',
                    justifyContent: 'center',
                    width: '100%'
                }}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <StaticTimePicker 
                            displayStaticWrapperAs="mobile"
                            value={activeClock === 'start' ? dayjs(start) : dayjs(end)}
                            onChange={handleTimeChange}
                            onAccept={() => setActiveClock(null)}
                            onClose={() => setActiveClock(null)}
                            slotProps={{
                                toolbar: { hidden: false }, 
                            }}
                            sx={{
                                width: '100%',
                                backgroundColor: 'transparent',
                                '& .MuiPickersLayout-contentWrapper': {
                                    display: 'flex',
                                    justifyContent: 'center',
                                    width: '100%'
                                },
                                '& .MuiMultiSectionDigitalClock-root': {
                                    width: 'max-content',
                                    margin: '0 auto'
                                },
                                '& .MuiPickersToolbar-root': {
                                    alignItems: 'center'
                                }
                            }}
                        />
                    </LocalizationProvider>
                </div>
            </Modal>

        </div>
    );
};

export default DateTimePicker;