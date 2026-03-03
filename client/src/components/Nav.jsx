import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
const logoSrc = '/logo.png';
import './Nav.css';

export default function Nav() {
  const { auth, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <nav className="nav">
      <div className="nav-brand">
        <Link to="/"><img src={logoSrc} alt="Mario Kart Turnier" className="nav-logo" /></Link>
      </div>
      <div className="nav-right">
        <div className="nav-links">
          {auth?.role === 'participant' && (
            <>
              <Link to="/dashboard" className={isActive('/dashboard')}>Mein Profil</Link>
              <Link to="/slots" className={isActive('/slots')}>Slots</Link>
            </>
          )}
          {auth?.role === 'admin' && (
            <>
              <Link to="/leaderboard" className={isActive('/leaderboard')}>Rangliste</Link>
              <Link to="/bracket" className={isActive('/bracket')}>Bracket</Link>
              <Link to="/display" className={isActive('/display')}>TV-Anzeige</Link>
              <Link to="/admin" className={isActive('/admin')}>Admin</Link>
            </>
          )}
        </div>
        <button className="nav-logout btn btn-secondary btn-sm" onClick={logout}>
          Abmelden
        </button>
      </div>
    </nav>
  );
}
