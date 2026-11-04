import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { MultiSectionDigitalClock } from '@mui/x-date-pickers/MultiSectionDigitalClock';
import dayjs from 'dayjs';
import { usePreferences } from '../../services/preferences';

const SlidingTimePicker = ({ show, onHide, value, onChange }) => {
    const { timeFormat } = usePreferences();
    const [tempValue, setTempValue] = useState(dayjs(value));

    // Reset the temp value every time the modal opens
    useEffect(() => {
        if (show) setTempValue(dayjs(value));
    }, [show, value]);

    return (
        <Modal show={show} onHide={onHide} centered size="sm" contentClassName="modern-modal">
            <div style={{ padding: '20px', background: 'var(--surface)', borderRadius: '16px' }}>
                <h4 style={{ textAlign: 'center', marginBottom: '20px', color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: '700' }}>
                    Select Time
                </h4>
                
                <div style={{ display: 'flex', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden' }}>
                    <MultiSectionDigitalClock
                        value={tempValue}
                        onChange={(newValue) => setTempValue(newValue)}
                        ampm={timeFormat === '12h'}
                        sx={{ width: 'max-content', margin: '0 auto' }}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                    <Button variant="secondary" onClick={onHide} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontWeight: '600' }}>
                        Cancel
                    </Button>
                    <Button 
                        className="btn-modern-primary" 
                        onClick={() => { onChange(tempValue.toDate()); onHide(); }} 
                        style={{ padding: '8px 20px' }}
                    >
                        Done
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default SlidingTimePicker;