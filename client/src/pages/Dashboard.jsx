import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { auth } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const reload = () => api.getMe().then(setData).catch((err) => setError(err.message));

  useEffect(() => {
    reload();
  }, []);

  const handleCancel = async () => {
    setCancelError('');
    setCancelling(true);
    try {
      await api.cancelSlot(data.slot.id);
      await reload();
    } catch (err) {
      setCancelError(err.message);
    } finally {
      setCancelling(false);
    }
  };

  if (error) return <div className="page"><p className="error-msg">{error}</p></div>;
  if (!data) return <div className="page"><p style={{ color: 'var(--color-text-muted)' }}>Laden...</p></div>;

  const formatTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="page">
      <h1>Hallo, {data.nick_name}! 👋</h1>

      <div className="card">
        <h2>Mein Time Trial Slot</h2>
        {data.slot ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                {formatTime(data.slot.start_time)} Uhr
              </span>
              <span className={`badge badge-${data.slot.status === 'completed' ? 'success' : data.slot.status === 'booked' ? 'primary' : 'muted'}`}>
                {data.slot.status === 'completed' ? 'Abgeschlossen' : data.slot.status === 'booked' ? 'Gebucht' : data.slot.status}
              </span>
            </div>
            {data.slot.race_time && (
              <p>Zeit: <strong>{data.slot.race_time}</strong></p>
            )}
            {data.slot.status === 'booked' && (
              <div style={{ marginTop: 'var(--spacing-sm)' }}>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleCancel}
                  disabled={cancelling}
                >
                  {cancelling ? 'Wird storniert…' : 'Slot stornieren'}
                </button>
                {cancelError && <p className="error-msg" style={{ marginTop: 'var(--spacing-xs)' }}>{cancelError}</p>}
              </div>
            )}
          </div>
        ) : (
          <div>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-md)' }}>
              Du hast noch keinen Slot gebucht.
            </p>
            <Link to="/slots" className="btn btn-primary">Slot buchen</Link>
          </div>
        )}
      </div>

      {data.rank && (
        <div className="card">
          <h2>Meine Platzierung</h2>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>
            #{data.rank}
            {data.rank <= 8 && <span style={{ color: 'var(--color-gold)', marginLeft: 8 }}>🏆 Top 8!</span>}
          </p>
        </div>
      )}

      {data.bracket?.length > 0 && (
        <div className="card">
          <h2>Bracket</h2>
          {data.bracket.map((b, i) => (
            <div key={i}>
              <strong>{b.round === 'semifinal' ? 'Semifinale' : 'Finale'}</strong>
              {b.group_number && ` · Gruppe ${b.group_number}`}
              {b.position && ` · Platz ${b.position}`}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
