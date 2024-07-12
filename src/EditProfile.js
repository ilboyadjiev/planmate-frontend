import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import config from './config';
import { AuthContext } from './AuthContext';

const EditProfile = () => {
    const { user } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({});

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
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`${config.baseUrl}/api/v1/users/${user.id}`, formData); // Adjust the URL as needed
            alert('Profile updated successfully!');
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!user) {
        return <div>Not logged in</div>; 
    }

    return (
        <div className="form-container">
        <br></br>
        <h1>Edit {user.username}'s profile</h1>
        <form onSubmit={handleSubmit} className="edit-profile-form">
                <div className="form-group row">
                    <div className="column">
                        <label htmlFor="firstName">First Name:</label>
                        <input
                            type="text"
                            name="firstName"
                            id="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            className="form-control"
                        />
                    </div>
                    <div className="column">
                        <label htmlFor="lastName">Last Name:</label>
                        <input
                            type="text"
                            name="lastName"
                            id="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            className="form-control"
                        />
                    </div>
                </div>
                <br />
                <div className="form-group row">
                    <div className="email-field">
                        <label htmlFor="email" style={{ fontWeight: 'bold' }}>*Email:</label>
                        <input
                            type="email"
                            name="email"
                            id="email"
                            value={formData.email}
                            onChange={handleChange}
                            disabled
                            className="form-control"
                        />
                    </div>
                </div>
                <div className="form-group row">
                    <div className="column">
                        <label htmlFor="mobile">Mobile:</label>
                        <input
                            type="text"
                            name="mobile"
                            id="mobile"
                            value={formData.mobile}
                            onChange={handleChange}
                            className="form-control"
                        />
                    </div>
                    <div className="column">
                        <label htmlFor="street">Street:</label>
                        <input
                            type="text"
                            name="street"
                            id="street"
                            value={formData.street}
                            onChange={handleChange}
                            className="form-control"
                        />
                    </div>
                </div>
                <div className="form-group row">
                    <div className="column">
                        <label htmlFor="zipcode">Zipcode:</label>
                        <input
                            type="text"
                            name="zipcode"
                            id="zipcode"
                            value={formData.zipcode}
                            onChange={handleChange}
                            className="form-control"
                        />
                    </div>
                    <div className="column">
                        <label htmlFor="country">Country:</label>
                        <input
                            type="text"
                            name="country"
                            id="country"
                            value={formData.country}
                            onChange={handleChange}
                            className="form-control"
                        />
                    </div>
                </div>
                <button type="submit" className="btn btn-primary">Save Changes</button>
            </form>
        </div>
    );
};

export default EditProfile;
