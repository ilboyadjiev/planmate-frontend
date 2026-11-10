import React, { useEffect, useState } from 'react';
import './EventPhoto.css';

/**
 * The event's picture (from its source, e.g. a Ticketmaster or TMDB image) on the details view.
 * Hides itself when there is no image or it fails to load. Decorative — the title names the event.
 */
const EventPhoto = ({ src, className = '' }) => {
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [src]);
    if (!src || failed) {
        return null;
    }
    return (
        <div className={`event-photo ${className}`.trim()} aria-hidden="true">
            <img src={src} alt="" loading="lazy" decoding="async" draggable="false" onError={() => setFailed(true)} />
        </div>
    );
};

export default EventPhoto;
