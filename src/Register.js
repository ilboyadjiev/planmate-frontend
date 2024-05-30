import React, { useState, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { useNavigate } from 'react-router-dom';

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
    const navigate = useNavigate();

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
