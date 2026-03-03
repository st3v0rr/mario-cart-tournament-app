import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import './Slots.css';

export default function Slots() {
  const { auth } = useAuth();
  const [slots, setSlots] = useState([]);
  const [mySlot, setMySlot] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [slotsData, meData] = await Promise.all([
        api.getSlots(),
        auth?.role === 'participant' ? api.getMe() : Promise.resolve(null),
      ]);
      setSlots(slotsData);
      setMySlot(meData?.slot || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => { load(); }, [load]);

  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  const canBook = (slot) => {
    if (mySlot) return false;
    if (slot.status !== 'available') return false;
    const slotTime = new Date(slot.start_time);
    return slotTime > new Date(Date.now() + 10 * 60 * 1000);
  };

  const canCancel = (slot) => {
    if (!mySlot || mySlot.id !== slot.id) return false;
    if (slot.status !== 'booked') return false;
    const slotTime = new Date(slot.start_time);
    return slotTime > new Date(Date.now() + 10 * 60 * 1000);
  };

  const book = async (id) => {
    setActionId(id); setError(''); setMsg('');
    try {
      await api.bookSlot(id);
      setMsg('Slot erfolgreich gebucht!');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionId(null);
    }
  };

  const cancel = async (id) => {
    if (!confirm('Buchung wirklich stornieren?')) return;
    setActionId(id); setError(''); setMsg('');
    try {
      await api.cancelSlot(id);
      setMsg('Buchung storniert.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionId(null);
    }
  };

  if (loading) return <div className="page"><p style={{ color: 'var(--color-text-muted)' }}>Laden...</p></div>;

  const statusLabel = (s) => {
    if (s === 'available') return { label: 'Frei', cls: 'badge-success' };
    if (s === 'booked') return { label: 'Belegt', cls: 'badge-primary' };
    return { label: 'Abgeschlossen', cls: 'badge-muted' };
  };

  return (
    <div className="page">
      <h1>Time Trial Slots</h1>
      {mySlot && (
        <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
          <strong>Dein Slot:</strong> {formatTime(mySlot.start_time)} Uhr
          <span className="badge badge-primary" style={{ marginLeft: 8 }}>Gebucht</span>
        </div>
      )}
      {error && <p className="error-msg">{error}</p>}
      {msg && <p className="success-msg">{msg}</p>}
      <div className="slots-grid">
        {slots.map((slot) => {
          const { label, cls } = statusLabel(slot.status);
          const isMine = mySlot?.id === slot.id;
          return (
            <div key={slot.id} className={`slot-card ${isMine ? 'slot-mine' : ''}`}>
              <div className="slot-time">{formatTime(slot.start_time)}</div>
              <span className={`badge ${cls}`}>{label}</span>
              {slot.participant_name && (
                <div className="slot-player">{isMine ? 'Du' : slot.participant_name}</div>
              )}
              {slot.race_time && (
                <div className="slot-race-time">{slot.race_time}</div>
              )}
              {auth?.role === 'participant' && (
                <div className="slot-actions">
                  {canBook(slot) && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => book(slot.id)}
                      disabled={actionId === slot.id}
                    >
                      Buchen
                    </button>
                  )}
                  {canCancel(slot) && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => cancel(slot.id)}
                      disabled={actionId === slot.id}
                    >
                      Stornieren
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
