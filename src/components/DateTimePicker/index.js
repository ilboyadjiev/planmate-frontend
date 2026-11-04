import React, { useState } from 'react';
import ThemeWrapper from './ThemeWrapper';
import StyledDatePicker from './StyledDatePicker';
import SlidingTimePicker from './SlidingTimePicker';
import { describeDuration } from './duration';

import { formatTime, usePreferences } from '../../services/preferences';

const DateTimePicker = ({ start, end, onChange, error }) => {
    const { timeFormat } = usePreferences();
    const [activeClock, setActiveClock] = useState(null); 

    const handleStartChange = (newDate, isTime = false) => {
        const newStart = new Date(start);
        if (isTime) {
            newStart.setHours(newDate.getHours(), newDate.getMinutes(), 0);
        } else {
            newStart.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
        }
        
        // Smart adjust: If start time is pushed past end time, bump end time 1 hour forward
        let newEnd = new Date(end);
        if (newStart >= newEnd) {
            newEnd = new Date(newStart.getTime() + 60 * 60 * 1000);
        }
        
        onChange(newStart, newEnd);
    };

    const handleEndChange = (newDate, isTime = false) => {
        const newEnd = new Date(end);
        if (isTime) {
            newEnd.setHours(newDate.getHours(), newDate.getMinutes(), 0);
        } else {
            newEnd.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
        }
        onChange(start, newEnd);
    };

    return (
        <ThemeWrapper>
            <div
                className={error ? 'field-invalid' : undefined}
                style={{ background: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px' }}
            >
                
                {/* Start Date & Time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <StyledDatePicker 
                        label="Kick off at:" 
                        value={start} 
                        onChange={(d) => handleStartChange(d, false)} 
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontWeight: '600', fontSize: '0.9rem', color: 'transparent', userSelect: 'none' }}>Time</label>
                        <div 
                            onClick={() => setActiveClock('start')}
                            style={{ 
                                padding: '8.5px 12px', border: '1px solid var(--border)', borderRadius: '8px', 
                                background: 'rgba(255, 255, 255, 0.05)', cursor: 'pointer', textAlign: 'center', 
                                fontWeight: '600', color: '#818cf8', userSelect: 'none', height: '40px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'border 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                            onMouseOut={(e) => e.target.style.borderColor = 'var(--border)'}
                        >
                            {formatTime(start, timeFormat)}
                        </div>
                    </div>
                </div>

                <hr style={{ borderColor: 'var(--border)', margin: '16px 0', opacity: 0.5 }} />
                
                {/* End Date & Time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <StyledDatePicker 
                        label="Wrap it up by:" 
                        value={end} 
                        onChange={(d) => handleEndChange(d, false)} 
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontWeight: '600', fontSize: '0.9rem', color: 'transparent', userSelect: 'none' }}>Time</label>
                        <div 
                            onClick={() => setActiveClock('end')}
                            style={{ 
                                padding: '8.5px 12px', border: '1px solid var(--border)', borderRadius: '8px', 
                                background: 'rgba(255, 255, 255, 0.05)', cursor: 'pointer', textAlign: 'center', 
                                fontWeight: '600', color: '#818cf8', userSelect: 'none', height: '40px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'border 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                            onMouseOut={(e) => e.target.style.borderColor = 'var(--border)'}
                        >
                            {formatTime(end, timeFormat)}
                        </div>
                    </div>
                </div>

                {describeDuration(start, end) && (
                    <div
                        aria-live="polite"
                        style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed var(--border)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500' }}
                    >
                        ⏱️ {describeDuration(start, end)}
                    </div>
                )}

                <SlidingTimePicker 
                    show={!!activeClock} 
                    onHide={() => setActiveClock(null)} 
                    value={activeClock === 'start' ? start : end}
                    onChange={(d) => activeClock === 'start' ? handleStartChange(d, true) : handleEndChange(d, true)}
                />

                {error && <div id="datetime-error" className="field-error" role="alert">{error}</div>}
            </div>
        </ThemeWrapper>
    );
};

export default DateTimePicker;