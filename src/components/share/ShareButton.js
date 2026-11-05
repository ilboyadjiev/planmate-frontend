import React, { useEffect, useId, useRef, useState } from 'react';
import { copyText, prefersShareSheet } from '../../services/shareLinks';
import './ShareButton.css';

const ShareIcon = () => (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v12M7.5 7.5L12 3l4.5 4.5" /><path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
);

const CheckIcon = () => (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
);

/**
 * Shares a link: on phones the system share sheet opens, on computers the link is copied ("Link copied"). If the
 * browser allows neither, the link is shown in a field to copy by hand.
 *
 * url: the full link. title: what is shared (the share sheet shows it). label: the button text.
 */
const ShareButton = ({ url, title, label = 'Share', className = '' }) => {
    const [state, setState] = useState('idle'); // idle | copied | manual
    const timer = useRef(null);
    const field = useRef(null);
    const fieldId = useId();

    useEffect(() => () => clearTimeout(timer.current), []);
    useEffect(() => {
        if (state === 'manual' && field.current) field.current.select();
    }, [state]);

    const share = async () => {
        if (prefersShareSheet()) {
            try {
                await navigator.share({ title, url });
                return;
            } catch (err) {
                if (err && err.name === 'AbortError') return; // closed the share sheet
            }
        }
        if (await copyText(url)) {
            setState('copied');
            clearTimeout(timer.current);
            timer.current = setTimeout(() => setState('idle'), 2500);
        } else {
            setState('manual');
        }
    };

    return (
        <span className={`share ${className}`.trim()}>
            <button type="button" className={`pm-glass-button share-button${state === 'copied' ? ' is-copied' : ''}`}
                onClick={share}>
                {state === 'copied' ? <CheckIcon /> : <ShareIcon />}
                {state === 'copied' ? 'Link copied' : label}
            </button>
            <span className="visually-hidden" role="status" aria-live="polite">
                {state === 'copied' ? 'The link is copied. Paste it anywhere to share it.' : ''}
            </span>
            {state === 'manual' && (
                <span className="share-manual">
                    <label htmlFor={fieldId} className="visually-hidden">Link to copy</label>
                    <input id={fieldId} ref={field} type="text" readOnly value={url} onFocus={e => e.target.select()} />
                </span>
            )}
        </span>
    );
};

export default ShareButton;
