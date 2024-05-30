import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css'; // Assuming you have a CSS file for styling

const Home = () => {
  const navigate = useNavigate();

  const navigateTo = (path) => {
    navigate(path);
  };

  return (
    <div className="home-container">
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
