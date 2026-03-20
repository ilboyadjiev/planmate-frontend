import React from 'react';
import { useNavigate } from 'react-router-dom';
import planmateIcon from './planmate-icon.png';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="hero-container">
      <div className="hero-content">
        <img 
          src={planmateIcon} 
          alt="PlanMate Icon" 
          className="hero-logo" 
        />
        <h1 className="hero-title">Sync your life. <br/><span className="highlight">Together.</span></h1>
        <p className="hero-subtitle">
          Planmate is the cross-platform social calendar that connects your schedule with your friends, seamlessly.
        </p>
        
        <div className="hero-buttons">
          <button className="btn-modern-primary" onClick={() => navigate('/register')}>
            Get Started
          </button>
          <button className="btn-modern-secondary" onClick={() => navigate('/login')}>
            Log In
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;