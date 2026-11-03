import React from 'react';
import { NavLink } from 'react-router-dom';

/** Switches between the Friends and Friend Groups pages. */
const SocialTabs = () => (
    <nav className="social-tabs" aria-label="Friends and groups">
        <NavLink to="/profile/friends" className="social-tab">Friends</NavLink>
        <NavLink to="/profile/groups" className="social-tab">Groups</NavLink>
    </nav>
);

export default SocialTabs;
