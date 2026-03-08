import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { renderMarkdown } from '../utils/markdown';
import LangSwitcher from '../components/LangSwitcher';
import './Display.css';
import './Leaderboard.css';
import './Rules.css';

const logoSrc = '/logo.png';

export default function Rules() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getRules(i18n.language);
      setContent(data.content ?? '');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [i18n.language]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="lb-mobile">
      <div className="display-header">
        <button className="lb-back-btn" onClick={() => navigate(-1)} title={t('common.back')}>
          ←
        </button>
        <img src={logoSrc} alt="Mario Kart Turnier" className="lb-header-logo" />
        <LangSwitcher />
      </div>

      <div className="lb-mobile-content">
        <h2 className="lb-mobile-title">{t('rules.title')}</h2>
        {loading && <p className="rules-loading">{t('common.loading')}</p>}
        {error && <p className="error-msg">{error}</p>}
        {!loading && !error && content === '' && (
          <p className="rules-empty">{t('rules.empty')}</p>
        )}
        {!loading && !error && content !== '' && (
          <div
            className="markdown-body"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        )}
      </div>
    </div>
  );
}
