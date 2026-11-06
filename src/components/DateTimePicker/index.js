import React, { useState } from 'react';
import ThemeWrapper from './ThemeWrapper';
import StyledDatePicker from './StyledDatePicker';
import SlidingTimePicker from './SlidingTimePicker';
import { describeDuration } from './duration';
import './pickers.css';

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
                className={`dtp${error ? ' field-invalid' : ''}`}
            >
                
                {/* Start Date & Time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <StyledDatePicker 
                        label="Kick off at:" 
                        value={start} 
                        onChange={(d) => handleStartChange(d, false)} 
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span className="dtp-label" aria-hidden="true">&nbsp;</span>
                        <button type="button" className="dtp-time" onClick={() => setActiveClock('start')}
                            aria-label={`Start time, ${formatTime(start, timeFormat)}`}>
                            {formatTime(start, timeFormat)}
                        </button>
                    </div>
                </div>

                <hr className="dtp-divider" />
                
                {/* End Date & Time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <StyledDatePicker 
                        label="Wrap it up by:" 
                        value={end} 
                        onChange={(d) => handleEndChange(d, false)} 
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span className="dtp-label" aria-hidden="true">&nbsp;</span>
                        <button type="button" className="dtp-time" onClick={() => setActiveClock('end')}
                            aria-label={`End time, ${formatTime(end, timeFormat)}`}>
                            {formatTime(end, timeFormat)}
                        </button>
                    </div>
                </div>

                {describeDuration(start, end) && (
                    <div
                        aria-live="polite" className="dtp-duration">
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