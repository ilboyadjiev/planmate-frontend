import React from 'react';
import { LockIcon } from './feed/FeedEventCard';

const GlobeIcon = () => (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
);

/** Who can see an event: everyone (it shows in the feed) or only the people invited. A glass switch of two pills. */
const VisibilityToggle = ({ isPublic, onChange, labelledBy }) => (
    <div className="pm-segmented" role="group" aria-labelledby={labelledBy}>
        <button type="button" aria-pressed={!!isPublic} onClick={() => onChange(true)}>
            <GlobeIcon /> Show in feed
        </button>
        <button type="button" aria-pressed={!isPublic} onClick={() => onChange(false)}>
            <LockIcon /> Invites only
        </button>
    </div>
);

export default VisibilityToggle;
