import React, { useMemo, useState } from 'react';
import { useAdminContext } from '../context/AdminContext';
import { MapPin, Search, Trash2, User, BellRing, Users } from 'lucide-react';

const fmtDuration = (ms) => {
  const mins = Math.max(0, Math.floor(ms / 60000));
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min`;
};

const AdminWaitlist = () => {
  const { waitlist, stations, removeWaitlistEntry } = useAdminContext();
  const [search, setSearch] = useState('');
  const [removing, setRemoving] = useState(null);

  const q = search.toLowerCase();
  const groups = useMemo(() => {
    const byStation = new Map();
    waitlist.forEach(w => {
      if (q && !(w.stationName?.toLowerCase().includes(q) || w.userName?.toLowerCase().includes(q))) return;
      if (!byStation.has(w.stationId)) byStation.set(w.stationId, []);
      byStation.get(w.stationId).push(w);
    });
    return [...byStation.entries()].map(([stationId, entries]) => ({
      stationId,
      stationName: entries[0].stationName,
      status: stations.find(s => s.id === stationId)?.status || 'unknown',
      entries: entries.sort((a, b) => a.position - b.position),
    }));
  }, [waitlist, stations, q]);

  const remove = async (entry) => {
    if (!window.confirm(`Remove ${entry.userName} from the waitlist for ${entry.stationName}?`)) return;
    setRemoving(entry.id);
    await removeWaitlistEntry(entry.id);
    setRemoving(null);
  };

  const now = Date.now();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>Waitlist</h1>
        <p style={{ color: '#64748b' }}>{waitlist.length} {waitlist.length === 1 ? 'person' : 'people'} waiting across {new Set(waitlist.map(w => w.stationId)).size} station(s)</p>
      </div>

      <div style={{ position: 'relative', maxWidth: 360 }}>
        <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search station or user..."
          style={{ width: '100%', padding: '0.625rem 0.875rem 0.625rem 2.1rem', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.875rem' }} />
      </div>

      {groups.length === 0 && (
        <div className="glass" style={{ borderRadius: 20, padding: '3rem', textAlign: 'center', color: '#475569' }}>
          <Users size={32} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
          <p>Nobody is on a waitlist right now.</p>
        </div>
      )}

      {groups.map(g => (
        <div key={g.stationId} className="glass" style={{ borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <MapPin size={16} color="#64748b" />
            <h3 style={{ fontWeight: 700, flex: 1 }}>{g.stationName}</h3>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{g.status === 'offline' ? 'inactive' : g.status}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b' }}>{g.entries.length} waiting</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['Position', 'User', 'Waiting', 'Notified', ''].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1.25rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {g.entries.map((w, i) => (
                <tr key={w.id} style={{ borderBottom: i < g.entries.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <td style={{ padding: '0.75rem 1.25rem', fontWeight: 800 }}>#{w.position}</td>
                  <td style={{ padding: '0.75rem 1.25rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                      <User size={14} color="#64748b" /> {w.userName}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1.25rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                    {fmtDuration(now - w.joinedAt)}
                    <div style={{ fontSize: '0.65rem', color: '#475569' }}>since {new Date(w.joinedAt).toLocaleTimeString()}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1.25rem', fontSize: '0.85rem' }}>
                    {w.notifiedAt
                      ? <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><BellRing size={13} /> {new Date(w.notifiedAt).toLocaleTimeString()}</span>
                      : <span style={{ color: '#475569' }}>Not yet</span>}
                  </td>
                  <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right' }}>
                    <button onClick={() => remove(w)} disabled={removing === w.id} title="Remove from waitlist"
                      style={{ padding: '0.4rem 0.75rem', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 700 }}>
                      <Trash2 size={13} /> Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

export default AdminWaitlist;
