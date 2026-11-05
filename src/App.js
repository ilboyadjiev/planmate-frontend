import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EditProfile from './pages/EditProfile';
import FriendsList from './pages/FriendsList';
import FriendGroups from './pages/FriendGroups';
import PersonProfile from './pages/PersonProfile';
import SearchEvents from './pages/SearchEvents';
import Settings from './pages/Settings';
import EventPage from './pages/EventPage';
import 'bootstrap/dist/css/bootstrap.min.css';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import PreferencesLoader from './components/PreferencesLoader';
import ProtectedRoute from './components/ProtectedRoute';
import CookieBanner from './components/CookieBanner';
import Impressum from './pages/legal/Impressum';
import Privacy from './pages/legal/Privacy';
import { GoogleOAuthProvider } from '@react-oauth/google';
import config from './config/config';

function App() {
  
  return (
    <GoogleOAuthProvider clientId={config.googleClientId}>
      <Router>
        <AuthProvider>
          <PreferencesLoader />
          <Navbar />
          <CookieBanner />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/impressum" element={<Impressum />} />
            <Route path="/privacy" element={<Privacy />} />
            
            <Route path="/dashboard" element={<Dashboard view="discover" />} />
            <Route path="/calendar" element={<Dashboard view="calendar" />} />
            <Route path="/search" element={<SearchEvents />} />
            {/* Shared event links: open to everyone; the page itself decides what each viewer may see */}
            <Route path="/events/:id" element={<EventPage />} />
            <Route 
              path="/profile/edit" 
              element={
                <ProtectedRoute>
                  <EditProfile />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/people/:id"
              element={
                <ProtectedRoute>
                  <PersonProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/groups"
              element={
                <ProtectedRoute>
                  <FriendGroups />
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
        </AuthProvider>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;