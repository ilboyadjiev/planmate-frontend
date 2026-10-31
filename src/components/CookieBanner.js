import React, { useState, useEffect } from 'react';

const CookieBanner = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('planmate_cookie_consent');
        if (!consent) {
            setIsVisible(true);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('planmate_cookie_consent', 'accepted');
        setIsVisible(false);
    };

    const handleDecline = () => {
        localStorage.setItem('planmate_cookie_consent', 'declined');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            padding: '24px',
            borderRadius: '16px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            maxWidth: '600px',
            width: '90%'
        }}>
            <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: '700' }}>We value your privacy</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    We use strictly necessary local storage to keep your sessions active and save your offline calendar events. We do not use analytics. 
                    <a href="/privacy" style={{ color: 'var(--primary)', textDecoration: 'none', marginLeft: '4px' }}>Read our Privacy Policy.</a>
                </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button onClick={handleDecline} className="btn-modern-secondary" style={{ padding: '8px 24px', fontSize: '0.9rem' }}>
                    Decline
                </button>
                <button onClick={handleAccept} className="btn-modern-primary" style={{ padding: '8px 24px', fontSize: '0.9rem' }}>
                    Accept
                </button>
            </div>
        </div>
    );
};

export default CookieBanner;