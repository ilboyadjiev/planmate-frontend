import React from 'react';

const CalendarToolbar = (toolbar) => {
    const goToBack = () => toolbar.onNavigate('PREV');
    const goToNext = () => toolbar.onNavigate('NEXT');
    const goToCurrent = () => toolbar.onNavigate('TODAY');

    const baseButtonStyle = {
        padding: '6px 12px',
        fontSize: '0.85rem',
        fontWeight: '600',
        borderRadius: '6px',
        background: 'transparent',
        color: 'var(--text-main)',
        border: '1px solid var(--border)',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out'
    };

    return (
        <div className="custom-calendar-toolbar">
            <div className="toolbar-nav-group">
                <button style={baseButtonStyle} onClick={goToBack}>&larr;</button>
                <button style={baseButtonStyle} onClick={goToCurrent}>Today</button>
                <button style={baseButtonStyle} onClick={goToNext}>&rarr;</button>
            </div>
            
            {/* Current Month/Date Label */}
            <h3 className="toolbar-label">
                {toolbar.label}
            </h3>

            <div className="toolbar-view-group">
                {['month', 'week', 'day', 'agenda'].map(viewName => (
                    <button 
                        key={viewName}
                        onClick={() => toolbar.onView(viewName)}
                        style={{
                            ...baseButtonStyle,
                            background: toolbar.view === viewName ? 'var(--primary)' : 'transparent',
                            color: toolbar.view === viewName ? '#fff' : 'var(--text-muted)',
                            borderColor: toolbar.view === viewName ? 'var(--primary)' : 'var(--border)'
                        }}
                    >
                        {viewName.charAt(0).toUpperCase() + viewName.slice(1)}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default CalendarToolbar;