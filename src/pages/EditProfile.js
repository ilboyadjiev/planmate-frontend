import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { AuthContext } from '../context/AuthContext';
import GlassPanel from '../components/GlassPanel';
import './FriendGroups.css'; // .group-button and the settings top line

/** Your name and contact details. Account things (Google Calendar, deleting the account) are in Settings. */
const EditProfile = () => {
    const { user, updateCurrentUser } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [saving, setSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        mobile: '',
        street: '',
        zipcode: '',
        city: '',
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
                city: user.contactData?.city || '',
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
        setSaving(true);

        try {
            const payload = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                contactData: {
                    mobile: formData.mobile,
                    street: formData.street,
                    zipcode: formData.zipcode,
                    city: formData.city,
                    country: formData.country
                }
            };

            const response = await api.put(`/v1/users/${user.id}`, payload);
            // Keep the navbar, calendar etc. in sync with what the server saved
            updateCurrentUser(response.data);
            setSuccess(true);
            
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: '50px', color: 'var(--text-muted)' }}>Loading profile data...</div>;
    if (!user) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Not logged in</div>; 

    return (
        <div className="groups-page">
            <GlassPanel tall className="social-panel">
                
                {/* Reached from the pencil on your profile. Save sits up here, outside the form (form="profile-form"),
                    so it is in reach without scrolling, as in social apps. */}
                <div className="settings-topline">
                    <Link to={`/people/${user.id}`} className="settings-back">← Your profile</Link>
                    <button type="submit" form="profile-form" className="group-button group-button-primary" disabled={saving}>
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
                <h2 style={{ marginBottom: '8px', fontWeight: '700' }}>Edit profile</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.95rem' }}>
                    Manage your personal information and contact details.
                </p>

                {/* Right under the Save button, so the result is visible without scrolling */}
                <div aria-live="polite">
                    {error && <div className="availability-message msg-error" role="alert" style={{ marginBottom: '16px', fontSize: '0.9rem' }}>{error}</div>}
                    {success && <div className="availability-message msg-success" style={{ marginBottom: '16px', fontSize: '0.9rem', fontWeight: '600' }}>Profile updated successfully!</div>}
                </div>

                <form id="profile-form" onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
                    
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
                            <label htmlFor="city">City</label>
                            <input type="text" name="city" id="city" value={formData.city} onChange={handleChange}
                                aria-describedby="city-hint" />
                            <span id="city-hint" className="availability-message" style={{ color: 'var(--text-muted)' }}>
                                Shows public events in your city under "Around me" in Discover.
                            </span>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="country">Country</label>
                            <input type="text" name="country" id="country" value={formData.country} onChange={handleChange} />
                        </div>
                    </div>

                </form>

            </GlassPanel>
        </div>
    );
};

export default EditProfile;