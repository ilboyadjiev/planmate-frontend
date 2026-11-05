import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import moment from 'moment';
import api from '../api/client';
import { formatTime, usePreferences } from '../services/preferences';
import { cacheKeyFor } from '../services/gamePlanCache';

const collapsedKeyFor = (user) => `planmate_game_plan_collapsed_${user.id}`;

const readCollapsed = (user) => {
    try {
        return localStorage.getItem(collapsedKeyFor(user)) === 'true';
    } catch (e) {
        return false;
    }
};

const Chevron = ({ open }) => (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" className={`game-plan-chevron${open ? ' is-open' : ''}`}>
        <path d="M9 6l6 6-6 6" />
    </svg>
);
// Earlier names of this feature's browser cache, cleared so they do not linger
const legacyCacheKeys = (user) => [`planmate_ai_recap_${user.id}`, `planmate_ai_summary_${user.username || user.email}`];
const today = () => moment().format('YYYY-MM-DD');

const readCache = (user) => {
    try {
        const cached = JSON.parse(localStorage.getItem(cacheKeyFor(user)));
        return cached && cached.date === today() ? cached : null;
    } catch (e) {
        return null;
    }
};

/**
 * AI Game plan: a look at the next 48 hours with preparation tips, generated only when the user asks for it
 * (each one is a Gemini call). The server enforces a cooldown between plans and a daily limit; the button shows both.
 * Today's last plan is kept in the browser, so reloading the page never triggers a call.
 *
 * calendarVersion changes whenever the calendar's events change, so an older plan can be marked as outdated.
 */
const GamePlan = ({ user, calendarVersion }) => {
    const { timeFormat } = usePreferences();
    const [plan, setPlan] = useState(() => readCache(user)); // { summary, createdAt, nextAvailableAt, remaining }
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [outdated, setOutdated] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    const [collapsed, setCollapsed] = useState(() => readCollapsed(user)); // open by default
    const versionAtPlan = useRef(calendarVersion);

    const toggleCollapsed = () => {
        const next = !collapsed;
        setCollapsed(next);
        try { localStorage.setItem(collapsedKeyFor(user), String(next)); } catch (e) { /* storage blocked */ }
    };

    useEffect(() => {
        setPlan(readCache(user));
        setCollapsed(readCollapsed(user));
        try { legacyCacheKeys(user).forEach(key => localStorage.removeItem(key)); } catch (e) { /* storage blocked */ }
    }, [user]);

    useEffect(() => {
        if (plan && calendarVersion !== versionAtPlan.current) setOutdated(true);
    }, [calendarVersion, plan]);

    // Re-render when the cooldown ends, so the button becomes available without a reload
    const nextAvailableAt = plan?.nextAvailableAt ? new Date(plan.nextAvailableAt).getTime() : 0;
    useEffect(() => {
        if (nextAvailableAt <= now) return undefined;
        const timer = setTimeout(() => setNow(Date.now()), nextAvailableAt - now + 500);
        return () => clearTimeout(timer);
    }, [nextAvailableAt, now]);

    const coolingDown = nextAvailableAt > now;
    const limitReached = plan?.remaining === 0;
    const availableAt = formatTime(nextAvailableAt, timeFormat);

    const requestPlan = async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await api.get('/v2/ai/summary', { params: { force: true } });
            const next = {
                date: today(),
                summary: data.summary,
                createdAt: data.creationDate,
                nextAvailableAt: data.nextAvailableRefresh,
                remaining: data.remainingDailyCalls,
            };
            setPlan(next);
            setOutdated(false);
            setCollapsed(false); // show the new plan
            try { localStorage.setItem(collapsedKeyFor(user), 'false'); } catch (e) { /* storage blocked */ }
            versionAtPlan.current = calendarVersion;
            setNow(Date.now());
            try { localStorage.setItem(cacheKeyFor(user), JSON.stringify(next)); } catch (e) { /* storage full or blocked */ }
        } catch (err) {
            setError("Couldn't put your game plan together right now. Please try again in a moment.");
        } finally {
            setLoading(false);
        }
    };

    // The button says what pressing it will do, or why it can't be pressed right now
    let buttonLabel;
    let note = null;
    if (loading) {
        buttonLabel = 'Planning your next 48h…';
    } else if (limitReached) {
        buttonLabel = 'More tomorrow';
        note = "That's all the game plans for today. More tomorrow.";
    } else if (coolingDown) {
        buttonLabel = `Available at ${availableAt}`;
        note = outdated
            ? `Your calendar changed since this game plan. You can update it at ${availableAt}.`
            : `Your next game plan is available at ${availableAt}.`;
    } else if (!plan) {
        buttonLabel = '✨ Get my game plan';
    } else if (outdated) {
        buttonLabel = '✨ Update my game plan';
        note = 'Your calendar changed since this game plan. Refresh it to catch up.';
    } else {
        buttonLabel = 'Refresh game plan';
    }
    const disabled = loading || limitReached || coolingDown;

    return (
        <section className={`game-plan${collapsed ? ' is-collapsed' : ''}`} aria-labelledby="game-plan-heading" aria-busy={loading}>
            <div className="game-plan-header">
                <div>
                    <h4 id="game-plan-heading" className="game-plan-title">
                        <button type="button" className="game-plan-toggle" onClick={toggleCollapsed}
                            aria-expanded={!collapsed} aria-controls="game-plan-body">
                            <Chevron open={!collapsed} />
                            AI Game plan
                        </button>
                    </h4>
                    {!collapsed && plan?.createdAt && (
                        <div className="game-plan-meta">
                            {`Planned at ${formatTime(plan.createdAt, timeFormat)}`}
                            {typeof plan.remaining === 'number' && !limitReached && ` · ${plan.remaining} left today`}
                        </div>
                    )}
                </div>
                <button type="button" className="game-plan-button" onClick={requestPlan} disabled={disabled}
                    aria-describedby={note ? 'game-plan-note' : undefined}>
                    {buttonLabel}
                </button>
            </div>

            <div id="game-plan-body" hidden={collapsed}>
            {note && (
                <p id="game-plan-note" className={`game-plan-note${outdated && !limitReached ? ' is-outdated' : ''}`} role="status">
                    {note}
                </p>
            )}
            {error && <p className="field-error" role="alert">{error}</p>}

            {plan ? (
                <div className="ai-markdown-content"><ReactMarkdown>{plan.summary}</ReactMarkdown></div>
            ) : (
                <p className="game-plan-hint">
                    See what's coming up in the next 48 hours, what to prepare, and which invites still need an answer.
                </p>
            )}
            </div>
        </section>
    );
};

export default GamePlan;
