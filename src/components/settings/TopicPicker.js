import React, { useState } from 'react';

export const MAX_TOPICS = 20;

/** Common topics, offered as one-tap additions. */
export const SUGGESTED_TOPICS = ['#music', '#food', '#gaming', '#tech', '#sport', '#art', '#nightlife', '#outdoors',
    '#christmasmarket', '#free', '#students', '#family'];

/** "Street Food" becomes "#streetfood", like event tags. Null when nothing usable is left. */
export const normaliseTopic = (text) => {
    const word = String(text || '').toLowerCase().replace(/[\s,#]+/g, '');
    return word ? `#${word}` : null;
};

const XIcon = () => (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M6 6l12 12M18 6L6 18" />
    </svg>
);

/**
 * A list of topics (tags) to like or hide: the chosen ones as removable chips, a field to add any tag, and
 * suggestions. onChange(tags) gets the whole new list. taken: topics used by the other list (left out of the
 * suggestions, since a topic is either liked or hidden).
 */
const TopicPicker = ({ id, label, description, tags, taken = [], onChange, disabled = false }) => {
    const [text, setText] = useState('');
    const full = tags.length >= MAX_TOPICS;

    const add = (tag) => {
        if (!tag || tags.includes(tag) || full) return;
        onChange([...tags, tag]);
    };

    const submit = (e) => {
        e.preventDefault();
        add(normaliseTopic(text));
        setText('');
    };

    const suggestions = SUGGESTED_TOPICS.filter(tag => !tags.includes(tag) && !taken.includes(tag));

    return (
        <div className="setting-row setting-row-stacked">
            <div className="setting-text">
                <h3 id={`${id}-label`} className="setting-label">{label}</h3>
                {description && <p className="setting-description">{description}</p>}
            </div>

            {tags.length > 0 ? (
                <ul className="topic-list" aria-labelledby={`${id}-label`}>
                    {tags.map(tag => (
                        <li key={tag} className="pm-chip topic-chip">
                            {tag}
                            <button type="button" className="topic-remove" onClick={() => onChange(tags.filter(t => t !== tag))}
                                aria-label={`Remove ${tag}`} disabled={disabled}>
                                <XIcon />
                            </button>
                        </li>
                    ))}
                </ul>
            ) : <p className="setting-empty">None yet.</p>}

            <form className="topic-add" onSubmit={submit} aria-label={`Add to ${label.toLowerCase()}`}>
                <label htmlFor={`${id}-input`} className="visually-hidden">Add a topic to {label.toLowerCase()}</label>
                <input id={`${id}-input`} type="text" value={text} onChange={e => setText(e.target.value)}
                    placeholder="#topic" maxLength={30} disabled={disabled || full} autoComplete="off" />
                <button type="submit" className="group-button" disabled={disabled || full || !normaliseTopic(text)}>Add</button>
            </form>

            {suggestions.length > 0 && !full && (
                <div className="topic-suggestions" role="group" aria-label={`Suggestions for ${label.toLowerCase()}`}>
                    {suggestions.map(tag => (
                        <button key={tag} type="button" className="topic-suggestion" onClick={() => add(tag)} disabled={disabled}>
                            + {tag}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TopicPicker;
