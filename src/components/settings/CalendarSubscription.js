import React, { useState } from 'react';
import api from '../../api/client';
import { copyText } from '../../services/shareLinks';
import { feedUrl, googleSubscribeUrl, outlookSubscribeUrl, webcalUrl } from '../../services/calendarLinks';

/**
 * Settings › Calendar: your PlanMate events in Apple, Google, Outlook, Samsung or any other calendar app, as a
 * private subscription link those apps keep refreshing. The link can be reset (the old one stops working) or
 * turned off.
 *
 * feedKey: the current key, or null. onChange(key): after creating, resetting (new key) or turning off (null).
 */
const CalendarSubscription = ({ feedKey, onChange }) => {
    const [busy, setBusy] = useState(null); // 'create' | 'reset' | 'off'
    const [confirm, setConfirm] = useState(null); // 'reset' | 'off'
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState(null);

    const run = async (kind, call) => {
        setBusy(kind);
        setError(null);
        try {
            onChange(await call());
            setConfirm(null);
            setCopied(false);
        } catch (err) {
            setError("That didn't work. Please try again.");
        } finally {
            setBusy(null);
        }
    };

    const create = (reset) => run(reset ? 'reset' : 'create', async () => {
        const { data } = await api.post('/v1/settings/calendar-feed', null, reset ? { params: { reset: true } } : undefined);
        return data.calendarFeedKey;
    });
    const turnOff = () => run('off', async () => {
        await api.delete('/v1/settings/calendar-feed');
        return null;
    });

    const copy = async () => {
        setCopied(await copyText(feedUrl(feedKey)));
    };

    return (
        <div className="setting-row setting-row-stacked" aria-labelledby="calendar-subscription-title">
            <div className="setting-text">
                <h3 id="calendar-subscription-title" className="setting-label">Show PlanMate in other calendars</h3>
                <p className="setting-description">
                    Subscribe in Apple, Google, Outlook or Samsung Calendar to see the events you host or go to.
                    New events and changes follow by themselves.
                </p>
            </div>

            {!feedKey ? (
                <div>
                    <button type="button" className="group-button" onClick={() => create(false)} disabled={!!busy}>
                        {busy === 'create' ? 'Creating…' : 'Create subscription link'}
                    </button>
                </div>
            ) : (
                <>
                    <div className="subscription-link">
                        <label htmlFor="calendar-feed-url" className="visually-hidden">Your calendar subscription link</label>
                        <input id="calendar-feed-url" type="text" readOnly value={feedUrl(feedKey)} onFocus={e => e.target.select()} />
                        <button type="button" className="group-button" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
                    </div>
                    <div className="subscription-apps" role="group" aria-label="Subscribe in">
                        <a className="pm-glass-button" href={webcalUrl(feedKey)}>Apple Calendar</a>
                        <a className="pm-glass-button" href={googleSubscribeUrl(feedKey)} target="_blank" rel="noopener noreferrer">
                            Google Calendar<span className="visually-hidden"> (opens a new tab)</span>
                        </a>
                        <a className="pm-glass-button" href={outlookSubscribeUrl(feedKey)} target="_blank" rel="noopener noreferrer">
                            Outlook<span className="visually-hidden"> (opens a new tab)</span>
                        </a>
                    </div>
                    <p className="setting-description">
                        Samsung Calendar shows it once you add it to Google Calendar, or open the link on your phone.
                        Other apps: paste the link where they let you subscribe to a calendar. Google can take a few
                        hours to show changes.
                    </p>
                    <p className="setting-description subscription-warning">
                        Keep this link private: anyone who has it can see these events.
                    </p>

                    {confirm ? (
                        <div className="settings-confirm" role="group" aria-labelledby="subscription-confirm">
                            <span id="subscription-confirm" className="settings-confirm-text">
                                {confirm === 'reset'
                                    ? 'The old link stops working. Calendars using it need the new one.'
                                    : 'Calendars subscribed to this link stop receiving your events.'}
                            </span>
                            <button type="button" className="group-button group-button-danger"
                                onClick={() => (confirm === 'reset' ? create(true) : turnOff())} disabled={!!busy}>
                                {confirm === 'reset' ? (busy ? 'Resetting…' : 'Reset link') : (busy ? 'Turning off…' : 'Turn off')}
                            </button>
                            <button type="button" className="group-button" onClick={() => setConfirm(null)} disabled={!!busy}>Cancel</button>
                        </div>
                    ) : (
                        <div className="subscription-manage">
                            <button type="button" className="group-link" onClick={() => setConfirm('reset')}>Reset link</button>
                            <button type="button" className="group-link group-link-danger" onClick={() => setConfirm('off')}>Turn off</button>
                        </div>
                    )}
                </>
            )}
            {error && <p className="availability-message msg-error" role="alert">{error}</p>}
        </div>
    );
};

export default CalendarSubscription;
