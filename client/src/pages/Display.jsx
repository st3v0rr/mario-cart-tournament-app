import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useTranslation } from 'react-i18next';
import { getLocale } from '../utils/locale';
import LangSwitcher from '../components/LangSwitcher';
const logoSrc = '/logo.png';
import './Display.css';

const VIEWS = ['leaderboard', 'bracket'];
const INTERVAL = 30000;
const CYCLE_INTERVAL = 15000;

export default function Display() {
  const [viewIndex, setViewIndex] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [bracket, setBracket] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const { i18n } = useTranslation();

  const loadData = useCallback(async () => {
    const [lbResult, brResult] = await Promise.allSettled([api.getLeaderboard(), api.getBracket()]);
    if (lbResult.status === 'fulfilled') setLeaderboard(lbResult.value);
    if (brResult.status === 'fulfilled') setBracket(brResult.value);
    setLastUpdate(new Date());
  }, []);

  useEffect(() => {
    loadData();
    const dataInterval = setInterval(loadData, INTERVAL);
    return () => clearInterval(dataInterval);
  }, [loadData]);

  useEffect(() => {
    const cycleInterval = setInterval(() => {
      setViewIndex((prev) => (prev + 1) % VIEWS.length);
    }, CYCLE_INTERVAL);
    return () => clearInterval(cycleInterval);
  }, []);

  const navigate = useNavigate();
  const view = VIEWS[viewIndex];
  const locale = getLocale(i18n.language);

  return (
    <div className="display">
      <div className="display-header">
        <button className="display-home-btn" onClick={() => navigate(-1)} title="Back">
          ←
        </button>
        <img src={logoSrc} alt="Mario Kart Turnier" className="display-header-logo" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          {lastUpdate && (
            <span className="display-update">
              {lastUpdate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <LangSwitcher />
        </div>
      </div>
      <div className="display-dots">
        {VIEWS.map((v, i) => (
          <button
            key={v}
            className={`display-dot ${i === viewIndex ? 'active' : ''}`}
            onClick={() => setViewIndex(i)}
          />
        ))}
      </div>

      <div className="display-content">
        <div className="display-main">
          {view === 'leaderboard' && <DisplayLeaderboard rows={leaderboard} />}
          {view === 'bracket' && <DisplayBracket entries={bracket} />}
        </div>
        <div className="display-sidebar">
          <DisplaySchedule />
        </div>
      </div>
    </div>
  );
}

function DisplayLeaderboard({ rows }) {
  const { t } = useTranslation();
  return (
    <div className="display-section">
      <h2 className="display-section-title">{t('display.leaderboardTitle')}</h2>
      {rows.length === 0 ? (
        <p className="display-empty">{t('display.empty')}</p>
      ) : (
        <div className="display-leaderboard">
          {rows.map((row, i) => (
            <>
              {i === 8 && (
                <div key="divider" className="display-lb-divider">
                  <span>{t('display.reserve')}</span>
                </div>
              )}
              <div key={i} className={`display-lb-row${i >= 8 ? ' display-lb-row--reserve' : ''}`}>
                <span className="display-lb-rank">#{i + 1}</span>
                <span className="display-lb-name">{row.nick_name}</span>
                <span className="display-lb-time">{row.race_time}</span>
              </div>
            </>
          ))}
        </div>
      )}
    </div>
  );
}

function DisplayBracket({ entries }) {
  const { t } = useTranslation();
  const semifinal = entries.filter((e) => e.round === 'semifinal');
  const final = entries.filter((e) => e.round === 'final');
  const g1 = semifinal
    .filter((e) => e.group_number === 1)
    .sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
  const g2 = semifinal
    .filter((e) => e.group_number === 2)
    .sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
  const finalSorted = [...final].sort((a, b) => (a.position ?? 99) - (b.position ?? 99));

  if (entries.length === 0) {
    return (
      <div className="display-section">
        <h2 className="display-section-title">{t('display.finalsTitle')}</h2>
        <p className="display-empty">{t('display.bracketEmpty')}</p>
      </div>
    );
  }

  return (
    <div className="display-section display-section--wide">
      <h2 className="display-section-title">{t('display.finalsTitle')}</h2>
      <div className="bracket-tree">
        <div className="bracket-semis">
          <BracketColumn title={t('display.semifinal1')} entries={g1} />
          <BracketColumn title={t('display.semifinal2')} entries={g2} />
        </div>
        <div className="bracket-final-row">
          <div className="bracket-down-arrow">↓</div>
          <BracketColumn title={t('display.finalTitle')} entries={finalSorted} isFinal />
        </div>
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
          <div className="bracket-empty">–</div>
        ) : (
          entries.map((e, _i) => {
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

function DisplaySchedule() {
  const { t } = useTranslation();
  const [schedule, setSchedule] = useState([]);

  useEffect(() => {
    api
      .getSchedule()
      .then(setSchedule)
      .catch(() => {});
    const iv = setInterval(
      () =>
        api
          .getSchedule()
          .then(setSchedule)
          .catch(() => {}),
      30000
    );
    return () => clearInterval(iv);
  }, []);

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="display-section">
      <h2 className="display-section-title">{t('display.scheduleTitle')}</h2>
      <div className="display-schedule">
        {schedule.length === 0 && <p className="display-empty">{t('display.noSchedule')}</p>}
        {schedule.map((item, i) => {
          const isPast = (item.time_to || item.time_from) < currentTime;
          const isNow =
            i < schedule.length - 1
              ? item.time_from <= currentTime && schedule[i + 1].time_from > currentTime
              : item.time_from <= currentTime;
          const timeLabel = item.time_to ? `${item.time_from}–${item.time_to}` : item.time_from;
          return (
            <div
              key={item.id}
              className={`display-schedule-row ${isNow ? 'current' : isPast ? 'past' : ''}`}
            >
              <span className="display-schedule-time">{timeLabel}</span>
              <span className="display-schedule-event">{item.event}</span>
              {isNow && <span className="display-schedule-now">{t('display.now')}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
