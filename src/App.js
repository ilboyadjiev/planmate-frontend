import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Home from './Home';  // Import the Home component
import Register from './Register';
import Login from './Login';
import Dashboard from './Dashboard';

function App() {
  const [isAuth, setIsAuth] = useState(false);

  //<Route path="/dashboard" element={isAuth ? <Dashboard /> : <Navigate to="/login" />} />
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login setAuth={setIsAuth} />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
