import React, { useContext, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import planmateIcon from '../assets/planmate-icon.png';
import './Navbar.css';
import { Modal, Button } from 'react-bootstrap';

const Navbar = () => {
    const { authToken, user, logout } = useContext(AuthContext);
    const [showOfflineInfo, setShowOfflineInfo] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navigate = useNavigate();

    const closeMenu = () => setMobileMenuOpen(false);

    return (
        <>
        <nav className="modern-navbar">
            <div className="navbar-header-mobile">
                <Link className="navbar-brand" to="/" onClick={closeMenu}>
                    <img src={planmateIcon} alt="PlanMate Logo" />
                    PlanMate
                </Link>
                
                {/* Hamburger Toggle Button */}
                <button 
                    className="mobile-menu-toggle" 
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle navigation"
                >
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        {mobileMenuOpen ? (
                            <>
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </>
                        ) : (
                            <>
                                <line x1="3" y1="12" x2="21" y2="12"></line>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <line x1="3" y1="18" x2="21" y2="18"></line>
                            </>
                        )}
                    </svg>
                </button>
            </div>

            <div className={`navbar-collapse-content ${mobileMenuOpen ? 'open' : ''}`}>
                <div className="navbar-links">
                    <NavLink to="/dashboard" className="nav-link" onClick={closeMenu}>Dashboard</NavLink>
                    {authToken && (
                        <NavLink to="/profile/friends" className="nav-link" onClick={closeMenu}>Friends</NavLink>
                    )}
                </div>

                <div className="navbar-actions">
                    {!authToken && (
                        <div className="offline-badge" onClick={() => { setShowOfflineInfo(true); closeMenu(); }}>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                <line x1="12" y1="9" x2="12" y2="13"></line>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                            Local Mode: Log in to sync
                        </div>
                    )}

                    {authToken ? (
                        <>
                            <span className="user-greeting">
                                Hello, {user?.firstName || user?.username || 'User'}
                            </span>
                            <NavLink to="/profile/edit" className="nav-link" onClick={closeMenu}>Profile</NavLink>
                            <button className="btn-modern-secondary" style={{ padding: '8px 16px', fontSize: '0.9rem' }} onClick={() => { logout(); closeMenu(); }}>
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link className="nav-link" to="/login" onClick={closeMenu}>Login</Link>
                            <Link className="btn-modern-primary" style={{ padding: '8px 16px', fontSize: '0.9rem', textDecoration: 'none' }} to="/register" onClick={closeMenu}>
                                Register
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>

        <Modal show={showOfflineInfo} onHide={() => setShowOfflineInfo(false)} contentClassName="modern-modal" centered>
            <Modal.Header closeButton>
                <Modal.Title style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}>
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    Local Mode Active
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '16px' }}>
                    You are currently using PlanMate in <strong>Local Mode</strong>. You can test out the dashboard and create events, but your data is only saved temporarily in your browser.
                </p>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <ul style={{ color: 'var(--text-main)', margin: 0, paddingLeft: '16px', fontSize: '0.9rem' }}>
                        <li style={{ marginBottom: '8px' }}><strong>No Cloud Sync:</strong> Events won't appear on your phone.</li>
                        <li style={{ marginBottom: '8px' }}><strong>No Friends:</strong> You cannot invite others to your events.</li>
                        <li><strong>Risk of Deletion:</strong> If you clear your browser cache, your schedule will be permanently lost.</li>
                    </ul>
                </div>
                <div style={{ marginTop: '16px', padding: '12px', borderLeft: '4px solid #4F46E5', backgroundColor: 'rgba(79, 70, 229, 0.1)' }}>
                    <p style={{ color: 'var(--text-main)', fontSize: '0.85rem', margin: 0, lineHeight: '1.5' }}>
                        <strong>🛡️ Our Privacy Promise:</strong> PlanMate is a privacy-first project. We have absolutely zero interest in selling or misusing your personal information. When you create an account, your data is securely stored purely to sync your devices and connect you with friends. No trackers, no data brokers, just your schedule.
                    </p>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowOfflineInfo(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}>
                    Continue Offline
                </Button>
                <Button variant="primary" onClick={() => { setShowOfflineInfo(false); navigate('/register'); }} className="btn-modern-primary" style={{ padding: '8px 24px' }}>
                    Create Free Account
                </Button>
            </Modal.Footer>
        </Modal>
        </>
    );
};

export default Navbar;