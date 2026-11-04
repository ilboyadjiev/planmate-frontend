import React from 'react';
import './CalendarLoader.css';

/**
 * PlanMate's loading animation (canvas "Calendar Loader", option B): a small desk calendar whose page tears off
 * and falls away, showing the next page. Used instead of "Loading…" text.
 *
 * It only fades in after `delay` ms, so quick loads never flash it. The label is for screen readers (role=status),
 * and shown under the calendar only with showLabel.
 *
 * label: what is loading, e.g. "Loading events…". size: the calendar's size in px. className: for placement.
 */
const CalendarLoader = ({ label = 'Loading…', size = 72, delay = 300, showLabel = false, className = '' }) => (
    <div className={`cal-loader ${className}`.trim()} role="status"
        style={{ '--cal-loader-size': `${size}px`, '--cal-loader-delay': `${delay}ms` }}>
        <span className="cal-loader-icon" aria-hidden="true">
            <span className="cal-loader-ring is-left" />
            <span className="cal-loader-ring is-right" />
            <span className="cal-loader-frame" />
            <span className="cal-loader-head" />
            <span className="cal-loader-body">
                <span className="cal-loader-page" />
                <span className="cal-loader-page is-front" />
            </span>
        </span>
        <span className={showLabel ? 'cal-loader-label' : 'visually-hidden'}>{label}</span>
    </div>
);

export default CalendarLoader;
