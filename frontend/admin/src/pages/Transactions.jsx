import React, { useState } from 'react';
import { useAdminContext } from '../context/AdminContext';
import { Search, Zap, Clock, MapPin, CheckCircle, User, Calendar } from 'lucide-react';

const fmtDuration = (ms) => {
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min`;
};

const Transactions = () => {
  const { sessions } = useAdminContext();
  const [search, setSearch] = useState('');

  // Newest first
  const sorted = [...(sessions || [])].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const filtered = sorted.filter(x =>
    x.stationName?.toLowerCase().includes(search.toLowerCase()) ||
    x.userName?.toLowerCase().includes(search.toLowerCase())
  );

  const durationMs = (x) => (x.endTime ? new Date(x.endTime) : new Date()) - new Date(x.startTime);
  const completed = sorted.filter(x => x.status === 'completed');
  const totalEnergy = completed.reduce((sum, x) => sum + (Number(x.energyConsumed) || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>Charging Sessions</h1>
          <p style={{ color: '#64748b' }}>{sorted.length} sessions · charging is free</p>
        </div>
        <div className="glass" style={{ padding: '0.5rem 1rem', borderRadius: '99px', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Sync Active</span>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Total Energy', value: `${totalEnergy.toFixed(1)} kWh`, color: '#10b981', icon: <Zap size={20} color="#10b981"/> },
          { label: 'Completed Sessions', value: completed.length, color: '#8b5cf6', icon: <CheckCircle size={20} color="#8b5cf6"/> },
        ].map(k => (
          <div key={k.label} className="glass" style={{ padding: '1.25rem 1.5rem', borderRadius: 18, borderLeft: `3px solid ${k.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: 10, background: `${k.color}18` }}>{k.icon}</div>
            </div>
            <p style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>{k.label}</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 800, color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 300px' }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by customer or station..."
            style={{ paddingLeft: 34, width: '100%', padding: '0.625rem 0.875rem 0.625rem 2.1rem', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.875rem' }} />
        </div>
      </div>

      {/* Table */}
      <div className="glass" style={{ borderRadius: 20, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Customer', 'Station', 'Energy', 'Duration', 'Status'].map(h => (
                <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((x, i) => {
              const active = x.status === 'active';
              return (
                <tr key={x.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '0.875rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={14} color="#64748b"/>
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{x.userName || 'Guest User'}</p>
                        <p style={{ fontSize: '0.65rem', color: '#475569', textTransform: 'uppercase' }}>Session #{x.id}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.875rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                      <MapPin size={13}/>{x.stationName || 'Unknown Station'}
                    </div>
                  </td>
                  <td style={{ padding: '0.875rem 1.25rem' }}>
                    <p style={{ fontWeight: 800, color: '#10b981', fontSize: '0.95rem' }}>{active ? '—' : `${Number(x.energyConsumed).toFixed(2)} kWh`}</p>
                  </td>
                  <td style={{ padding: '0.875rem 1.25rem' }}>
                    <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#fff' }}>
                        <Clock size={12} color="#64748b"/> {fmtDuration(durationMs(x))}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#94a3b8' }}>
                        <Calendar size={12} color="#64748b"/> {new Date(x.startTime).toLocaleString()}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.875rem 1.25rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.625rem', borderRadius: 999,
                      background: active ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)', color: active ? '#f59e0b' : '#10b981', fontSize: '0.75rem', fontWeight: 700 }}>
                      {active ? <Zap size={12}/> : <CheckCircle size={12}/>} {active ? 'CHARGING' : 'COMPLETED'}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>No charging sessions found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Transactions;
