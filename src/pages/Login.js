import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import GlassPanel from '../components/GlassPanel';

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
      <GlassPanel shellClassName="auth-glass" className="auth-panel" aria-labelledby="login-title">
        <h1 id="login-title">Welcome back</h1>
        <p className="auth-subtitle">Log in to see what your friends are planning.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input type="password" name="password" id="password" value={formData.password} onChange={handleChange} required />
          </div>
          
          {error && <div className="availability-message msg-error auth-error" role="alert">{error}</div>}

          <button type="submit" className="btn-modern-primary auth-submit">
            Log In
          </button>
        </form>

        <div className="auth-divider"><span>or</span></div>

        <div className="auth-google">
            <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google initialization failed.')}
                useOneTap
                shape="pill"
            />
        </div>

        <p className="auth-note">
          Note: Planmate has absolutely no interest in your personal data. We just need your email, first and last name.
        </p>

        <p className="auth-switch">New to PlanMate? <Link to="/register">Create an account</Link></p>
      </GlassPanel>
    </div>
  );
};

export default Login;