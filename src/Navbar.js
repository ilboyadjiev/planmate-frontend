import React, { useContext } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import planmateIcon from './planmate-icon.png';
import './Navbar.css';

const Navbar = () => {
    const { authToken, user, logout } = useContext(AuthContext);

    return (
        <nav className="modern-navbar">
            <Link className="navbar-brand" to="/">
                <img src={planmateIcon} alt="PlanMate Logo" />
                PlanMate
            </Link>

            {authToken && (
                <div className="navbar-links">
                    <NavLink to="/dashboard" className="nav-link">Dashboard</NavLink>
                    <NavLink to="/profile/friends" className="nav-link">Friends</NavLink>
                </div>
            )}

            <div className="navbar-actions">
                {authToken ? (
                    <>
                        <span className="user-greeting">
                            Hello, {user?.firstName || user?.username || 'User'}
                        </span>
                        <NavLink to="/profile/edit" className="nav-link">Profile</NavLink>
                        <button className="btn-modern-secondary" style={{ padding: '8px 16px', fontSize: '0.9rem' }} onClick={logout}>
                            Logout
                        </button>
                    </>
                ) : (
                    <>
                        <Link className="nav-link" to="/login">Login</Link>
                        <Link className="btn-modern-primary" style={{ padding: '8px 16px', fontSize: '0.9rem', textDecoration: 'none' }} to="/register">
                            Register
                        </Link>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;