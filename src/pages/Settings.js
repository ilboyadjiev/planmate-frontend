import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './FriendGroups.css';

/**
 * Settings, reached from the gear on your profile. There are no settings yet: this is a placeholder for things
 * like notifications and privacy. Log out lives here, since your picture in the navbar opens your profile.
 */
const Settings = () => {
    const { user, logout } = useContext(AuthContext);

    return (
        <div className="groups-page settings-page">
            <div className="settings-topline">
                <Link to={user ? `/people/${user.id}` : '/dashboard'} className="settings-back">← Your profile</Link>
            </div>
            <h1>Settings</h1>

            <section className="settings-card" aria-labelledby="settings-coming">
                <h2 id="settings-coming">Nothing to set up yet</h2>
                <p className="group-muted">
                    Settings such as notifications and privacy will appear here. To change your name, city or contact
                    details, <Link to="/profile/edit">edit your profile</Link>.
                </p>
            </section>

            <section className="settings-card" aria-labelledby="settings-account">
                <h2 id="settings-account">Account</h2>
                <div className="settings-row">
                    <span className="group-muted">Logged in as @{user?.username}</span>
                    <button type="button" className="group-button" onClick={logout}>Log out</button>
                </div>
            </section>
        </div>
    );
};

export default Settings;
