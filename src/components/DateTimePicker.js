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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Form.Group>
                    <Form.Label style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Kick off at:</Form.Label>
                    <Form.Control 
                        type="date" 
                        value={getDateString(start)} 
                        onChange={handleStartDateChange} 
                        style={{ borderRadius: '8px', cursor: 'pointer' }} 
                    />
                </Form.Group>

                <Form.Group>
                    <Form.Label style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-muted)' }}></Form.Label>
                    <div 
                        onClick={() => setActiveClock('start')}
                        style={{ 
                            padding: '6px 12px', border: '1px solid var(--border)', borderRadius: '8px', 
                            background: 'var(--background)', cursor: 'pointer', textAlign: 'center', 
                            fontWeight: '600', color: '#4F46E5', userSelect: 'none' 
                        }}
                    >
                        {formatTime12Hour(start)}
                    </div>
                </Form.Group>
            </div>

            <hr style={{ borderColor: 'var(--border)', margin: '16px 0' }} />
            
            {/* End Date & Time */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Form.Group>
                    <Form.Label style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Wrap it up by:</Form.Label>
                    <Form.Control 
                        type="date" 
                        value={getDateString(end)} 
                        onChange={handleEndDateChange} 
                        style={{ borderRadius: '8px', cursor: 'pointer' }} 
                    />
                </Form.Group>

                <Form.Group>
                    <Form.Label style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-muted)' }}></Form.Label>
                    <div 
                        onClick={() => setActiveClock('end')}
                        style={{ 
                            padding: '6px 12px', border: '1px solid var(--border)', borderRadius: '8px', 
                            background: 'var(--background)', cursor: 'pointer', textAlign: 'center', 
                            fontWeight: '600', color: 'var(--text-main)', userSelect: 'none' 
                        }}
                    >
                        {formatTime12Hour(end)}
                    </div>
                </Form.Group>
            </div>

            {/* Shared Floating MUI Android Clock Modal */}
            <Modal show={!!activeClock} onHide={() => setActiveClock(null)} centered size="sm">
                <div style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
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
                        />
                    </LocalizationProvider>
                </div>
            </Modal>
        </div>
    );
};

export default DateTimePicker;