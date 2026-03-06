import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { getLocale, formatTime } from '../utils/locale';
import './Slots.css';

export default function Slots() {
  const { auth } = useAuth();
  const { t, i18n } = useTranslation();
  const [slots, setSlots] = useState([]);
  const [mySlot, setMySlot] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [cancelConfirming, setCancelConfirming] = useState(false);

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

  useEffect(() => {
    load();
  }, [load]);

  const locale = getLocale(i18n.language);

  const canBook = (slot) => {
    if (mySlot) return false;
    if (slot.status !== 'available') return false;
    const slotTime = new Date(slot.start_time);
    return slotTime > new Date(Date.now() + 10 * 60 * 1000);
  };

  const book = async (id) => {
    setActionId(id);
    setError('');
    setMsg('');
    try {
      await api.bookSlot(id);
      setMsg(t('slots.bookSuccess'));
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionId(null);
    }
  };

  if (loading)
    return (
      <div className="page">
        <p style={{ color: 'var(--color-text-muted)' }}>{t('common.loading')}</p>
      </div>
    );

  const statusLabel = (s) => {
    if (s === 'available') return { label: t('slots.available'), cls: 'badge-success' };
    if (s === 'booked') return { label: t('slots.booked'), cls: 'badge-primary' };
    return { label: t('slots.completed'), cls: 'badge-muted' };
  };

  const clockSuffix = t('slots.clock');

  return (
    <div className="page">
      <h1>{t('slots.title')}</h1>
      {mySlot && (
        <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
          <strong>{t('slots.mySlot')}</strong> {formatTime(mySlot.start_time, locale)}
          {clockSuffix ? ` ${clockSuffix}` : ''}
          <span className="badge badge-primary" style={{ marginLeft: 8 }}>
            {t('slots.booked')}
          </span>
          {mySlot.status === 'booked' && (
            <div style={{ marginTop: 'var(--spacing-sm)' }}>
              {cancelConfirming ? (
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    {t('slots.cancelConfirm')}
                  </span>
                  <button
                    className="btn btn-danger btn-sm"
                    disabled={actionId === mySlot.id}
                    onClick={async () => {
                      setActionId(mySlot.id);
                      setError('');
                      setMsg('');
                      try {
                        await api.cancelSlot(mySlot.id);
                        setMsg(t('slots.cancelSuccess'));
                        setCancelConfirming(false);
                        await load();
                      } catch (err) {
                        setError(err.message);
                      } finally {
                        setActionId(null);
                      }
                    }}
                  >
                    {t('slots.cancel')}
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setCancelConfirming(false)}
                  >
                    {t('common.back')}
                  </button>
                </div>
              ) : (
                <button className="btn btn-danger btn-sm" onClick={() => setCancelConfirming(true)}>
                  {t('slots.cancel')}
                </button>
              )}
            </div>
          )}
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
              <div className="slot-time">{formatTime(slot.start_time, locale)}</div>
              <span className={`badge ${cls}`}>{label}</span>
              {slot.participant_name && (
                <div className="slot-player">{isMine ? t('slots.me') : slot.participant_name}</div>
              )}
              {slot.race_time && <div className="slot-race-time">{slot.race_time}</div>}
              {auth?.role === 'participant' && canBook(slot) && (
                <div className="slot-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => book(slot.id)}
                    disabled={actionId === slot.id}
                  >
                    {t('slots.book')}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
