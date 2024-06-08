import React, { useState, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from './config';
import './Home.css';

const Register = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        password: '',
        email: '',
        username: '',
        street: '',
        zipcode: '',
        country: '',
        mobile: ''
    });

    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();
    const [emailAvailable, setEmailAvailable] = useState(null);
    const [usernameAvailable, setUsernameAvailable] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const { register } = useContext(AuthContext);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const submissionData = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                password: formData.password,
                username: formData.username,
                contactData: {
                    street: formData.street,
                    zipcode: formData.zipcode,
                    country: formData.country,
                    mobile: formData.mobile
                }
            };

            // Call AuthContext register
            await register(submissionData);

            navigate('/dashboard'); // Redirect to dashboard after successful login
        } catch (error) {
            console.error('Error:', error);
            setSuccess(false);
            setError(error.response?.data?.error || 'Registration failed. Please try again.');
        }
    };

    const checkEmailAvailable = async () => {
        try {
            const response = await axios.get(`${config.baseUrl}/api/v1/auth/check-email-exists/${formData.email}`);
            setEmailAvailable(response.data.available ? 'Email is available' : 'Email is already taken');
        } catch (error) {
            if (error.response.status === 409) {
                setEmailAvailable('Email not available');
            } else {
                setEmailAvailable('Error checking availability');
            }
        }
    };

    const checkUsernameAvailable = async () => {
        try {
            const response = await axios.get(`${config.baseUrl}/api/v1/auth/check-username-exists/${formData.username}`);
            setUsernameAvailable(response.data.available ? 'Username is available' : 'Username is already taken');
        } catch (error) {
            if (error.response.status === 409) {
                setUsernameAvailable('Username not available');
            } else {
                setUsernameAvailable('Error checking availability');
            }
        }
    };

    return (
        <div className="form-container">
            <br></br>
            <h1>Register</h1>
            <form onSubmit={handleSubmit} className="register-form">
                <div className="form-group row">
                    <div className="column">
                        <label htmlFor="firstName">First Name:</label>
                        <input
                            type="text"
                            name="firstName"
                            id="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
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
                        />
                    </div>
                </div>
                <br></br>
                <div className="form-group row">
                    <div className="email-field">
                        <label htmlFor="email" style={{ fontWeight: 'bold' }}>*Email:</label>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <input
                                type="email"
                                name="email"
                                id="email"
                                value={formData.email}
                                onChange={handleChange}
                            />
                            <button type="button" className="check-emailAvailable" onClick={checkEmailAvailable} style={{ marginLeft: '10px' }}>
                                Check Availability
                            </button>
                        </div>
                    </div>
                    {emailAvailable && <p className="availability-message">{emailAvailable}</p>}
                </div>
                <div className="form-group">
                    <label htmlFor="password" style={{ fontWeight: 'bold' }}>*Password:</label>
                    <input
                        type="password"
                        name="password"
                        id="password"
                        value={formData.password}
                        onChange={handleChange}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="street">Custom username:</label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                            type="text"
                            name="username"
                            id="username"
                            value={formData.username}
                            onChange={handleChange}
                        />
                        <button type="button" className="check-usernameAvailable" onClick={checkUsernameAvailable} style={{ marginLeft: '10px' }}>
                            Check Availability
                        </button>
                    </div>
                    {usernameAvailable && <p className="availability-message">{usernameAvailable}</p>}
                </div>
                <br></br>
                <br></br>
                <p>Address and contact data (optional):</p>
                <div className="form-group">
                    <label htmlFor="street">Street:</label>
                    <input
                        type="text"
                        name="street"
                        id="street"
                        value={formData.street}
                        onChange={handleChange}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="zipcode">Zipcode:</label>
                    <input
                        type="text"
                        name="zipcode"
                        id="zipcode"
                        value={formData.zipcode}
                        onChange={handleChange}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="country">Country:</label>
                    <input
                        type="text"
                        name="country"
                        id="country"
                        value={formData.country}
                        onChange={handleChange}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="mobile">Mobile:</label>
                    <input
                        type="text"
                        name="mobile"
                        id="mobile"
                        value={formData.mobile}
                        onChange={handleChange}
                    />
                </div>
                <br></br>
                <button type="submit" className="submit-button">Register</button>
                <br></br>
                <br></br>
                <br></br>
            </form>
            {error && <p className="error-message">{error}</p>}
            {success && <p className="success-message">Registration successful!</p>}
        </div>
    );
};

export default Register;
