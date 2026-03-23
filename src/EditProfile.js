import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import config from './config';
import { AuthContext } from './AuthContext';

const EditProfile = () => {
    const { user, logout } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        mobile: '',
        street: '',
        zipcode: '',
        country: ''
    });

    useEffect(() => {
        if (user) {
            setFormData({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
                mobile: user.contactData?.mobile || '',
                street: user.contactData?.street || '',
                zipcode: user.contactData?.zipcode || '',
                country: user.contactData?.country || ''
            });
            setLoading(false);
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
        setSuccess(false); 
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        
        try {
            const payload = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                contactData: {
                    mobile: formData.mobile,
                    street: formData.street,
                    zipcode: formData.zipcode,
                    country: formData.country
                }
            };

            await axios.put(`${config.baseUrl}/api/v1/users/${user.id}`, payload); 
            setSuccess(true);
            
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update profile. Please try again.');
        }
    };

    const handleDeleteAccount = async () => {
        try {
            await axios.delete(`${config.baseUrl}/api/v1/users/${user.id}`);
            logout();
        } catch (err) {
            setError('Failed to delete account. Please try again or contact support.');
            setShowDeleteConfirm(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: '50px', color: 'var(--text-muted)' }}>Loading profile data...</div>;
    if (!user) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Not logged in</div>; 

    return (
        <div style={{ padding: '40px 20px', display: 'flex', justifyContent: 'center' }}>
            <div className="form-container" style={{ maxWidth: '800px', width: '100%', margin: 0 }}>
                
                <h2 style={{ marginBottom: '8px', fontWeight: '700' }}>Account Settings</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '0.95rem' }}>
                    Manage your personal information and contact details.
                </p>

                <form onSubmit={handleSubmit}>
                    
                    <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--primary)' }}>Personal Info</h4>
                    
                    <div className="form-row">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="firstName">First Name</label>
                            <input type="text" name="firstName" id="firstName" value={formData.firstName} onChange={handleChange} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="lastName">Last Name</label>
                            <input type="text" name="lastName" id="lastName" value={formData.lastName} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Email Address (Read Only)</label>
                        <input 
                            type="email" 
                            name="email" 
                            id="email" 
                            value={formData.email} 
                            disabled 
                            style={{ backgroundColor: 'rgba(0,0,0,0.05)', cursor: 'not-allowed', color: 'var(--text-muted)' }}
                        />
                    </div>

                    <hr style={{ margin: '32px 0', borderColor: 'var(--border)' }} />

                    <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--primary)' }}>Address & Contact</h4>

                    <div className="form-row">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="mobile">Mobile Number</label>
                            <input type="text" name="mobile" id="mobile" value={formData.mobile} onChange={handleChange} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="street">Street Address</label>
                            <input type="text" name="street" id="street" value={formData.street} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="zipcode">Zipcode</label>
                            <input type="text" name="zipcode" id="zipcode" value={formData.zipcode} onChange={handleChange} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="country">Country</label>
                            <input type="text" name="country" id="country" value={formData.country} onChange={handleChange} />
                        </div>
                    </div>

                    {error && <div className="availability-message msg-error" style={{ marginBottom: '16px', fontSize: '0.9rem' }}>{error}</div>}
                    {success && <div className="availability-message msg-success" style={{ marginBottom: '16px', fontSize: '0.9rem', fontWeight: '600' }}>Profile updated successfully!</div>}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                        <button type="submit" className="btn-modern-primary" style={{ padding: '12px 32px' }}>
                            Save Changes
                        </button>
                    </div>

                </form>

                <hr style={{ margin: '48px 0 32px 0', borderColor: 'var(--border)' }} />
                
                <div style={{ border: '1px solid rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', padding: '24px' }}>
                    <h4 style={{ fontSize: '1.1rem', color: '#EF4444', marginBottom: '8px' }}>Danger Zone</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
                        Permanently delete your account and all associated calendar data. This action cannot be undone.
                    </p>
                    
                    {!showDeleteConfirm ? (
                        <button onClick={() => setShowDeleteConfirm(true)} style={{ backgroundColor: 'transparent', border: '1px solid #EF4444', color: '#EF4444', padding: '8px 16px', borderRadius: '8px', fontWeight: '600', transition: '0.2s' }}>
                            Delete Account
                        </button>
                    ) : (
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <span style={{ color: '#EF4444', fontWeight: '600', fontSize: '0.9rem' }}>Are you absolutely sure?</span>
                            <button onClick={handleDeleteAccount} style={{ backgroundColor: '#EF4444', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '8px', fontWeight: '600' }}>
                                Yes, Delete My Data
                            </button>
                            <button onClick={() => setShowDeleteConfirm(false)} className="btn-modern-secondary" style={{ padding: '8px 16px' }}>
                                Cancel
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default EditProfile;