import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
const logoSrc = '/logo.png';
import './Display.css';
import './Leaderboard.css';
import './Login.css';

export default function AdminLogin() {
  const { adminLogin } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0);

  useEffect(() => {
    if (rateLimitSeconds <= 0) return;
    const timer = setTimeout(() => setRateLimitSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [rateLimitSeconds]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await adminLogin(username, password);
      navigate('/admin', { replace: true });
    } catch (err) {
      if (err.retryAfter) {
        setRateLimitSeconds(err.retryAfter);
        setError('');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lb-mobile" style={{ minHeight: '100vh' }}>
      <div className="display-header">
        <button className="lb-back-btn" onClick={() => navigate(-1)} title="Zurück">←</button>
        <img src={logoSrc} alt="Mario Kart Turnier" className="lb-header-logo" />
        <div style={{ width: 32 }} />
      </div>
      <div className="login-page" style={{ flex: 1 }}>
      <div className="login-card card">
        <div className="login-logo">⚙️</div>
        <h1>Admin Login</h1>
        <p className="login-subtitle">Nur für Turnier-Organisatoren</p>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Benutzername</label>
            <input className="input" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Passwort</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="error-msg">{error}</p>}
          {rateLimitSeconds > 0 && (
            <div className="rate-limit-notice">
              <span className="rate-limit-timer">{rateLimitSeconds}s</span>
              Zu viele Versuche — bitte warte kurz.
            </div>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || rateLimitSeconds > 0}
            style={{ width: '100%' }}
          >
            {loading ? 'Anmelden...' : rateLimitSeconds > 0 ? `Warte ${rateLimitSeconds}s` : 'Anmelden'}
          </button>
        </form>
      </div>
      </div>
    </div>
  );
}
