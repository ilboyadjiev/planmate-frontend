import React from 'react';
import { useNavigate } from 'react-router-dom';
import planmateIcon from './planmate-icon.png';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();

  const apkDownloadUrl = "https://github.com/ilboyadjiev/planmate-mobile/releases/download/latest/planmate.apk";

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

        <div className="download-section">
          <p className="download-text">Want to take Planmate on the go?</p>
          <a href={apkDownloadUrl} className="btn-modern-download" download>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style={{ marginRight: '8px' }}>
              <path d="M17.523 15.3414C17.523 15.3414 17.523 15.3414 17.523 15.3414C17.523 16.0967 16.8967 16.723 16.1414 16.723H7.85862C7.10331 16.723 6.47701 16.0967 6.47701 15.3414V9.8184H17.523V15.3414ZM17.523 8.43679H6.47701C6.47701 6.55633 7.64368 4.93909 9.29425 4.18047L8.62759 3.02415C8.52874 2.85381 8.58391 2.63288 8.75425 2.53403C8.9246 2.43518 9.14552 2.49035 9.24437 2.66069L9.93288 3.85495C10.5605 3.63656 11.2501 3.51495 12 3.51495C12.7499 3.51495 13.4395 3.63656 14.0671 3.85495L14.7556 2.66069C14.8545 2.49035 15.0754 2.43518 15.2457 2.53403C15.4161 2.63288 15.4713 2.85381 15.3724 3.02415L14.7057 4.18047C16.3563 4.93909 17.523 6.55633 17.523 8.43679ZM9.93103 6.36552C9.55057 6.36552 9.24138 6.67471 9.24138 7.05517C9.24138 7.43563 9.55057 7.74483 9.93103 7.74483C10.3115 7.74483 10.6207 7.43563 10.6207 7.05517C10.6207 6.67471 10.3115 6.36552 9.93103 6.36552ZM14.069 6.36552C13.6885 6.36552 13.3793 6.67471 13.3793 7.05517C13.3793 7.43563 13.6885 7.74483 14.069 7.74483C14.4494 7.74483 14.7586 7.43563 14.7586 7.05517C14.7586 6.67471 14.4494 6.36552 14.069 6.36552Z" />
            </svg>
            Download Android APK from Github
          </a>
        </div>

      </div>
    </div>
  );
};

export default Home;