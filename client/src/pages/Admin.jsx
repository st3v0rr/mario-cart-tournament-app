import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import './Admin.css';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

function TimeSelect({ value, onChange, required, style }) {
  const [h, m] = value ? value.split(':') : ['', ''];
  const set = (newH, newM) => onChange(`${newH}:${newM}`);
  return (
    <div style={{ display: 'flex', gap: 4, ...style }}>
      <select
        className="input"
        style={{ flex: 1 }}
        value={h || ''}
        required={required}
        onChange={(e) => set(e.target.value, m || '00')}
      >
        <option value="">hh</option>
        {HOURS.map((hh) => <option key={hh} value={hh}>{hh}</option>)}
      </select>
      <span style={{ alignSelf: 'center', color: 'var(--color-text-muted)' }}>:</span>
      <select
        className="input"
        style={{ flex: 1 }}
        value={m || ''}
        required={required}
        onChange={(e) => set(h || '00', e.target.value)}
      >
        <option value="">mm</option>
        {MINUTES.map((mm) => <option key={mm} value={mm}>{mm}</option>)}
      </select>
    </div>
  );
}

const TABS = ['Tickets', 'Slots', 'Teilnehmer', 'Bracket', 'CSV Import'];

export default function Admin() {
  const [tab, setTab] = useState('Tickets');

  return (
    <div className="page-wide">
      <h1>⚙️ Admin-Panel</h1>
      <div className="admin-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={`admin-tab btn ${tab === t ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
        <button
          className={`admin-tab admin-tab-setup btn ${tab === 'Setup' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('Setup')}
        >
          ⚙ Setup
        </button>
      </div>
      <div className="admin-content">
        {tab === 'Setup' && <SetupTab />}
        {tab === 'Tickets' && <TicketsTab />}
        {tab === 'CSV Import' && <CsvImportTab />}
        {tab === 'Slots' && <SlotsTab />}
        {tab === 'Bracket' && <BracketTab />}
        {tab === 'Teilnehmer' && <ParticipantsTab />}
      </div>
    </div>
  );
}

// --- Setup ---
function SetupTab() {
  const today = new Date().toISOString().slice(0, 10);
  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState('');
  const [migrateMsg, setMigrateMsg] = useState('');
  const [migrateError, setMigrateError] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetError, setResetError] = useState('');

  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('17:00');
  const [slotDuration, setSlotDuration] = useState(5);
  const [clearExisting, setClearExisting] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');
  const [seedError, setSeedError] = useState('');
  const [seeding, setSeeding] = useState(false);

  const loadStatus = useCallback(() => {
    setStatusError('');
    api.adminSetupStatus()
      .then(setStatus)
      .catch((e) => setStatusError(e.message));
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const runMigrate = async () => {
    setMigrateMsg(''); setMigrateError('');
    try {
      await api.adminMigrate();
      setMigrateMsg('Datenbank erfolgreich initialisiert.');
    } catch (e) {
      setMigrateError(e.message);
    }
  };

  const runReset = async () => {
    setResetMsg(''); setResetError('');
    try {
      await api.adminResetDatabase();
      setResetMsg('Datenbank vollständig zurückgesetzt.');
      setResetConfirm('');
      loadStatus();
    } catch (e) {
      setResetError(e.message);
    }
  };

  const runSeed = async (e) => {
    e.preventDefault();
    setSeedMsg(''); setSeedError(''); setSeeding(true);
    try {
      const res = await api.adminSeedSlots({
        date,
        start_time: startTime,
        end_time: endTime,
        slot_duration: Number(slotDuration),
        clear_existing: clearExisting,
      });
      setSeedMsg(`${res.seeded} Slots erfolgreich erstellt.`);
      setClearExisting(false);
      loadStatus();
    } catch (e) {
      setSeedError(e.message);
    } finally {
      setSeeding(false);
    }
  };

  const slotCount = status
    ? Math.floor(
        ((Number(endTime.split(':')[0]) * 60 + Number(endTime.split(':')[1])) -
          (Number(startTime.split(':')[0]) * 60 + Number(startTime.split(':')[1]))) /
          Number(slotDuration)
      )
    : null;

  const formatDt = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('de-DE', {
      dateStyle: 'short', timeStyle: 'short',
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>

      {/* DB Status */}
      <div className="card">
        <h2>Datenbank-Status</h2>
        {statusError && <p className="error-msg">{statusError}</p>}
        {status && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-sm)' }}>
            <div className="stat-card">
              <span className="stat-label">Slots gesamt</span>
              <span className="stat-value">{status.slot_count}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Gebucht/Abgeschlossen</span>
              <span className="stat-value">{status.booked_count}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Erster Slot</span>
              <span className="stat-value" style={{ fontSize: '1rem' }}>{formatDt(status.first_slot)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Letzter Slot</span>
              <span className="stat-value" style={{ fontSize: '1rem' }}>{formatDt(status.last_slot)}</span>
            </div>
          </div>
        )}
        <button className="btn btn-secondary" style={{ marginTop: 'var(--spacing-md)' }} onClick={loadStatus}>
          Aktualisieren
        </button>
      </div>

      {/* Seed */}
      <div className="card">
        <h2>Zeitplan konfigurieren</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 'var(--spacing-md)' }}>
          Entspricht <code>npm run db:seed</code>, mit konfigurierbarem Datum und Zeitraum.
        </p>

        {status?.slot_count > 0 && !clearExisting && (
          <div className="error-msg" style={{ marginBottom: 'var(--spacing-md)' }}>
            Es existieren bereits <strong>{status.slot_count}</strong> Slots. Aktiviere „Vorhandene Slots löschen", um sie zu ersetzen.
          </div>
        )}

        <form onSubmit={runSeed} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', maxWidth: 440 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Renntag</span>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Startzeit</span>
              <TimeSelect value={startTime} onChange={setStartTime} required />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Endzeit</span>
              <TimeSelect value={endTime} onChange={setEndTime} required />
            </label>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Slot-Dauer (Minuten)</span>
            <select
              className="input"
              value={slotDuration}
              onChange={(e) => setSlotDuration(e.target.value)}
            >
              {[1, 2, 3, 5, 10, 15, 20, 30].map((d) => (
                <option key={d} value={d}>{d} min</option>
              ))}
            </select>
          </label>

          {slotCount !== null && slotCount > 0 && (
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
              → <strong>{slotCount}</strong> Slots werden erstellt ({startTime}–{endTime}, je {slotDuration} min)
            </p>
          )}

          {status?.slot_count > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={clearExisting}
                onChange={(e) => setClearExisting(e.target.checked)}
                disabled={status?.booked_count > 0}
              />
              <span style={{ fontSize: '0.9rem' }}>
                Vorhandene Slots löschen (nur möglich wenn keine gebucht/abgeschlossen)
              </span>
            </label>
          )}

          {seedMsg && <p className="success-msg">{seedMsg}</p>}
          {seedError && <p className="error-msg">{seedError}</p>}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={seeding || (status?.slot_count > 0 && !clearExisting)}
          >
            {seeding ? 'Wird erstellt…' : 'Slots erstellen'}
          </button>
        </form>

      </div>

      <ScheduleEventsEditor />

      {/* Danger Zone */}
      <div className="card setup-danger-zone">
        <h2>Gefahrenzone</h2>

        <div className="danger-zone-section">
          <div>
            <strong>Datenbank initialisieren</strong>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>
              Legt fehlende Tabellen an — bestehende Daten bleiben erhalten.
            </p>
          </div>
          {migrateMsg && <p className="success-msg" style={{ margin: 0 }}>{migrateMsg}</p>}
          {migrateError && <p className="error-msg" style={{ margin: 0 }}>{migrateError}</p>}
          <button className="btn btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={runMigrate}>
            Initialisieren
          </button>
        </div>

        <div className="danger-zone-divider" />

        <div className="danger-zone-section">
          <div>
            <strong>Datenbank zurücksetzen</strong>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>
              Löscht <strong>alle</strong> Daten (Tickets, Teilnehmer, Slots, Bracket). Unwiderruflich.
            </p>
          </div>
          {resetMsg && <p className="success-msg" style={{ margin: 0 }}>{resetMsg}</p>}
          {resetError && <p className="error-msg" style={{ margin: 0 }}>{resetError}</p>}
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              className="input"
              style={{ maxWidth: 260 }}
              placeholder='Zur Bestätigung "RESET" eingeben'
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
            />
            <button
              className="btn btn-danger"
              disabled={resetConfirm !== 'RESET'}
              onClick={runReset}
            >
              Zurücksetzen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Schedule Events Editor (Programmablauf) ---
function ScheduleEventsEditor() {
  const [events, setEvents] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [newFrom, setNewFrom] = useState('');
  const [newTo, setNewTo] = useState('');
  const [newEvent, setNewEvent] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => api.adminGetSchedule().then(setEvents), []);
  useEffect(() => { load(); }, [load]);

  const startEdit = (ev) => {
    setEditId(ev.id);
    setEditData({ time_from: ev.time_from, time_to: ev.time_to || '', event: ev.event });
  };
  const cancelEdit = () => setEditId(null);

  const saveEdit = async () => {
    setMsg(''); setError('');
    try {
      await api.adminUpdateScheduleEvent(editId, {
        time_from: editData.time_from,
        time_to: editData.time_to || null,
        event: editData.event,
      });
      setEditId(null);
      load();
    } catch (e) { setError(e.message); }
  };

  const del = async (id) => {
    setMsg(''); setError('');
    try { await api.adminDeleteScheduleEvent(id); load(); }
    catch (e) { setError(e.message); }
  };

  const add = async (e) => {
    e.preventDefault();
    setMsg(''); setError('');
    try {
      await api.adminAddScheduleEvent(newFrom, newEvent, newTo || null);
      setNewFrom(''); setNewTo(''); setNewEvent('');
      setMsg('Eintrag hinzugefügt.');
      load();
    } catch (e) { setError(e.message); }
  };

  const fmtRange = (ev) => ev.time_to ? `${ev.time_from}–${ev.time_to}` : ev.time_from;

  return (
    <div className="card">
      <h2>Programmablauf</h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 'var(--spacing-md)' }}>
        Wird auf dem Display im Zeitplan angezeigt.
      </p>

      {msg && <p className="success-msg">{msg}</p>}
      {error && <p className="error-msg">{error}</p>}

      <table style={{ marginBottom: 'var(--spacing-md)' }}>
        <thead>
          <tr><th>Von</th><th>Bis</th><th>Programmpunkt</th><th style={{ textAlign: 'right' }}></th></tr>
        </thead>
        <tbody>
          {events.length === 0 && (
            <tr><td colSpan={4} style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>Keine Einträge</td></tr>
          )}
          {events.map((ev) => (
            <tr key={ev.id}>
              <td>
                {editId === ev.id
                  ? <TimeSelect value={editData.time_from} onChange={(v) => setEditData({ ...editData, time_from: v })} style={{ width: 130 }} />
                  : <span style={{ fontFamily: 'monospace' }}>{ev.time_from}</span>}
              </td>
              <td>
                {editId === ev.id
                  ? <TimeSelect value={editData.time_to} onChange={(v) => setEditData({ ...editData, time_to: v })} style={{ width: 130 }} />
                  : <span style={{ fontFamily: 'monospace' }}>{ev.time_to || '—'}</span>}
              </td>
              <td>
                {editId === ev.id
                  ? <input className="input" style={{ padding: '4px 8px', width: '100%' }} value={editData.event} onChange={(e) => setEditData({ ...editData, event: e.target.value })} />
                  : ev.event}
              </td>
              <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                {editId === ev.id ? (
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary btn-sm" onClick={saveEdit}>✓</button>
                    <button className="btn btn-secondary btn-sm" onClick={cancelEdit}>✕</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => startEdit(ev)}>✎</button>
                    <button className="btn btn-danger btn-sm" onClick={() => del(ev.id)}>×</button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form onSubmit={add} style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Von</span>
          <TimeSelect value={newFrom} onChange={setNewFrom} required style={{ width: 150 }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Bis (optional)</span>
          <TimeSelect value={newTo} onChange={setNewTo} style={{ width: 150 }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 180 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Programmpunkt</span>
          <input className="input" placeholder="z.B. Semifinale" value={newEvent} onChange={(e) => setNewEvent(e.target.value)} required />
        </label>
        <button type="submit" className="btn btn-primary">Hinzufügen</button>
      </form>
    </div>
  );
}

// --- Tickets ---
function TicketsTab() {
  const [tickets, setTickets] = useState([]);
  const [firstName, setFirstName] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() =>
    api.adminGetTickets().then(setTickets), []);

  useEffect(() => { load(); }, [load]);

  const addTicket = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      await api.adminAddTicket(firstName, ticketNumber);
      setMsg('Eintrag hinzugefügt!');
      setFirstName(''); setTicketNumber('');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteTicket = async (id) => {
    if (!confirm('Eintrag löschen?')) return;
    try {
      await api.adminDeleteTicket(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div className="card" style={{ maxWidth: 400 }}>
          <h2>Walk-up eintragen</h2>
          <form onSubmit={addTicket} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            <input className="input" placeholder="Vorname" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            <input className="input" placeholder="Ticket-Nr. (5 Ziffern)" value={ticketNumber}
              onChange={(e) => setTicketNumber(e.target.value.replace(/\D/g, '').slice(0, 5))}
              pattern="\d{5}" required />
            <button type="submit" className="btn btn-primary">Hinzufügen</button>
          </form>
        </div>
      </div>
      {msg && <p className="success-msg">{msg}</p>}
      {error && <p className="error-msg">{error}</p>}

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Vorname</th>
              <th>Ticket-Nr.</th>
              <th>Walk-up</th>
              <th>Claimed</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id}>
                <td>{t.first_name}</td>
                <td style={{ fontFamily: 'monospace' }}>{t.ticket_number}</td>
                <td>{t.is_walk_up ? '✓' : '—'}</td>
                <td>{t.claimed ? <span className="badge badge-success">Ja</span> : <span className="badge badge-muted">Nein</span>}</td>
                <td>
                  {!t.race_time && (
                    <button className="btn btn-danger btn-sm" onClick={() => deleteTicket(t.id)}>×</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- CSV Import ---
function CsvImportTab() {
  const [csvText, setCsvText] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const importCsv = async () => {
    setError(''); setMsg('');
    const lines = csvText.trim().split('\n').filter(Boolean);
    const entries = lines.map((line) => {
      const [fn, tn] = line.split(',').map((s) => s.trim());
      return { first_name: fn, ticket_number: tn };
    });
    try {
      const res = await api.adminImportTickets(entries);
      setMsg(`${res.imported} Einträge importiert.`);
      setCsvText('');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="card" style={{ maxWidth: 500 }}>
        <h2>CSV Import</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-sm)' }}>
          Format: Vorname,Ticketnummer (eine Zeile pro Eintrag)
        </p>
        <textarea
          className="input"
          rows={10}
          placeholder={"Max,12345\nLisa,67890"}
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          style={{ resize: 'vertical', fontFamily: 'monospace' }}
        />
        {msg && <p className="success-msg" style={{ marginTop: 'var(--spacing-sm)' }}>{msg}</p>}
        {error && <p className="error-msg" style={{ marginTop: 'var(--spacing-sm)' }}>{error}</p>}
        <button className="btn btn-primary" style={{ marginTop: 'var(--spacing-sm)', width: '100%' }} onClick={importCsv}>
          Importieren
        </button>
      </div>
    </div>
  );
}

// --- Slots ---
function SlotsTab() {
  const [slots, setSlots] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() =>
    api.adminGetSlots().then(setSlots), []);

  useEffect(() => { load(); }, [load]);

  const formatTime = (iso) => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  const startEdit = (slot) => {
    setEditId(slot.id);
    setEditData({ status: slot.status, race_time: slot.race_time || '' });
  };

  const saveEdit = async (id) => {
    setError(''); setMsg('');
    const payload = { status: editData.status };
    if (editData.race_time) payload.race_time = editData.race_time;
    try {
      await api.adminUpdateSlot(id, payload);
      setMsg('Slot gespeichert.');
      setEditId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      {msg && <p className="success-msg">{msg}</p>}
      {error && <p className="error-msg">{error}</p>}
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Zeit</th>
              <th>Status</th>
              <th>Teilnehmer</th>
              <th>Rennzeit</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <tr key={slot.id}>
                <td style={{ fontWeight: 600 }}>{formatTime(slot.start_time)}</td>
                <td>
                  {editId === slot.id ? (
                    <select className="input" style={{ padding: '4px 8px' }} value={editData.status}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value })}>
                      <option value="available">available</option>
                      <option value="booked">booked</option>
                      <option value="completed">completed</option>
                    </select>
                  ) : (
                    <span className={`badge ${slot.status === 'available' ? 'badge-success' : slot.status === 'booked' ? 'badge-primary' : 'badge-muted'}`}>
                      {slot.status}
                    </span>
                  )}
                </td>
                <td>{slot.participant_name || '—'}</td>
                <td>
                  {editId === slot.id ? (
                    <input className="input" style={{ padding: '4px 8px', width: '120px', fontFamily: 'monospace' }}
                      placeholder="MM:SS.mmm" value={editData.race_time}
                      onChange={(e) => setEditData({ ...editData, race_time: e.target.value })} />
                  ) : (
                    <span style={{ fontFamily: 'monospace' }}>{slot.race_time || '—'}</span>
                  )}
                </td>
                <td>
                  {editId === slot.id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => saveEdit(slot.id)}>✓</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditId(null)}>✕</button>
                    </div>
                  ) : (
                    <button className="btn btn-secondary btn-sm" onClick={() => startEdit(slot)}>Bearbeiten</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Bracket ---
function BracketTab() {
  const [participants, setParticipants] = useState([]);
  const [entries, setEntries] = useState([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.adminGetParticipants(), api.getBracket()])
      .then(([p, b]) => { setParticipants(p); setEntries(b); });
  }, []);

  const addEntry = (participantId, round, groupNumber) => {
    const alreadyExists = entries.find(
      (e) => e.participant_id === participantId && e.round === round
    );
    if (alreadyExists) return;
    setEntries([...entries, { participant_id: participantId, round, group_number: groupNumber, position: null }]);
  };

  const setPosition = (participantId, round, position) => {
    setEntries(entries.map((e) =>
      e.participant_id === participantId && e.round === round
        ? { ...e, position: position ? parseInt(position) : null }
        : e
    ));
  };

  const removeEntry = (participantId, round) => {
    setEntries(entries.filter((e) => !(e.participant_id === participantId && e.round === round)));
  };

  const save = async () => {
    setError(''); setMsg('');
    try {
      await api.adminUpdateBracket(entries);
      setMsg('Bracket gespeichert!');
    } catch (err) {
      setError(err.message);
    }
  };

  // Top 8 from leaderboard
  const top8 = participants
    .filter((p) => p.race_time)
    .sort((a, b) => a.race_time?.localeCompare(b.race_time))
    .slice(0, 8);

  return (
    <div>
      {msg && <p className="success-msg">{msg}</p>}
      {error && <p className="error-msg">{error}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
        <div className="card">
          <h2>Semifinale – Gruppe 1</h2>
          <BracketGroup round="semifinal" groupNumber={1} entries={entries} participants={participants}
            top8={top8} onAdd={addEntry} onRemove={removeEntry} onPosition={setPosition} />
        </div>
        <div className="card">
          <h2>Semifinale – Gruppe 2</h2>
          <BracketGroup round="semifinal" groupNumber={2} entries={entries} participants={participants}
            top8={top8} onAdd={addEntry} onRemove={removeEntry} onPosition={setPosition} />
        </div>
      </div>
      <div className="card">
        <h2>Finale</h2>
        <BracketGroup round="final" groupNumber={null} entries={entries} participants={participants}
          top8={top8} onAdd={addEntry} onRemove={removeEntry} onPosition={setPosition} />
      </div>
      <button className="btn btn-primary" onClick={save}>Bracket speichern</button>
    </div>
  );
}

function BracketGroup({ round, groupNumber, entries, participants, top8, onAdd, onRemove, onPosition }) {
  const groupEntries = entries.filter(
    (e) => e.round === round && (groupNumber === null || e.group_number === groupNumber)
  );
  const groupParticipants = groupEntries.map((e) =>
    participants.find((p) => p.id === e.participant_id)
  ).filter(Boolean);

  const allRoundEntries = entries.filter((e) => e.round === round);
  const semifinalFinalists = entries
    .filter((e) => e.round === 'semifinal' && e.position != null && e.position <= 2)
    .map((e) => e.participant_id);
  const pool = round === 'final'
    ? participants.filter((p) => semifinalFinalists.includes(p.id))
    : top8;
  const available = pool.filter((p) => !allRoundEntries.find((e) => e.participant_id === p.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
      {groupParticipants.map((p) => {
        const entry = groupEntries.find((e) => e.participant_id === p.id);
        return (
          <div key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ flex: 1 }}>{p.first_name}</span>
            <input type="number" min={1} max={4} placeholder="Platz"
              value={entry?.position || ''}
              onChange={(e) => onPosition(p.id, round, e.target.value)}
              className="input" style={{ width: 70, padding: '4px 8px' }} />
            <button className="btn btn-danger btn-sm" onClick={() => onRemove(p.id, round)}>×</button>
          </div>
        );
      })}
      {round === 'final' && semifinalFinalists.length === 0 ? (
        <select className="input" style={{ padding: '6px 8px' }} disabled>
          <option>Erst Platzierungen im Halbfinale eintragen</option>
        </select>
      ) : available.length > 0 && (
        <select className="input" style={{ padding: '6px 8px' }}
          onChange={(e) => { if (e.target.value) { onAdd(e.target.value, round, groupNumber); e.target.value = ''; } }}>
          <option value="">+ Spieler hinzufügen</option>
          {available.map((p) => {
            const rank = top8.findIndex((t) => t.id === p.id);
            return (
              <option key={p.id} value={p.id}>
                {rank >= 0 ? `#${rank + 1} ` : ''}{p.first_name}{p.race_time ? ` – ${p.race_time}` : ''}
              </option>
            );
          })}
        </select>
      )}
    </div>
  );
}

// --- Participants ---
function ParticipantsTab() {
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    api.adminGetParticipants().then(setParticipants);
  }, []);

  const formatTime = (iso) => iso ? new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div>
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Ticket</th>
              <th>Slot</th>
              <th>Status</th>
              <th>Rennzeit</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p) => (
              <tr key={p.id}>
                <td>{p.first_name}</td>
                <td style={{ fontFamily: 'monospace' }}>{p.ticket_number}</td>
                <td>{formatTime(p.slot_time)}</td>
                <td>
                  {p.slot_status ? (
                    <span className={`badge ${p.slot_status === 'completed' ? 'badge-success' : p.slot_status === 'booked' ? 'badge-primary' : 'badge-muted'}`}>
                      {p.slot_status}
                    </span>
                  ) : '—'}
                </td>
                <td style={{ fontFamily: 'monospace' }}>{p.race_time || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
