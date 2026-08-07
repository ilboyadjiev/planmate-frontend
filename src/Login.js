import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import { GoogleLogin } from '@react-oauth/google';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const { login, googleLogin } = useContext(AuthContext);
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

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
        setError(null);
        await googleLogin(credentialResponse.credential);
        navigate('/dashboard');
    } catch (error) {
        console.error('Google Login Error:', error);
        setError('Google login failed. Please try again.');
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

        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
            <span style={{ padding: '0 10px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>or</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google initialization failed.')}
                useOneTap
                shape="pill"
            />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0' }}>
            <span style={{ padding: '0 10px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Note: Planmate has absolutely no interest in your personal data. We just need your email, first and last name.
            </span>
        </div>

      </div>
    </div>
  );
};

export default Login;