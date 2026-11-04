import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import GlassPanel from '../components/GlassPanel';

const Register = () => {
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', password: '', email: '', username: '',
        street: '', zipcode: '', city: '', country: '', mobile: ''
    });

    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const { register } = useContext(AuthContext);
    
    // Status can be null, 'success', or 'error'
    const [emailStatus, setEmailStatus] = useState(null);
    const [userStatus, setUserStatus] = useState(null);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setError(null);
            await register({
                ...formData,
                contactData: {
                    street: formData.street, zipcode: formData.zipcode, city: formData.city,
                    country: formData.country, mobile: formData.mobile
                }
            });
            navigate('/dashboard');
        } catch (error) {
            setError(error.response?.data?.error || 'Registration failed. Please try again.');
        }
    };

    const checkAvailability = async (type, value) => {
        if (!value) return;
        const setStatus = type === 'email' ? setEmailStatus : setUserStatus;
        try {
            const endpoint = type === 'email' ? 'check-email-exists' : 'check-username-exists';
            const response = await api.get(`/v1/auth/${endpoint}/${encodeURIComponent(value)}`);
            setStatus(response.data.available ? 'success' : 'error');
        } catch (error) {
            setStatus('error');
        }
    };

    return (
        <div className="auth-page-wrapper">
            <GlassPanel tall shellClassName="auth-glass auth-glass-wide" className="auth-panel" aria-labelledby="register-title">
                <h1 id="register-title">Create your account</h1>
                <p className="auth-subtitle">Plan with friends and find what's on around you.</p>
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="register-firstName">First Name</label>
                            <input type="text" id="register-firstName" name="firstName" value={formData.firstName} onChange={handleChange} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="register-lastName">Last Name</label>
                            <input type="text" id="register-lastName" name="lastName" value={formData.lastName} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="register-email">Email Address *</label>
                        <div className="input-with-button">
                            <input type="email" id="register-email" name="email" value={formData.email} onChange={handleChange} required />
                            <button type="button" className="pm-glass-button auth-check" onClick={() => checkAvailability('email', formData.email)}>Check</button>
                        </div>
                        {emailStatus === 'success' && <span className="availability-message msg-success">Email is available!</span>}
                        {emailStatus === 'error' && <span className="availability-message msg-error">Email is already taken.</span>}
                    </div>

                    <div className="form-row">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="register-username">Username *</label>
                            <div className="input-with-button">
                                <input type="text" id="register-username" name="username" value={formData.username} onChange={handleChange} required />
                                <button type="button" className="pm-glass-button auth-check" onClick={() => checkAvailability('username', formData.username)}>Check</button>
                            </div>
                            {userStatus === 'success' && <span className="availability-message msg-success">Username is available!</span>}
                            {userStatus === 'error' && <span className="availability-message msg-error">Username is taken.</span>}
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="register-password">Password *</label>
                            <input type="password" id="register-password" name="password" value={formData.password} onChange={handleChange} required />
                        </div>
                    </div>

                    <div className="auth-divider auth-divider-left"><span>Optional contact info</span></div>

                    <div className="form-row">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="register-street">Street</label>
                            <input type="text" id="register-street" name="street" value={formData.street} onChange={handleChange} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="register-zipcode">Zipcode</label>
                            <input type="text" id="register-zipcode" name="zipcode" value={formData.zipcode} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="register-city">City</label>
                            <input type="text" id="register-city" name="city" value={formData.city} onChange={handleChange} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }} />
                    </div>

                    <div className="form-row">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="register-country">Country</label>
                            <input type="text" id="register-country" name="country" value={formData.country} onChange={handleChange} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="register-mobile">Mobile</label>
                            <input type="text" id="register-mobile" name="mobile" value={formData.mobile} onChange={handleChange} />
                        </div>
                    </div>

                    <aside className="privacy-promise" aria-labelledby="privacy-promise-title">
                        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 3l7 3v5c0 4.6-3 8.6-7 10-4-1.4-7-5.4-7-10V6z" /><path d="M9 12l2 2 4-4" />
                        </svg>
                        <div>
                            <h2 id="privacy-promise-title">Our privacy promise</h2>
                            <p>
                                PlanMate is a privacy-first project. Your data is stored only to sync your calendar across
                                your devices and connect you with friends. We never sell it: no trackers, no data brokers.
                                The AI Game plan only shares your upcoming events with Google Gemini when you ask for one.{' '}
                                <Link to="/privacy">Read the privacy policy</Link>
                            </p>
                        </div>
                    </aside>

                    {error && <div className="availability-message msg-error auth-error" role="alert">{error}</div>}

                    <button type="submit" className="btn-modern-primary auth-submit">
                        Create Account
                    </button>
                </form>
                <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
            </GlassPanel>
        </div>
    );
};

export default Register;