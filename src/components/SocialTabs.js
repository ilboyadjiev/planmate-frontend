import React from 'react';
import { NavLink } from 'react-router-dom';

/** Switches between the Find people, Friends and Friend Groups pages. */
const SocialTabs = () => (
    <nav className="social-tabs" aria-label="People, friends and groups">
        <NavLink to="/profile/find" className="social-tab">Find</NavLink>
        <NavLink to="/profile/friends" className="social-tab">Friends</NavLink>
        <NavLink to="/profile/groups" className="social-tab">Groups</NavLink>
    </nav>
);

export default SocialTabs;
