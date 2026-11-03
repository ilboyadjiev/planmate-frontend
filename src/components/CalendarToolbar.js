import React from 'react';

const VIEWS = ['month', 'week', 'day', 'agenda'];

/**
 * react-big-calendar toolbar: the period label with the "New event" button on top,
 * then navigation and view switching.
 */
const CalendarToolbar = ({ label, view, onNavigate, onView, onCreateEvent }) => (
    <div className="custom-calendar-toolbar">
        <div className="toolbar-top">
            <h3 className="toolbar-label">{label}</h3>
            {onCreateEvent && (
                <button type="button" className="toolbar-new-event" onClick={onCreateEvent}>
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    New event
                </button>
            )}
        </div>

        <div className="toolbar-controls">
            <div className="toolbar-nav-group">
                <button type="button" className="toolbar-button" onClick={() => onNavigate('PREV')} aria-label="Previous">&larr;</button>
                <button type="button" className="toolbar-button" onClick={() => onNavigate('TODAY')}>Today</button>
                <button type="button" className="toolbar-button" onClick={() => onNavigate('NEXT')} aria-label="Next">&rarr;</button>
            </div>

            <div className="toolbar-view-group" role="group" aria-label="Calendar view">
                {VIEWS.map(viewName => (
                    <button
                        key={viewName}
                        type="button"
                        className={`toolbar-button${view === viewName ? ' active' : ''}`}
                        aria-pressed={view === viewName}
                        onClick={() => onView(viewName)}
                    >
                        {viewName.charAt(0).toUpperCase() + viewName.slice(1)}
                    </button>
                ))}
            </div>
        </div>
    </div>
);

export default CalendarToolbar;
