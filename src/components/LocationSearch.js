import React, { useState, useRef, useEffect } from 'react';
import { Form } from 'react-bootstrap';
import api from '../api/client';

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 300;

/**
 * Location input that accepts free text and, when enabled, offers LocationIQ suggestions.
 * - Typing stores the text itself as the location ({ name: text }), so free text is always saved.
 * - Picking a suggestion stores the structured address.
 * Suggestions require login (the LocationIQ key is metered), so guests get a plain text field.
 */
const LocationSearch = ({ initialQuery, onSelectLocation, enableSuggestions = true }) => {
    const [query, setQuery] = useState(initialQuery || '');
    const [suggestions, setSuggestions] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);

    const searchTimeoutRef = useRef(null);
    const latestQueryRef = useRef('');
    const wrapperRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            clearTimeout(searchTimeoutRef.current);
        };
    }, []);

    const handleChange = (e) => {
        const value = e.target.value;
        setQuery(value);

        const text = value.trim();
        onSelectLocation(text ? { name: text } : null);

        clearTimeout(searchTimeoutRef.current);
        latestQueryRef.current = text;

        if (!enableSuggestions || text.length < MIN_QUERY_LENGTH) {
            setSuggestions([]);
            setShowDropdown(false);
            return;
        }

        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await api.get('/v1/locations/autocomplete', { params: { q: text } });
                // Ignore responses for an older query that arrive after a newer one
                if (latestQueryRef.current !== text) return;
                setSuggestions(res.data || []);
                setShowDropdown(true);
            } catch (err) {
                // Suggestions are optional; the typed text is still saved
                setSuggestions([]);
            }
        }, DEBOUNCE_MS);
    };

    const handleSelect = (suggestion) => {
        latestQueryRef.current = '';
        setQuery(suggestion.displayName);
        onSelectLocation({
            name: suggestion.displayName.split(',')[0],
            street: suggestion.street,
            city: suggestion.city,
            zipcode: suggestion.zipcode,
            country: suggestion.country,
        });
        setShowDropdown(false);
    };

    return (
        <div ref={wrapperRef} style={{ position: 'relative' }}>
            <Form.Control
                type="text"
                value={query}
                onChange={handleChange}
                onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
                placeholder={enableSuggestions ? 'Search or type any location...' : 'Type a location...'}
                autoComplete="off"
            />
            {showDropdown && suggestions.length > 0 && (
                <div className="friend-search-results" role="listbox" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {suggestions.map((item, idx) => (
                        <div
                            key={idx}
                            role="option"
                            aria-selected="false"
                            tabIndex={0}
                            className="friend-search-item"
                            onClick={() => handleSelect(item)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSelect(item); } }}
                            style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                        >
                            <span style={{ color: 'var(--text-main)' }}>{item.displayName}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LocationSearch;
