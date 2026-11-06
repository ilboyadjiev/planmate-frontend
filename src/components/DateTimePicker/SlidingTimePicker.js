import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { MultiSectionDigitalClock } from '@mui/x-date-pickers/MultiSectionDigitalClock';
import dayjs from 'dayjs';
import { usePreferences } from '../../services/preferences';

/** Picking a time: a small glass window with hours and minutes as scrolling columns of pills. */
const SlidingTimePicker = ({ show, onHide, value, onChange }) => {
    const { timeFormat } = usePreferences();
    const [tempValue, setTempValue] = useState(dayjs(value));

    // Reset the temp value every time the modal opens
    useEffect(() => {
        if (show) setTempValue(dayjs(value));
    }, [show, value]);

    return (
        <Modal show={show} onHide={onHide} centered size="sm" contentClassName="modern-modal pm-glass-modal pm-time-modal"
            aria-labelledby="pm-time-title">
            <div className="pm-time-body">
                <h4 id="pm-time-title" className="pm-time-title">Select time</h4>
                <div className="pm-time-clock">
                    <MultiSectionDigitalClock
                        value={tempValue}
                        onChange={(newValue) => setTempValue(newValue)}
                        ampm={timeFormat === '12h'}
                        sx={{ width: 'max-content', margin: '0 auto' }}
                    />
                </div>
                <div className="pm-time-actions">
                    <button type="button" className="pm-glass-button" onClick={onHide}>Cancel</button>
                    <button type="button" className="pm-glass-button pm-glass-button-primary"
                        onClick={() => { onChange(tempValue.toDate()); onHide(); }}>
                        Done
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default SlidingTimePicker;
