import React, { useState } from 'react';
import { useAdminContext } from '../context/AdminContext';
import { Search, CheckCircle, AlertCircle, MapPin, User } from 'lucide-react';

const TYPE_LABEL = {
  charger_not_working: 'Charger not working',
  connector_damaged: 'Connector damaged',
  station_blocked: 'Station blocked by another vehicle',
  still_plugged_in: 'Someone still plugged in',
};

const STATUS = {
  open:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Open',     icon: <AlertCircle size={13} /> },
  resolved: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Resolved', icon: <CheckCircle size={13} /> },
};

const Reports = () => {
  const { reports, setReportStatus } = useAdminContext();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [updating, setUpdating] = useState(null);

  const q = search.toLowerCase();
  const filtered = reports.filter(r =>
    (filter === 'all' || r.status === filter) &&
    (typeFilter === 'all' || r.type === typeFilter) &&
    (!q || r.stationName?.toLowerCase().includes(q) || r.reporterName?.toLowerCase().includes(q))
  );

  const change = async (id, status) => {
    setUpdating(id);
    await setReportStatus(id, status);
    setUpdating(null);
  };

  const counts = { open: reports.filter(r => r.status === 'open').length, resolved: reports.filter(r => r.status === 'resolved').length };
  const selectStyle = { padding: '0.625rem 0.875rem', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.875rem' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>Reports</h1>
        <p style={{ color: '#64748b' }}>{reports.length} total · {counts.open} open</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(140px, 220px))', gap: '1rem' }}>
        {Object.entries(STATUS).map(([key, s]) => (
          <div key={key} className="glass" onClick={() => setFilter(filter === key ? 'all' : key)}
            style={{ padding: '1rem 1.25rem', borderRadius: 16, borderLeft: `3px solid ${s.color}`, cursor: 'pointer' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.375rem' }}>{s.label}</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color }}>{counts[key]}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search station or reporter..."
            style={{ width: '100%', padding: '0.625rem 0.875rem 0.625rem 2.1rem', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.875rem' }} />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} style={selectStyle}>
          <option value="all" style={{ background: '#0f1a2e' }}>All statuses</option>
          <option value="open" style={{ background: '#0f1a2e' }}>Open</option>
          <option value="resolved" style={{ background: '#0f1a2e' }}>Resolved</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={selectStyle}>
          <option value="all" style={{ background: '#0f1a2e' }}>All problem types</option>
          {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v} style={{ background: '#0f1a2e' }}>{l}</option>)}
        </select>
      </div>

      <div className="glass" style={{ borderRadius: 20, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Station', 'Problem', 'Reporter', 'Time', 'Status', ''].map(h => (
                <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const st = STATUS[r.status] || STATUS.open;
              return (
                <tr key={r.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.85rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: '#94a3b8' }}><MapPin size={13} />{r.stationName}</span>
                  </td>
                  <td style={{ padding: '0.875rem 1.25rem' }}>
                    <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{TYPE_LABEL[r.type] || r.type}</p>
                    {r.note && <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem', maxWidth: 280 }}>{r.note}</p>}
                  </td>
                  <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.85rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}><User size={13} color="#64748b" />{r.reporterName}</span>
                  </td>
                  <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>{new Date(r.createdAt).toLocaleString()}</td>
                  <td style={{ padding: '0.875rem 1.25rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.625rem', borderRadius: 999, background: st.bg, color: st.color, fontSize: '0.75rem', fontWeight: 700 }}>
                      {st.icon} {st.label}
                    </span>
                  </td>
                  <td style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>
                    {r.status === 'open' ? (
                      <button onClick={() => change(r.id, 'resolved')} disabled={updating === r.id}
                        style={{ padding: '0.4rem 0.75rem', borderRadius: 8, background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                        Mark Resolved
                      </button>
                    ) : (
                      <button onClick={() => change(r.id, 'open')} disabled={updating === r.id}
                        style={{ padding: '0.4rem 0.75rem', borderRadius: 8, background: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                        Reopen
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>No reports found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reports;
