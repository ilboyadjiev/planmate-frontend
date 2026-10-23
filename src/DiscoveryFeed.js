import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from './config';
import moment from 'moment';

const DiscoveryFeed = ({ onAddEvent }) => {
    const [feedEvents, setFeedEvents] = useState([]);
    const [activeTag, setActiveTag] = useState('#munich'); // Default local tag
    const [loading, setLoading] = useState(false);

    const popularTags = ['#munich', '#gaming', '#tech', '#music', '#food'];

    useEffect(() => {
        const fetchFeed = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`${config.baseUrl}/api/v2/events/feed`, {
                    params: { tag: activeTag }
                });
                setFeedEvents(res.data);
            } catch (err) {
                console.error("Could not fetch discovery feed", err);
            } finally {
                setLoading(false);
            }
        };

        fetchFeed();
    }, [activeTag]);

    return (
        <div style={{ 
            background: 'var(--surface)', 
            borderRadius: '12px', 
            padding: '20px', 
            border: '1px solid var(--border)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '16px' }}>📍 Discover</h3>
            
            {/* Tag selector */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {popularTags.map(tag => (
                    <span 
                        key={tag} 
                        onClick={() => setActiveTag(tag)}
                        style={{
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            background: activeTag === tag ? '#4F46E5' : 'rgba(79, 70, 229, 0.1)',
                            color: activeTag === tag ? '#fff' : '#4F46E5',
                            transition: 'all 0.2s'
                        }}
                    >
                        {tag}
                    </span>
                ))}
            </div>

            {/* Event List */}
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Loading events...</p>
                ) : feedEvents.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No upcoming events for {activeTag}.</p>
                ) : (
                    feedEvents.map(event => (
                        <div key={event.id} style={{ 
                            padding: '16px', 
                            marginBottom: '12px', 
                            borderRadius: '8px', 
                            background: 'var(--background)',
                            border: '1px solid var(--border)'
                        }}>
                            <h4 style={{ fontSize: '1rem', margin: '0 0 8px 0', fontWeight: '600' }}>{event.title}</h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
                                📅 {moment(event.startTime).format('MMM Do, h:mm a')}
                            </p>
                            <p style={{ fontSize: '0.9rem', marginBottom: '12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {event.description}
                            </p>
                            <button 
                                onClick={() => onAddEvent(event)}
                                style={{ 
                                    width: '100%', padding: '6px', borderRadius: '6px', 
                                    background: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5', 
                                    border: '1px solid rgba(79, 70, 229, 0.3)', fontWeight: '600', cursor: 'pointer' 
                                }}
                            >
                                + Add to Calendar
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default DiscoveryFeed;