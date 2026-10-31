import React from 'react';

const Privacy = () => {
    return (
        <div style={{ maxWidth: '800px', margin: '60px auto', padding: '0 20px', color: 'var(--text-main)', lineHeight: '1.6' }}>
            <h1 style={{ marginBottom: '24px' }}>Privacy Policy</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Last updated: March 2026</p>

            <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', marginTop: '24px' }}>1. Data Collection</h3>
            <p style={{ color: 'var(--text-muted)' }}>We collect your email address, chosen username, and the calendar events you create. This data is strictly used to provide the PlanMate syncing service across your devices.</p>

            <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', marginTop: '24px' }}>2. Local Storage & Cookies</h3>
            <p style={{ color: 'var(--text-muted)' }}>PlanMate uses strictly necessary browser Local Storage to maintain your login session and save your offline calendar events. We do not use third-party tracking cookies.</p>

            <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', marginTop: '24px' }}>3. Data Storage & Security</h3>
            <p style={{ color: 'var(--text-muted)' }}>Your data is securely stored on servers located in [Frankfurt, Germany / Google Cloud]. Passwords are cryptographically hashed and cannot be read by our team.</p>

            <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', marginTop: '24px' }}>4. Your GDPR Rights (Right to be Forgotten)</h3>
            <p style={{ color: 'var(--text-muted)' }}>You have the right to request the complete deletion of your personal data. You can instantly delete your account and all associated data via the "Profile" settings page inside the application.</p>
        </div>
    );
};

export default Privacy;