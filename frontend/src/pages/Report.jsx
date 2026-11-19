import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Flag, Send, Loader, CheckCircle, AlertCircle } from 'lucide-react';

const PROBLEM_TYPES = [
  { value: 'charger_not_working', label: 'Charger not working' },
  { value: 'connector_damaged', label: 'Connector damaged' },
  { value: 'station_blocked', label: 'Station blocked by another vehicle' },
  { value: 'still_plugged_in', label: 'Someone still plugged in' },
];
const typeLabel = (v) => PROBLEM_TYPES.find(t => t.value === v)?.label || v;

const Report = () => {
  const { stations, myReports, submitReport } = useAppContext();
  const [stationId, setStationId] = useState('');
  const [type, setType] = useState(PROBLEM_TYPES[0].value);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stationId) return;
    setSending(true);
    const ok = await submitReport({ stationId, type, note: note.trim() });
    setSending(false);
    if (ok) setNote('');
  };

  const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' };
  const fieldStyle = { width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)' };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: 720 }}>
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Report a Problem</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Tell us if something is wrong at a station. Other drivers will see it for 24 hours (without your name).</p>
      </div>

      <form onSubmit={handleSubmit} className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label style={labelStyle} htmlFor="rep-station">Station</label>
          <select id="rep-station" value={stationId} onChange={e => setStationId(e.target.value)} required style={fieldStyle}>
            <option value="">Select a station…</option>
            {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle} htmlFor="rep-type">Problem</label>
          <select id="rep-type" value={type} onChange={e => setType(e.target.value)} style={fieldStyle}>
            {PROBLEM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle} htmlFor="rep-note">Note (optional)</label>
          <textarea id="rep-note" value={note} onChange={e => setNote(e.target.value)} maxLength={500} rows={3}
            placeholder="Anything that helps us fix it…" style={{ ...fieldStyle, resize: 'vertical' }} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={sending || !stationId} style={{ gap: '0.5rem', alignSelf: 'flex-start' }}>
          {sending ? <Loader className="animate-spin" size={16} /> : <Send size={16} />} Send Report
        </button>
      </form>

      <div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Flag size={18} /> My Reports
        </h2>
        {myReports.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>You have not sent any reports yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {myReports.map(r => {
              const resolved = r.status === 'resolved';
              return (
                <div key={r.id} className="glass" style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ fontWeight: 700 }}>{typeLabel(r.type)}</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{r.stationName} · {new Date(r.createdAt).toLocaleString()}</p>
                    {r.note && <p style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}>{r.note}</p>}
                  </div>
                  <span style={{
                    alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                    padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700,
                    color: resolved ? '#10b981' : '#f59e0b',
                    background: resolved ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                  }}>
                    {resolved ? <CheckCircle size={14} /> : <AlertCircle size={14} />} {resolved ? 'Resolved' : 'Open'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Report;
