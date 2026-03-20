import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import config from './config';
import { AuthContext } from './AuthContext';

const EditProfile = () => {
    const { user } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    
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
            </div>
        </div>
    );
};

export default EditProfile;