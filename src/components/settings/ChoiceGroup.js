import React from 'react';

/**
 * One setting with a few choices, as a row of glass pills: real radio buttons in a named radio group, so keyboards
 * and screen readers work as usual (arrow keys move between the choices).
 *
 * options: [{ value, label }]. onChange(value) is called with the newly chosen value.
 */
const ChoiceGroup = ({ name, label, description, options, value, onChange, disabled = false }) => (
    <div className="setting-row" role="radiogroup" aria-labelledby={`${name}-label`}
        aria-describedby={description ? `${name}-description` : undefined}>
        <div className="setting-text">
            <span id={`${name}-label`} className="setting-label">{label}</span>
            {description && <p id={`${name}-description`} className="setting-description">{description}</p>}
        </div>
        <div className="setting-choices">
            {options.map(option => (
                <label key={option.value} className={`setting-choice${value === option.value ? ' is-active' : ''}`}>
                    <input type="radio" name={name} value={option.value} checked={value === option.value}
                        onChange={() => onChange(option.value)} disabled={disabled} />
                    <span>{option.label}</span>
                </label>
            ))}
        </div>
    </div>
);

export default ChoiceGroup;
