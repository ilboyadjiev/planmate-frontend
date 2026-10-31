import React from 'react';

const Impressum = () => {
    return (
        <div style={{ maxWidth: '800px', margin: '60px auto', padding: '0 20px', color: 'var(--text-main)' }}>
            <h1 style={{ marginBottom: '24px' }}>Impressum (Legal Notice)</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
                Information provided according to Sec. 5 German Telemedia Act (TMG):
            </p>

            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Provider</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                Ilian Boyadjiev<br />
                Munich<br />
                80992 Munich, Germany
            </p>

            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Contact</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                Email: ilianboyadjiev1@gmail.com<br />
                Phone: X
            </p>

            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Dispute Resolution</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                The European Commission provides a platform for online dispute resolution (OS): <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>https://ec.europa.eu/consumers/odr</a>.<br />
                We are not willing or obliged to participate in dispute resolution proceedings before a consumer arbitration board.
            </p>
        </div>
    );
};

export default Impressum;