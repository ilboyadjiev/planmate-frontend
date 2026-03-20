import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error:', error);
      setError(error.response?.data?.error || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="auth-page-wrapper">
      
      <div className="form-container">
        <h1>Welcome Back</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input type="password" name="password" id="password" value={formData.password} onChange={handleChange} required />
          </div>
          
          {error && <div className="availability-message msg-error" style={{ marginBottom: '16px' }}>{error}</div>}
          
          <button type="submit" className="btn-modern-primary" style={{ width: '100%', marginTop: '8px' }}>
            Log In
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;