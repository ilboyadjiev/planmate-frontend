import React from 'react';

/** An on/off setting: a real checkbox shown as a switch, announced as one (role="switch"). */
const SettingSwitch = ({ id, label, description, checked, onChange, disabled = false }) => (
    <div className="setting-row setting-row-switch">
        <div className="setting-text">
            <label htmlFor={id} className="setting-label">{label}</label>
            {description && <p id={`${id}-description`} className="setting-description">{description}</p>}
        </div>
        <input id={id} type="checkbox" role="switch" className="setting-switch" checked={checked}
            onChange={e => onChange(e.target.checked)} disabled={disabled}
            aria-describedby={description ? `${id}-description` : undefined} />
    </div>
);

export default SettingSwitch;
