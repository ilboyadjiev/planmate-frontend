import React, { useState } from 'react';
import api from '../../api/client';

export const MIN_PASSWORD_LENGTH = 8;

const EMPTY = { current: '', next: '', confirm: '' };

/** Changing your password (Settings › Account). The server checks the current one. */
const PasswordForm = () => {
    const [fields, setFields] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState(null); // { type: 'success' | 'error', msg }

    const change = (e) => {
        setFields(f => ({ ...f, [e.target.name]: e.target.value }));
        setStatus(null);
    };

    const problem = () => {
        if (fields.next.length < MIN_PASSWORD_LENGTH) return `The new password needs at least ${MIN_PASSWORD_LENGTH} characters.`;
        if (fields.next !== fields.confirm) return "The new passwords don't match.";
        return null;
    };

    const submit = async (e) => {
        e.preventDefault();
        const error = problem();
        if (error) {
            setStatus({ type: 'error', msg: error });
            return;
        }
        setSaving(true);
        try {
            await api.put('/v1/auth/password', { currentPassword: fields.current, newPassword: fields.next });
            setFields(EMPTY);
            setStatus({ type: 'success', msg: 'Your password was changed.' });
        } catch (err) {
            setStatus({ type: 'error', msg: err.response?.data?.error || 'Your password could not be changed. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <form className="password-form" onSubmit={submit} aria-labelledby="password-title">
            <h3 id="password-title" className="setting-label">Change password</h3>
            <div className="form-group">
                <label htmlFor="current-password">Current password</label>
                <input type="password" id="current-password" name="current" value={fields.current} onChange={change}
                    autoComplete="current-password" required />
            </div>
            <div className="form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="new-password">New password</label>
                    <input type="password" id="new-password" name="next" value={fields.next} onChange={change}
                        autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required aria-describedby="new-password-hint" />
                    <span id="new-password-hint" className="setting-description">At least {MIN_PASSWORD_LENGTH} characters.</span>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="confirm-password">Repeat new password</label>
                    <input type="password" id="confirm-password" name="confirm" value={fields.confirm} onChange={change}
                        autoComplete="new-password" required />
                </div>
            </div>
            <div className="password-actions">
                <button type="submit" className="group-button group-button-primary" disabled={saving}>
                    {saving ? 'Changing…' : 'Change password'}
                </button>
                {status && (
                    <span className={`availability-message ${status.type === 'error' ? 'msg-error' : 'msg-success'}`}
                        role={status.type === 'error' ? 'alert' : 'status'}>
                        {status.msg}
                    </span>
                )}
            </div>
        </form>
    );
};

export default PasswordForm;
