import React, { useState, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from './config';

const Register = () => {
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', password: '', email: '', username: '',
        street: '', zipcode: '', country: '', mobile: ''
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
                    street: formData.street, zipcode: formData.zipcode,
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
            const response = await axios.get(`${config.baseUrl}/api/v1/auth/${endpoint}/${value}`);
            setStatus(response.data.available ? 'success' : 'error');
        } catch (error) {
            setStatus('error');
        }
    };

    return (
        <div className="auth-page-wrapper">
            <div className="form-container" style={{ maxWidth: '600px' }}>
                <h1>Create Account</h1>
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>First Name</label>
                            <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Last Name</label>
                            <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Email Address *</label>
                        <div className="input-with-button">
                            <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                            <button type="button" className="btn-modern-secondary" onClick={() => checkAvailability('email', formData.email)}>Check</button>
                        </div>
                        {emailStatus === 'success' && <span className="availability-message msg-success">Email is available!</span>}
                        {emailStatus === 'error' && <span className="availability-message msg-error">Email is already taken.</span>}
                    </div>

                    <div className="form-row">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Username *</label>
                            <div className="input-with-button">
                                <input type="text" name="username" value={formData.username} onChange={handleChange} required />
                                <button type="button" className="btn-modern-secondary" onClick={() => checkAvailability('username', formData.username)}>Check</button>
                            </div>
                            {userStatus === 'success' && <span className="availability-message msg-success">Username is available!</span>}
                            {userStatus === 'error' && <span className="availability-message msg-error">Username is taken.</span>}
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Password *</label>
                            <input type="password" name="password" value={formData.password} onChange={handleChange} required />
                        </div>
                    </div>

                    <hr style={{ margin: '24px 0', borderColor: 'var(--border)' }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>Optional Contact Info</p>

                    <div className="form-row">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Street</label>
                            <input type="text" name="street" value={formData.street} onChange={handleChange} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Zipcode</label>
                            <input type="text" name="zipcode" value={formData.zipcode} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Country</label>
                            <input type="text" name="country" value={formData.country} onChange={handleChange} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Mobile</label>
                            <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} />
                        </div>
                    </div>

                    {error && <div className="availability-message msg-error" style={{ marginBottom: '16px', textAlign: 'center' }}>{error}</div>}

                    <button type="submit" className="btn-modern-primary" style={{ width: '100%', marginTop: '16px' }}>
                        Create Account
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Register;