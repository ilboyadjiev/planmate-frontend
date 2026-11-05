import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../api/client';
import { AuthContext } from '../context/AuthContext';
import GlassPanel from '../components/GlassPanel';
import CalendarLoader from '../components/CalendarLoader';
import ChoiceGroup from '../components/settings/ChoiceGroup';
import SettingSwitch from '../components/settings/SettingSwitch';
import TopicPicker from '../components/settings/TopicPicker';
import PasswordForm from '../components/settings/PasswordForm';
import CalendarSubscription from '../components/settings/CalendarSubscription';
import { setPreferences } from '../services/preferences';
import { forgetGamePlan } from '../services/gamePlanCache';
import './FriendGroups.css';
import './Settings.css';

const VIEW_OPTIONS = [
    { value: 'auto', label: 'Automatic' },
    { value: 'month', label: 'Month' },
    { value: 'week', label: 'Week' },
    { value: 'day', label: 'Day' },
    { value: 'agenda', label: 'Agenda' },
];

/** Saves the export as a file on this device. */
const saveJsonFile = (data, fileName) => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** "Saved" (or why not) next to a section's title, announced to screen readers. */
const SectionStatus = ({ status }) => (
    <span className={`settings-status${status?.type === 'error' ? ' is-error' : ''}`} role="status" aria-live="polite">
        {status?.type === 'saving' && 'Saving…'}
        {status?.type === 'saved' && 'Saved'}
        {status?.type === 'error' && status.msg}
    </span>
);

/**
 * Settings, reached from the gear on your profile: Discover (home city, topics), Calendar (week start, time format,
 * first view), Privacy, Account (password, your data, log out), Google Calendar and deleting your account.
 * Changes are saved straight away; there is no Save button. Name and contact details are on Edit profile (pencil).
 */
const Settings = () => {
    const { user, logout, updateCurrentUser } = useContext(AuthContext);
    const location = useLocation();
    const [settings, setSettings] = useState(null);
    const [loadError, setLoadError] = useState(false);
    const [status, setStatus] = useState({}); // section -> { type: 'saving' | 'saved' | 'error', msg }
    const [city, setCity] = useState('');

    const [isSyncing, setIsSyncing] = useState(false);
    const [calendarStatus, setCalendarStatus] = useState(null); // { type: 'success' | 'error', msg }
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState(null);

    const load = useCallback(async () => {
        setLoadError(false);
        try {
            const { data } = await api.get('/v1/settings');
            setSettings(data);
            setCity(data.homeCity || '');
            setPreferences(data);
        } catch (err) {
            setLoadError(true);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Links like /settings#discover open the page at that section
    useEffect(() => {
        if (!settings || !location.hash) return;
        const section = document.getElementById(location.hash.slice(1));
        if (section && section.scrollIntoView) section.scrollIntoView({ block: 'start' });
    }, [settings, location.hash]);

    /** Saves some settings at once, showing the result in that section; on failure the old values come back. */
    const save = async (section, changes) => {
        const before = settings;
        setSettings(s => ({ ...s, ...changes }));
        setStatus(s => ({ ...s, [section]: { type: 'saving' } }));
        try {
            const { data } = await api.patch('/v1/settings', changes);
            setSettings(data);
            setPreferences(data);
            setStatus(s => ({ ...s, [section]: { type: 'saved' } }));
            return data;
        } catch (err) {
            setSettings(before);
            setStatus(s => ({ ...s, [section]: { type: 'error', msg: err.response?.data?.error || "Couldn't save. Please try again." } }));
            return null;
        }
    };

    const saveCity = async (e) => {
        e.preventDefault();
        const data = await save('discover', { homeCity: city });
        if (data) {
            setCity(data.homeCity || '');
            // Keep the cached profile in step with the server
            if (user) updateCurrentUser({ ...user, contactData: { ...(user.contactData || {}), city: data.homeCity } });
        }
    };

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

    const downloadData = async () => {
        setExporting(true);
        setExportError(null);
        try {
            const { data } = await api.get('/v1/account/export');
            saveJsonFile(data, `planmate-data-${new Date().toISOString().slice(0, 10)}.json`);
        } catch (err) {
            setExportError('Your data could not be downloaded. Please try again.');
        } finally {
            setExporting(false);
        }
    };

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

    const cityChanged = settings && (city.trim() || null) !== (settings.homeCity || null);

    return (
        <div className="groups-page settings-page">
            <GlassPanel tall className="social-panel">
            <div className="settings-topline">
                <Link to={user ? `/people/${user.id}` : '/dashboard'} className="settings-back">← Your profile</Link>
            </div>
            <h1>Settings</h1>
            <p className="group-muted">
                Changes are saved straight away. To change your name or contact details,{' '}
                <Link to="/profile/edit" className="settings-link">edit your profile</Link>.
            </p>

            {!settings && !loadError && <CalendarLoader label="Loading your settings…" />}
            {loadError && (
                <p className="availability-message msg-error" role="alert">
                    Your settings could not be loaded.{' '}
                    <button type="button" className="group-link" onClick={load}>Try again</button>
                </p>
            )}

            {settings && (
                <>
                <section id="discover" className="settings-card" aria-labelledby="settings-discover">
                    <div className="settings-card-head">
                        <h2 id="settings-discover">Discover</h2>
                        <SectionStatus status={status.discover} />
                    </div>
                    <form className="setting-row" onSubmit={saveCity} aria-label="Set your home city">
                        <div className="setting-text">
                            <label htmlFor="home-city" className="setting-label">Home city</label>
                            <p id="home-city-description" className="setting-description">
                                "Around me" shows public events here. Friend suggestions also look at it.
                            </p>
                        </div>
                        <div className="setting-inline">
                            <input id="home-city" type="text" value={city} onChange={e => setCity(e.target.value)}
                                placeholder="e.g. Munich" maxLength={80} autoComplete="address-level2"
                                aria-describedby="home-city-description" />
                            <button type="submit" className="group-button" disabled={!cityChanged}>Save</button>
                        </div>
                    </form>
                    <TopicPicker id="liked-topics" label="Topics I like"
                        description="Events with these tags rank higher in For you, and get their own chips."
                        tags={settings.likedTags} taken={settings.hiddenTags}
                        onChange={tags => save('discover', { likedTags: tags })} />
                    <TopicPicker id="hidden-topics" label="Topics to hide"
                        description="Events with these tags stay out of For you and Around me. Search still finds them."
                        tags={settings.hiddenTags} taken={settings.likedTags}
                        onChange={tags => save('discover', { hiddenTags: tags })} />
                </section>

                <section className="settings-card" aria-labelledby="settings-calendar">
                    <div className="settings-card-head">
                        <h2 id="settings-calendar">Calendar</h2>
                        <SectionStatus status={status.calendar} />
                    </div>
                    <ChoiceGroup name="week-start" label="Week starts on" value={settings.weekStart}
                        options={[{ value: 'monday', label: 'Monday' }, { value: 'sunday', label: 'Sunday' }]}
                        onChange={value => save('calendar', { weekStart: value })} />
                    <ChoiceGroup name="time-format" label="Time format" value={settings.timeFormat}
                        options={[{ value: '24h', label: '24-hour' }, { value: '12h', label: '12-hour' }]}
                        onChange={value => save('calendar', { timeFormat: value })} />
                    <ChoiceGroup name="calendar-view" label="Calendar opens in" value={settings.calendarView}
                        description="Automatic: the day on phones, the month on larger screens."
                        options={VIEW_OPTIONS}
                        onChange={value => save('calendar', { calendarView: value })} />
                    <CalendarSubscription feedKey={settings.calendarFeedKey}
                        onChange={key => setSettings(s => ({ ...s, calendarFeedKey: key }))} />
                </section>

                <section className="settings-card" aria-labelledby="settings-ai">
                    <div className="settings-card-head">
                        <h2 id="settings-ai">AI Game plan</h2>
                        <SectionStatus status={status.ai} />
                    </div>
                    <SettingSwitch id="ai-game-plan" label="Show the AI Game plan"
                        description="A short plan for your next 48 hours, made by Google Gemini when you ask for one. When off, it is hidden and your events are never sent to Gemini."
                        checked={settings.aiGamePlan}
                        onChange={value => {
                            // Turning it off also forgets today's plan kept in this browser
                            if (!value) forgetGamePlan(user);
                            save('ai', { aiGamePlan: value });
                        }} />
                </section>

                <section className="settings-card" aria-labelledby="settings-privacy">
                    <div className="settings-card-head">
                        <h2 id="settings-privacy">Privacy</h2>
                        <SectionStatus status={status.privacy} />
                    </div>
                    <ChoiceGroup name="going-visibility" label="Who sees the public events I'm going to"
                        description="On your profile and on event cards. Everyone else only sees how many people are going."
                        value={settings.goingVisibility}
                        options={[{ value: 'friends', label: 'Friends' }, { value: 'everyone', label: 'Everyone' }, { value: 'only_me', label: 'Only me' }]}
                        onChange={value => save('privacy', { goingVisibility: value })} />
                    <ChoiceGroup name="group-adds" label="Who can add me to groups" value={settings.groupAdds}
                        description="Only friends can add you at all. With Nobody, you can still make your own groups."
                        options={[{ value: 'friends', label: 'Friends' }, { value: 'nobody', label: 'Nobody' }]}
                        onChange={value => save('privacy', { groupAdds: value })} />
                    <SettingSwitch id="show-in-suggestions" label="Show me in friend suggestions"
                        description={'People you share friends or groups with may see you under "People you may know".'}
                        checked={settings.showInSuggestions}
                        onChange={value => save('privacy', { showInSuggestions: value })} />
                    <SettingSwitch id="searchable" label="Let people find me by name"
                        description="When off, only your friends find you in people search."
                        checked={settings.searchable}
                        onChange={value => save('privacy', { searchable: value })} />
                </section>

                <section className="settings-card" aria-labelledby="settings-account">
                    <h2 id="settings-account">Account</h2>
                    <div className="settings-row">
                        <span className="group-muted">Logged in as @{user?.username}</span>
                        <button type="button" className="group-button" onClick={logout}>Log out</button>
                    </div>
                    {settings.passwordLogin ? <PasswordForm /> : (
                        <p className="setting-description settings-google-note">
                            You sign in with Google, so there is no PlanMate password to change.
                        </p>
                    )}
                    <div className="settings-row settings-export">
                        <div>
                            <h3 className="setting-label">Download my data</h3>
                            <p className="setting-description">
                                Your profile, settings, friends, groups and events, as one file (JSON).
                            </p>
                        </div>
                        <button type="button" className="group-button" onClick={downloadData} disabled={exporting}>
                            {exporting ? 'Preparing…' : 'Download'}
                        </button>
                    </div>
                    {exportError && <p className="availability-message msg-error" role="alert">{exportError}</p>}
                </section>
                </>
            )}

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

            {!settings && (
                <section className="settings-card" aria-labelledby="settings-account-basic">
                    <h2 id="settings-account-basic">Account</h2>
                    <div className="settings-row">
                        <span className="group-muted">Logged in as @{user?.username}</span>
                        <button type="button" className="group-button" onClick={logout}>Log out</button>
                    </div>
                </section>
            )}

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
