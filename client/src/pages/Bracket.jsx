import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useTranslation } from 'react-i18next';
const logoSrc = '/logo.png';
import './Display.css';
import './Leaderboard.css';

export default function Bracket() {
  const [entries, setEntries] = useState([]);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const load = useCallback(async () => {
    try {
      const data = await api.getBracket();
      setEntries(data);
    } catch {
      // keep previous data
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const semifinal = entries.filter((e) => e.round === 'semifinal');
  const final = entries.filter((e) => e.round === 'final');
  const g1 = semifinal.filter((e) => e.group_number === 1).sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
  const g2 = semifinal.filter((e) => e.group_number === 2).sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
  const finalSorted = [...final].sort((a, b) => (a.position ?? 99) - (b.position ?? 99));

  return (
    <div className="lb-mobile">
      <div className="display-header">
        <button className="lb-back-btn" onClick={() => navigate(-1)} title={t('common.back')}>←</button>
        <img src={logoSrc} alt="Mario Kart Turnier" className="lb-header-logo" />
        <button className="btn btn-secondary btn-sm" onClick={load}>↻</button>
      </div>

      <div className="lb-mobile-content">
        <h2 className="lb-mobile-title">{t('bracket.title')}</h2>
        {entries.length === 0 ? (
          <p className="display-empty" style={{ fontSize: '1rem', padding: '24px' }}>
            {t('bracket.empty')}
          </p>
        ) : (
          <div className="bracket-tree">
            <div className="bracket-semis">
              <BracketColumn title={t('bracket.semifinal1')} entries={g1} />
              <BracketColumn title={t('bracket.semifinal2')} entries={g2} />
            </div>
            <div className="bracket-final-row">
              <div className="bracket-down-arrow">↓</div>
              <BracketColumn title={t('bracket.final')} entries={finalSorted} isFinal />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BracketColumn({ title, entries, isFinal = false }) {
  return (
    <div className={`bracket-col${isFinal ? ' bracket-col--final' : ''}`}>
      <div className="bracket-col-title">{title}</div>
      <div className="bracket-col-entries">
        {entries.length === 0 ? (
          <div className="bracket-empty" style={{ fontSize: '1.1rem', padding: '12px' }}>–</div>
        ) : (
          entries.map((e, i) => {
            const isWinner = isFinal && e.position === 1;
            const advancesToFinal = !isFinal && e.position != null && e.position <= 2;
            return (
              <div
                key={e.id}
                className={`bracket-entry${isWinner ? ' bracket-entry--winner' : ''}${advancesToFinal ? ' bracket-entry--advances' : ''}`}
              >
                {isWinner && <span className="bracket-crown">👑</span>}
                <span className="bracket-entry-pos">{e.position ? `${e.position}.` : ''}</span>
                <span className="bracket-entry-name">{e.nick_name}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
