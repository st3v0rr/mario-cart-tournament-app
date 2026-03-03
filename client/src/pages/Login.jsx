import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
const logoSrc = '/logo.png';
import './Login.css';

export default function Login() {
  const { auth, login } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0);

  useEffect(() => {
    if (rateLimitSeconds <= 0) return;
    const timer = setTimeout(() => setRateLimitSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [rateLimitSeconds]);

  if (auth?.authenticated) {
    navigate(auth.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(firstName, ticketNumber);
      navigate('/dashboard', { replace: true });
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
    <div className="login-page">
      <div className="login-card card">
        <div className="login-logo"><img src={logoSrc} alt="Mario Kart Turnier" /></div>
        <h1>Mario Kart Turnier</h1>
        <p className="login-subtitle">Melde dich mit deinem Namen und Ticket-Code an</p>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="firstName">Vorname</label>
            <input
              id="firstName"
              className="input"
              type="text"
              placeholder="Dein Vorname"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              autoComplete="given-name"
            />
          </div>
          <div className="form-group">
            <label htmlFor="ticketNumber">Ticket-Nummer (5 Ziffern)</label>
            <input
              id="ticketNumber"
              className="input"
              type="text"
              placeholder="12345"
              value={ticketNumber}
              onChange={(e) => setTicketNumber(e.target.value.replace(/\D/g, '').slice(0, 5))}
              maxLength={5}
              pattern="\d{5}"
              required
              inputMode="numeric"
            />
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
        <div className="login-links">
          <Link to="/leaderboard">Rangliste</Link>
          <span>·</span>
          <Link to="/bracket">Finals</Link>
          <span>·</span>
          <Link to="/admin/login">Admin</Link>
        </div>
      </div>
    </div>
  );
}
