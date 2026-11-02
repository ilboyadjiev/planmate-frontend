import React, { useState, useEffect } from 'react';
import api from '../api/client';
import moment from 'moment';

const DiscoveryFeed = ({ onAddEvent }) => {
    const [feedEvents, setFeedEvents] = useState([]);
    const [activeTag, setActiveTag] = useState('#munich');
    const [loading, setLoading] = useState(false);
    
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const popularTags = ['#munich', '#gaming', '#tech', '#music', '#food'];

    useEffect(() => {
        const fetchFeed = async () => {
            setLoading(true);
            try {
                const res = await api.get('/v2/events/feed', {
                    params: { 
                        tag: activeTag,
                        page: page,
                        size: 3
                    }
                });
                setFeedEvents(res.data.events);
                setTotalPages(res.data.totalPages);
            } catch (err) {
                console.error("Could not fetch discovery feed", err);
            } finally {
                setLoading(false);
            }
        };

        fetchFeed();
    }, [activeTag, page]);

    const handleTagChange = (tag) => {
        setActiveTag(tag);
        setPage(0);
    };

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
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-main)' }}>📍 Discover</h3>
            
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {popularTags.map(tag => (
                    <span 
                        key={tag} 
                        onClick={() => handleTagChange(tag)}
                        style={{
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            background: activeTag === tag ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                            color: activeTag === tag ? '#fff' : 'var(--text-muted)',
                            border: `1px solid ${activeTag === tag ? 'var(--primary)' : 'var(--border)'}`,
                            transition: 'all 0.2s'
                        }}
                    >
                        {tag}
                    </span>
                ))}
            </div>

            {/* Event List Container */}
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px', minHeight: '350px' }}>
                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Loading events...</p>
                ) : feedEvents.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No upcoming events for {activeTag}.</p>
                ) : (
                    feedEvents.map(event => (
                        <div key={event.id || event._id} style={{ 
                            padding: '16px', 
                            marginBottom: '12px', 
                            borderRadius: '8px', 
                            background: 'var(--bg-color)',
                            border: '1px solid var(--border)'
                        }}>
                            <h4 style={{ fontSize: '1rem', margin: '0 0 8px 0', fontWeight: '600', color: 'var(--text-main)' }}>{event.title}</h4>
                            
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
                                📅 {moment(event.startTime).format('MMM Do, h:mm a')}
                            </p>
                            
                            <p style={{ fontSize: '0.9rem', marginBottom: '12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', color: 'var(--text-main)' }}>
                                {event.description}
                            </p>
                            
                            <button 
                                onClick={() => onAddEvent(event)}
                                style={{ 
                                    width: '100%', padding: '8px', borderRadius: '6px', 
                                    background: 'rgba(79, 70, 229, 0.1)', color: '#818cf8', 
                                    border: '1px solid rgba(79, 70, 229, 0.3)', fontWeight: '600', cursor: 'pointer',
                                    transition: 'background 0.2s'
                                }}
                                onMouseOver={(e) => e.target.style.background = 'rgba(79, 70, 229, 0.2)'}
                                onMouseOut={(e) => e.target.style.background = 'rgba(79, 70, 229, 0.1)'}
                            >
                                + Add to Calendar
                            </button>
                        </div>
                    ))
                )}
            </div>

            {!loading && totalPages > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                    <button 
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        style={{ 
                            background: 'transparent', border: 'none', color: page === 0 ? 'var(--text-muted)' : 'var(--primary)', 
                            fontWeight: '600', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.5 : 1 
                        }}
                    >
                        &larr; Prev
                    </button>
                    
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {page + 1} / {totalPages}
                    </span>
                    
                    <button 
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        style={{ 
                            background: 'transparent', border: 'none', color: page >= totalPages - 1 ? 'var(--text-muted)' : 'var(--primary)', 
                            fontWeight: '600', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.5 : 1 
                        }}
                    >
                        Next &rarr;
                    </button>
                </div>
            )}
        </div>
    );
};

export default DiscoveryFeed;