import React, { useState } from 'react';
import axios from 'axios';
import bcrypt from 'bcryptjs';
import config from './config';

const Register = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        password: '',
        email: '',
        street: '',
        zipcode: '',
        country: '',
        mobile: ''
    });

    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Hash the password
            const hashedPassword = await bcrypt.hash(formData.password, 10);
            // Prepare the data for the POST request
            const submissionData = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                password: hashedPassword,
                contactData: {
                    street: formData.street
                }
            };

            const response = await axios.post(`${config.baseUrl}/api/v1/users/register`, submissionData, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            console.log('Success:', response.data);
            setSuccess(true);
            setError(null);
            // Store the token or session information if available
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
            }
        } catch (error) {
            console.error('Error:', error);
            setSuccess(false);
            // Set the error message from the backend
            setError(error.response?.data?.error || 'Registration failed. Please try again.');
        }
    };

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>First Name:</label>
                    <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} />
                </div>
                <div>
                    <label>Last Name:</label>
                    <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} />
                </div>
                <div>
                    <label>Email:</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} />
                </div>
                <div>
                    <label>Password:</label>
                    <input type="password" name="password" value={formData.password} onChange={handleChange} />
                </div>
                <div>
                    <label>Street:</label>
                    <input type="text" name="street" value={formData.street} onChange={handleChange} />
                </div>
                <div>
                    <label>Zipcode:</label>
                    <input type="text" name="zipcode" value={formData.zipcode} onChange={handleChange} />
                </div>
                <div>
                    <label>Country:</label>
                    <input type="text" name="country" value={formData.country} onChange={handleChange} />
                </div>
                <div>
                    <label>Mobile:</label>
                    <input type="numeric" name="mobile" value={formData.mobile} onChange={handleChange} />
                </div>
                <button type="submit">Register</button>
            </form>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {success && <p style={{ color: 'green' }}>Registration successful!</p>}
        </div>
    );
};

export default Register;
