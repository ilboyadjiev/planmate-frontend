import React, { useEffect, useState } from 'react';
import config from '../config/config';
import { avatarColor, initials } from './feed/feedText';

/**
 * The URL of a person's profile picture, or null when they have none. The key changes with every upload, so the
 * browser may cache each URL forever (the server says so) and still always shows the current picture.
 */
export const avatarUrl = (person) => (person?.id != null && person?.avatarKey
    ? `${config.baseUrl}/api/v1/avatars/${person.id}/${encodeURIComponent(person.avatarKey)}`
    : null);

/**
 * A person's round picture: their uploaded photo, or their initials on their colour when there is none (or the
 * photo fails to load). The size and shape come from className (e.g. person-pill-picture, profile-avatar).
 *
 * person: { id, firstName, lastName, username, avatarKey }. colorKey: what picks the colour (person.id by default).
 * text: replaces the initials. tint: false keeps the colour from className's CSS (the navbar's own gradient).
 */
const Avatar = ({ person = {}, className = '', colorKey, text, title, tint = true }) => {
    const src = avatarUrl(person);
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [src]);
    const showPhoto = src && !failed;

    return (
        <span className={`${className} pm-avatar-pic${showPhoto ? ' has-photo' : ''}`.trim()}
            style={showPhoto || !tint ? undefined : { background: avatarColor(colorKey ?? person.id) }}
            title={title} aria-hidden="true">
            {showPhoto
                ? <img src={src} alt="" loading="lazy" decoding="async" draggable="false" onError={() => setFailed(true)} />
                : (text ?? initials(person.firstName, person.lastName, person.username))}
        </span>
    );
};

export default Avatar;
