import React, { useContext, useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Avatar from './Avatar';
import api from '../api/client';
import { FRIENDS_CHANGED, countIncomingRequests } from '../services/friendEvents';
import { INVITES_CHANGED, countUnansweredInvites } from '../services/inviteEvents';
import { requestSearchFocus } from '../services/searchFocus';
import planmateIcon from '../assets/planmate-icon.png';
import useHideOnScroll from '../hooks/useHideOnScroll';
import './Navbar.css';


const Icon = ({ children, size = 22 }) => (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {children}
    </svg>
);

const CompassIcon = () => <Icon><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></Icon>;
const CalendarIcon = () => <Icon><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></Icon>;
const SearchIcon = () => <Icon><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Icon>;
const FriendsIcon = () => <Icon><circle cx="9" cy="8.5" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" /><path d="M16 5.2a3.3 3.3 0 0 1 0 6.6M18 14.8c2 .6 3.2 2.3 3.5 5.2" /></Icon>;
const UserIcon = () => <Icon><circle cx="12" cy="8" r="4" /><path d="M4 20.5c.8-4 3.9-6 8-6s7.2 2 8 6" /></Icon>;
const LoginIcon = () => <Icon><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /><path d="M10 16l4-4-4-4M14 12H4" /></Icon>;
const SparkIcon = () => <Icon><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" /></Icon>;
// Disabled together with the Local Mode warning
// const WarningIcon = ({ size = 16 }) => (
//     <Icon size={size}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><path d="M12 9v4M12 17h.01" /></Icon>
// );

const INVITE_POLL_MS = 3 * 60 * 1000;

const initialsOf = (user) => {
    const letters = [user?.firstName, user?.lastName].filter(Boolean).map(p => p.trim()[0]).join('');
    return (letters || user?.username?.[0] || user?.email?.[0] || '?').toUpperCase();
};

const Badge = ({ count, label }) => (count > 0 ? (
    <span className="pm-badge">
        {count > 9 ? '9+' : count}
        <span className="visually-hidden"> {label}</span>
    </span>
) : null);

/**
 * App navigation, in liquid glass, in the same order everywhere: Friends, Search, Discover, Calendar, You.
 * - Large screens: a floating glass top bar: PlanMate on the left, Friends / Search / Discover / Calendar in a glass
 *   track in the middle, and "You" (your picture) on the right. Discover shows the feed with the calendar beside it;
 *   Calendar shows the calendar on its own.
 * - Small screens: a slim glass top bar with PlanMate, plus a glass tab bar at the bottom. Its tabs are icons; the
 *   current one widens into an orange glass pill with its name.
 * The top bar slides away while scrolling down and comes back on scrolling up (or when it gets keyboard focus).
 * Guests get Search, Discover and Calendar, plus Log in and Sign up.
 */
const Navbar = () => {
    const { authToken, user } = useContext(AuthContext);
    // Disabled: Local Mode warning (its privacy message now lives on the register page)
    // const [showOfflineInfo, setShowOfflineInfo] = useState(false);
    const [incomingRequests, setIncomingRequests] = useState(0);
    const [unansweredInvites, setUnansweredInvites] = useState(0);
    const location = useLocation();
    const [topBarHidden, setTopBarHidden] = useHideOnScroll();
    // const navigate = useNavigate();

    const loggedIn = !!authToken && !!user;
    const userId = user?.id;

    // A new page starts with the top bar showing
    useEffect(() => { setTopBarHidden(false); }, [location.pathname, setTopBarHidden]);

    // Pending friend requests for the badge: on login, on every page change and when FriendsList changes them
    useEffect(() => {
        if (!loggedIn || !userId) {
            setIncomingRequests(0);
            return undefined;
        }
        let cancelled = false;
        const refresh = () => api.get(`/v1/users/${userId}/friends`)
            .then(res => { if (!cancelled) setIncomingRequests(countIncomingRequests(res.data, userId)); })
            .catch(() => {});
        refresh();
        window.addEventListener(FRIENDS_CHANGED, refresh);
        return () => {
            cancelled = true;
            window.removeEventListener(FRIENDS_CHANGED, refresh);
        };
    }, [loggedIn, userId, location.pathname]);

    // Invitations waiting for your answer, for the badge on Calendar: on login, on every page change, when one is
    // answered, when you come back to the tab, and every few minutes (someone may invite you while you're here)
    useEffect(() => {
        if (!loggedIn || !userId) {
            setUnansweredInvites(0);
            return undefined;
        }
        let cancelled = false;
        const refresh = () => countUnansweredInvites()
            .then(count => { if (!cancelled) setUnansweredInvites(count); })
            .catch(() => {});
        const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
        refresh();
        window.addEventListener(INVITES_CHANGED, refresh);
        document.addEventListener('visibilitychange', onVisible);
        const timer = window.setInterval(onVisible, INVITE_POLL_MS);
        return () => {
            cancelled = true;
            window.removeEventListener(INVITES_CHANGED, refresh);
            document.removeEventListener('visibilitychange', onVisible);
            window.clearInterval(timer);
        };
    }, [loggedIn, userId, location.pathname]);

    // Search tapped again while on the search page: keep the results and put the cursor in the field instead
    const onSearchClick = (e) => {
        if (location.pathname === '/search') {
            e.preventDefault();
            requestSearchFocus();
        }
    };

    // "You" opens your profile; edit profile and settings are reached from there
    const profilePath = userId ? `/people/${userId}` : '/profile/edit';
    const onSettings = ['/profile/edit', '/settings'].includes(location.pathname);
    // Friends and Groups share an entry; the pages switch between each other
    const friendsClass = (base) => ({ isActive }) =>
        `${base}${isActive || ['/profile/groups', '/profile/find'].includes(location.pathname) ? ' active' : ''}`;
    const youClass = (base) => ({ isActive }) => `${base}${isActive || onSettings ? ' active' : ''}`;

    const requestLabel = `new friend request${incomingRequests === 1 ? '' : 's'}`;
    const inviteLabel = `invitation${unansweredInvites === 1 ? '' : 's'} to answer`;

    return (
        <>
            <header className={`pm-topbar${topBarHidden ? ' is-hidden' : ''}`}>
                <div className="pm-topbar-glass">
                    <Link className="pm-brand" to="/">
                        <img src={planmateIcon} alt="" />
                        <span>PlanMate</span>
                    </Link>

                    <nav className="pm-topnav" aria-label="Main">
                        {loggedIn && (
                            <NavLink to="/profile/friends" className={friendsClass('pm-topnav-link')}>
                                <FriendsIcon /> Social
                                <Badge count={incomingRequests} label={requestLabel} />
                            </NavLink>
                        )}
                        <NavLink to="/search" className="pm-topnav-link" onClick={onSearchClick}>
                            <SearchIcon /> Search
                        </NavLink>
                        <NavLink to="/dashboard" className="pm-topnav-link">
                            <CompassIcon /> Discover
                        </NavLink>
                        <NavLink to="/calendar" className="pm-topnav-link">
                            <CalendarIcon /> Calendar
                            <Badge count={unansweredInvites} label={inviteLabel} />
                        </NavLink>
                    </nav>

                    <div className="pm-topbar-actions">
                        {/* Disabled: Local Mode warning (its privacy message now lives on the register page)
                        {!loggedIn && (
                            <button type="button" className="pm-local-pill" onClick={() => setShowOfflineInfo(true)}>
                                <WarningIcon />
                                <span className="pm-local-long">Local mode: log in to sync</span>
                                <span className="pm-local-short">Local mode</span>
                            </button>
                        )}
                        */}

                        {loggedIn ? (
                            // Your picture and "You" open your profile, like on social apps; settings and log out live there
                            <NavLink to={profilePath} className={youClass('pm-you')}>
                                <Avatar person={user} className="pm-avatar" text={initialsOf(user)} tint={false} />
                                <span>You</span>
                            </NavLink>
                        ) : (
                            <div className="pm-auth-links">
                                <Link className="pm-login-link" to="/login">Log in</Link>
                                <Link className="pm-signup-button" to="/register">Sign up</Link>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <nav className="pm-tabbar" aria-label="Main">
                {loggedIn && (
                    <NavLink to="/profile/friends" className={friendsClass('pm-tab')}>
                        <span className="pm-tab-icon"><FriendsIcon /><Badge count={incomingRequests} label={requestLabel} /></span>
                        <span className="pm-tab-label">Social</span>
                    </NavLink>
                )}
                <NavLink to="/search" className="pm-tab" onClick={onSearchClick}>
                    <SearchIcon /><span className="pm-tab-label">Search</span>
                </NavLink>
                <NavLink to="/dashboard" className="pm-tab">
                    <CompassIcon /><span className="pm-tab-label">Discover</span>
                </NavLink>
                <NavLink to="/calendar" className="pm-tab">
                    <span className="pm-tab-icon"><CalendarIcon /><Badge count={unansweredInvites} label={inviteLabel} /></span>
                    <span className="pm-tab-label">Calendar</span>
                </NavLink>
                {loggedIn ? (
                    <NavLink to={profilePath} className={youClass('pm-tab')}>
                        <UserIcon /><span className="pm-tab-label">You</span>
                    </NavLink>
                ) : (
                    <>
                        <NavLink to="/login" className="pm-tab"><LoginIcon /><span className="pm-tab-label">Log in</span></NavLink>
                        <NavLink to="/register" className="pm-tab pm-tab-highlight"><SparkIcon /><span className="pm-tab-label">Sign up</span></NavLink>
                    </>
                )}
            </nav>

            {/* Disabled: Local Mode pop-up (its privacy message now lives on the register page)
            <Modal show={showOfflineInfo} onHide={() => setShowOfflineInfo(false)} contentClassName="modern-modal" centered>
                <Modal.Header closeButton>
                    <Modal.Title style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}>
                        <span style={{ color: '#FCD34D', display: 'inline-flex' }}><WarningIcon size={24} /></span>
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
            */}
        </>
    );
};

export default Navbar;
