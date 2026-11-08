import React from 'react';
import Avatar from '../components/Avatar';

/** A person's name for headings and messages: full name, or their @username as a fallback. */
export const displayName = (person) => [person.firstName, person.lastName].filter(Boolean).join(' ') || person.username;

/** The shortest search term that runs a people search. */
export const MIN_SEARCH = 2;

/** Why someone is suggested or matched: shared groups first, then mutual friends. */
export const suggestionReason = (suggestion) => {
    const reasons = [];
    const groups = suggestion.sharedGroups || [];
    if (groups.length === 1) reasons.push(`In ${groups[0]} with you`);
    else if (groups.length > 1) reasons.push(`In ${groups.length} of your groups`);

    const count = suggestion.mutualFriendCount || 0;
    if (count > 0) {
        const names = (suggestion.mutualFriends || []).map(f => f.firstName || f.username);
        const others = count - names.length;
        const named = others > 0 ? `${names.join(', ')} and ${others} more` : names.join(' and ');
        reasons.push(`${count} mutual ${count === 1 ? 'friend' : 'friends'}: ${named}`);
    }
    return reasons.join(' · ');
};

/** A titled block of people (search results, requests, friends). */
export const Section = ({ title, color, children, empty }) => {
    const headingId = `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    return (
        <section aria-labelledby={headingId} style={{ marginBottom: '40px' }}>
            <h4 id={headingId} style={{ fontSize: '1.1rem', marginBottom: '16px', color }}>{title}</h4>
            {empty || <div className="social-list">{children}</div>}
        </section>
    );
};

/** One person: avatar, name that opens their profile, an optional sub-line, and an action on the right. */
export const UserListItem = ({ userData, subText, actionButton, onOpen }) => (
    <div className="user-list-item">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
            <Avatar person={userData} className="user-list-avatar" />
            <div style={{ minWidth: 0 }}>
                <button type="button" className="person-link person-link-button" onClick={() => onOpen(userData.id)}
                    aria-haspopup="dialog">
                    {userData.firstName} {userData.lastName} <span className="person-link-handle">@{userData.username}</span>
                </button>
                {/* Emails are never shown in the list, only name and @username */}
                {subText && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{subText}</div>}
            </div>
        </div>
        {actionButton && <div style={{ flex: '0 0 auto' }}>{actionButton}</div>}
    </div>
);
