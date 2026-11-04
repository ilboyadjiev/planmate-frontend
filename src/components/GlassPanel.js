import React from 'react';

/**
 * PlanMate's liquid glass panel (styles: .pm-glass, .pm-glows, .pm-glass-panel in index.css): a frosted, see-through
 * panel over soft orange, indigo and green glows. Used by the calendar, Discover, Search, and the profile, friends
 * and groups pages.
 *
 * as: the panel's element (section by default). tall: spreads the glows down a long panel.
 * shellClassName: extra classes for the outer shell (e.g. a page width). Other props go to the panel.
 */
const GlassPanel = ({ as: Tag = 'section', tall = false, className = '', shellClassName = '', children, ...rest }) => (
    <div className={`pm-glass ${shellClassName}`.trim()}>
        <div className={`pm-glows${tall ? ' is-tall' : ''}`} aria-hidden="true"><span /><span /><span /></div>
        <Tag className={`pm-glass-panel ${className}`.trim()} {...rest}>{children}</Tag>
    </div>
);

export default GlassPanel;
