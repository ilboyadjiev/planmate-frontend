import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../api/client';
import { AuthContext } from '../context/AuthContext';
import GlassPanel from '../components/GlassPanel';
import './FriendGroups.css';

/**
 * Settings, reached from the gear on your profile: connected accounts (Google Calendar), logging out and
 * deleting your account. Your name and contact details are edited on the profile page (pencil) instead.
 */
const Settings = () => {
    const { user, logout } = useContext(AuthContext);
    const [isSyncing, setIsSyncing] = useState(false);
    const [calendarStatus, setCalendarStatus] = useState(null); // { type: 'success' | 'error', msg }
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState(null);

    const linkGoogleCalendar = useGoogleLogin({
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
        onSuccess: async (tokenResponse) => {
            setIsSyncing(true);
            setCalendarStatus(null);
            try {
                await api.post('/v1/calendar/sync', { token: tokenResponse.access_token || tokenResponse.code });
                setCalendarStatus({ type: 'success', msg: 'Calendar successfully linked and synced!' });
            } catch (err) {
                setCalendarStatus({ type: 'error', msg: 'Failed to sync calendar with backend.' });
            } finally {
                setIsSyncing(false);
            }
        },
        onError: () => setCalendarStatus({ type: 'error', msg: 'Google authorization was cancelled or failed.' }),
    });

    const deleteAccount = async () => {
        setDeleting(true);
        setDeleteError(null);
        try {
            await api.delete(`/v1/users/${user.id}`);
            logout();
        } catch (err) {
            setDeleteError('Failed to delete account. Please try again or contact support.');
            setShowDeleteConfirm(false);
            setDeleting(false);
        }
    };

    return (
        <div className="groups-page settings-page">
            <GlassPanel tall className="social-panel">
            <div className="settings-topline">
                <Link to={user ? `/people/${user.id}` : '/dashboard'} className="settings-back">← Your profile</Link>
            </div>
            <h1>Settings</h1>
            <p className="group-muted">
                To change your name, city or contact details, <Link to="/profile/edit" className="settings-link">edit your profile</Link>.
            </p>

            <section className="settings-card" aria-labelledby="settings-connected">
                <h2 id="settings-connected">Connected accounts</h2>
                <div className="settings-row">
                    <div>
                        <h3 className="settings-item-title">Google Calendar</h3>
                        <p className="group-muted">Import your events and schedules directly.</p>
                    </div>
                    <button type="button" className="group-button" onClick={() => linkGoogleCalendar()} disabled={isSyncing}>
                        {isSyncing ? 'Syncing…' : 'Connect calendar'}
                    </button>
                </div>
                {calendarStatus && (
                    <p className={`availability-message ${calendarStatus.type === 'error' ? 'msg-error' : 'msg-success'}`}
                        role={calendarStatus.type === 'error' ? 'alert' : 'status'}>
                        {calendarStatus.msg}
                    </p>
                )}
            </section>

            <section className="settings-card" aria-labelledby="settings-account">
                <h2 id="settings-account">Account</h2>
                <div className="settings-row">
                    <span className="group-muted">Logged in as @{user?.username}</span>
                    <button type="button" className="group-button" onClick={logout}>Log out</button>
                </div>
            </section>

            <section className="settings-card settings-danger" aria-labelledby="settings-delete">
                <h2 id="settings-delete">Delete account</h2>
                <p className="group-muted">
                    Permanently deletes your account, your events and friendships, and takes you out of your friend
                    groups. This cannot be undone.
                </p>
                {!showDeleteConfirm ? (
                    <button type="button" className="group-button group-button-danger" onClick={() => setShowDeleteConfirm(true)}>
                        Delete account
                    </button>
                ) : (
                    <div className="settings-confirm" role="group" aria-labelledby="settings-delete-confirm">
                        <span id="settings-delete-confirm" className="settings-confirm-text">Are you absolutely sure?</span>
                        <button type="button" className="group-button settings-delete-final" onClick={deleteAccount} disabled={deleting}>
                            {deleting ? 'Deleting…' : 'Yes, delete my data'}
                        </button>
                        <button type="button" className="group-button" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                            Cancel
                        </button>
                    </div>
                )}
                {deleteError && <p className="availability-message msg-error" role="alert">{deleteError}</p>}
            </section>
            </GlassPanel>
        </div>
    );
};

export default Settings;
