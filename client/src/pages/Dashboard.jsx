import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useTranslation } from 'react-i18next';
import { getLocale, formatTimeOrDash } from '../utils/locale';

export default function Dashboard() {
  const { t, i18n } = useTranslation();
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
  if (!data) return <div className="page"><p style={{ color: 'var(--color-text-muted)' }}>{t('common.loading')}</p></div>;

  const locale = getLocale(i18n.language);
  const formatTime = (iso) => formatTimeOrDash(iso, locale);

  const clockSuffix = t('dashboard.clock');

  return (
    <div className="page">
      <h1>{t('dashboard.greeting', { name: data.nick_name })}</h1>

      <div className="card">
        <h2>{t('dashboard.mySlot')}</h2>
        {data.slot ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                {formatTime(data.slot.start_time)}{clockSuffix ? ` ${clockSuffix}` : ''}
              </span>
              <span className={`badge badge-${data.slot.status === 'completed' ? 'success' : data.slot.status === 'booked' ? 'primary' : 'muted'}`}>
                {data.slot.status === 'completed' ? t('dashboard.completed') : data.slot.status === 'booked' ? t('dashboard.booked') : data.slot.status}
              </span>
            </div>
            {data.slot.race_time && (
              <p>{t('dashboard.raceTime')} <strong>{data.slot.race_time}</strong></p>
            )}
            {data.slot.status === 'booked' && (
              <div style={{ marginTop: 'var(--spacing-sm)' }}>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleCancel}
                  disabled={cancelling}
                >
                  {cancelling ? t('dashboard.cancelling') : t('dashboard.cancelSlot')}
                </button>
                {cancelError && <p className="error-msg" style={{ marginTop: 'var(--spacing-xs)' }}>{cancelError}</p>}
              </div>
            )}
          </div>
        ) : (
          <div>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-md)' }}>
              {t('dashboard.noSlot')}
            </p>
            <Link to="/slots" className="btn btn-primary">{t('dashboard.bookSlot')}</Link>
          </div>
        )}
      </div>

      {data.rank && (
        <div className="card">
          <h2>{t('dashboard.myRanking')}</h2>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>
            #{data.rank}
            {data.rank <= 8 && <span style={{ color: 'var(--color-gold)', marginLeft: 8 }}>{t('dashboard.top8')}</span>}
          </p>
        </div>
      )}

      {data.bracket?.length > 0 && (
        <div className="card">
          <h2>{t('dashboard.bracket')}</h2>
          {data.bracket.map((b, i) => (
            <div key={i}>
              <strong>{b.round === 'semifinal' ? t('dashboard.semifinal') : t('dashboard.final')}</strong>
              {b.group_number && ` · ${t('dashboard.group')} ${b.group_number}`}
              {b.position && ` · ${t('dashboard.place')} ${b.position}`}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
