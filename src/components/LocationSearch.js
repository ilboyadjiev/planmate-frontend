import React, { useState, useRef, useEffect } from 'react';
import { Form } from 'react-bootstrap';
import api from '../api/client';

const LocationSearch = ({ initialQuery, onSelectLocation }) => {
    const [query, setQuery] = useState(initialQuery || '');
    const [suggestions, setSuggestions] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    
    const searchTimeoutRef = useRef(null);
    const wrapperRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        }
        
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleSearch = (e) => {
        const value = e.target.value;
        setQuery(value);
        onSelectLocation(null); 

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        if (!value || value.trim().length < 3) {
            setSuggestions([]);
            setShowDropdown(false);
            return;
        }

        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await api.get('/v1/locations/autocomplete', { params: { q: value } });
                setSuggestions(res.data);
                setShowDropdown(true);
            } catch (err) { console.error(err); }
        }, 300);
    };

    const handleSelect = (suggestion) => {
        setQuery(suggestion.displayName);
        onSelectLocation({
            name: suggestion.displayName.split(',')[0],
            street: suggestion.street, 
            city: suggestion.city,
            zipcode: suggestion.zipcode, 
            country: suggestion.country
        });
        setShowDropdown(false);
    };

    return (
        <div ref={wrapperRef} style={{ position: 'relative' }}>
            <Form.Control 
                type="text" 
                value={query} 
                onChange={handleSearch} 
                onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }} // Re-open on focus if results exist
                placeholder="Search location..." 
                autoComplete="off" 
            />
            {showDropdown && suggestions.length > 0 && (
                <div className="friend-search-results" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {suggestions.map((item, idx) => (
                        <div 
                            key={idx} 
                            className="friend-search-item" 
                            onClick={() => handleSelect(item)} 
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