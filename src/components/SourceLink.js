import React from 'react';

/** The site an http(s) link points to, without "www." ("ticketmaster.de"); null for anything else. */
export const sourceHost = (url) => {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        return /^https?:$/.test(parsed.protocol) && parsed.hostname ? parsed.hostname.replace(/^www\./, '') : null;
    } catch {
        return null;
    }
};

/**
 * "Read more here: ticketmaster.de" under the description of events found by PlanMate's discovery, linking to the
 * event's page at its source (opens in a new tab). Renders nothing for other events.
 */
const SourceLink = ({ url, className = '' }) => {
    const host = sourceHost(url);
    if (!host) return null;
    return (
        <p className={`source-link ${className}`.trim()}>
            Read more here:{' '}
            <a href={url} target="_blank" rel="noopener noreferrer">{host}</a>
        </p>
    );
};

export default SourceLink;
