import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import planmateIcon from './planmate-icon.png';

const Home = () => {
  const navigate = useNavigate();

  const navigateTo = (path) => {
    navigate(path);
  };

  return (
    <div className="home-container">
      
      <img src={planmateIcon} alt="PlanMate Icon" className="planmate-icon" 
      style={{ width: '150px', height: 'auto', margin: '20px 0' }} /> 

      <h1>Welcome to PlanMate</h1>
      <div className="button-group">
        <button onClick={() => navigateTo('/register')}>Register</button>
        <button onClick={() => navigateTo('/login')}>Login</button>
        <button onClick={() => navigateTo('/dashboard')}>Dashboard</button>
      </div>
    </div>
  );
};

export default Home;
