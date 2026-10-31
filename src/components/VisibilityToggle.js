import React from 'react';

const VisibilityToggle = ({ isPublic, onChange }) => {
    return (
        <div style={{ 
            display: 'flex', 
            position: 'relative',
            background: 'var(--bg-color)', 
            padding: '4px', 
            borderRadius: '12px', 
            border: '1px solid var(--border)',
            width: '100%',
            userSelect: 'none'
        }}>
            <div style={{
                position: 'absolute',
                top: '4px',
                bottom: '4px',
                left: isPublic ? '4px' : '50%',
                width: 'calc(50% - 4px)',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: 1,
                boxShadow: 'var(--shadow-sm)'
            }} />

            <div 
                onClick={() => onChange(true)}
                style={{ 
                    flex: 1, textAlign: 'center', padding: '10px 0',
                    fontWeight: '600', fontSize: '0.95rem',
                    color: isPublic ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: 'pointer', zIndex: 2, transition: 'color 0.3s'
                }}
            >
                🌍 Show In Feed
            </div>
            
            <div 
                onClick={() => onChange(false)}
                style={{ 
                    flex: 1, textAlign: 'center', padding: '10px 0',
                    fontWeight: '600', fontSize: '0.95rem',
                    color: !isPublic ? '#818cf8' : 'var(--text-muted)',
                    cursor: 'pointer', zIndex: 2, transition: 'color 0.3s'
                }}
            >
                🔒 Invites Only
            </div>
        </div>
    );
};

export default VisibilityToggle;