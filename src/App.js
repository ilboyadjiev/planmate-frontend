import { React } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Home from './Home';
import Register from './Register';
import Login from './Login';
import Dashboard from './Dashboard';
import EditProfile from './EditProfile';
import FriendsList from './FriendsList';
import 'bootstrap/dist/css/bootstrap.min.css';
import { AuthProvider } from './AuthContext';
import Navbar from './Navbar';
import ProtectedRoute from './ProtectedRoute';
import CookieBanner from './CookieBanner';
import Impressum from './legal/Impressum';
import Privacy from './legal/Privacy';

function App() {
  
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <CookieBanner />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/impressum" element={<Impressum />} />
          <Route path="/privacy" element={<Privacy />} />
          
          <Route 
            path="/dashboard" 
            element={
                <Dashboard />
            } 
          />
          <Route 
            path="/profile/edit" 
            element={
              <ProtectedRoute>
                <EditProfile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile/friends" 
            element={
              <ProtectedRoute>
                <FriendsList />
              </ProtectedRoute>
            } 
          />
        </Routes>
        <footer style={{ textAlign: 'center', padding: '32px 20px', borderTop: '1px solid var(--border)', marginTop: '60px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '8px' }}>
                <Link to="/impressum" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>Impressum</Link>
                <Link to="/privacy" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>Privacy Policy</Link>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', margin: 0 }}>© {new Date().getFullYear()} PlanMate. Built in Munich.</p>
        </footer>
      </Router>
    </AuthProvider>
  );
}

export default App;