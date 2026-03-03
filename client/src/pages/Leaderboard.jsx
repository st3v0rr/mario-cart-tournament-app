import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
const logoSrc = '/logo.png';
import './Display.css';
import './Leaderboard.css';

export default function Leaderboard() {
  const [rows, setRows] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const data = await api.getAllLeaderboard();
      setRows(data);
      setLastUpdate(new Date());
    } catch {
      // keep previous data
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div className="lb-mobile">
      <div className="display-header">
        <button className="lb-back-btn" onClick={() => navigate(-1)} title="Zurück">←</button>
        <img src={logoSrc} alt="Mario Kart Turnier" className="lb-header-logo" />
        <button className="btn btn-secondary btn-sm" onClick={load}>↻</button>
      </div>

      <div className="lb-mobile-content">
        <h2 className="lb-mobile-title">🏆 Zeitfahren – Rangliste</h2>
        {rows.length === 0 ? (
          <p className="display-empty" style={{ fontSize: '1rem', padding: '24px' }}>Noch keine Ergebnisse</p>
        ) : (
          <div className="display-leaderboard">
            {rows.map((row, i) => (
              <div key={i} className="display-lb-row">
                <span className="display-lb-rank">#{i + 1}</span>
                <span className="display-lb-name">{row.first_name}</span>
                <span className="display-lb-time">{row.race_time}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
