import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ListOrdered, MapPin, BellRing, Loader } from 'lucide-react';

const Waitlist = () => {
  const { waitlist, stations, leaveWaitlist } = useAppContext();
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState(null);

  const cancel = async (stationId) => {
    setBusyId(stationId);
    await leaveWaitlist(stationId);
    setBusyId(null);
  };

  if (waitlist.length === 0) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1.5rem' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ListOrdered size={36} color="var(--text-secondary)" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>You are not on any waitlist</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: 360 }}>
            When a station is busy, open it on the map and tap "Join Waitlist". We will tell you when it is free.
          </p>
          <button onClick={() => navigate('/map')} className="btn btn-primary">Find a Station</button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: 800 }}>
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Waitlist</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          {waitlist.length} station{waitlist.length !== 1 ? 's' : ''} you are waiting for
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {waitlist.map(w => {
          const station = stations.find(s => s.id === w.stationId);
          const total = station?.waitlistCount ?? w.position;
          const myTurn = w.position === 1 && station?.status === 'available';
          return (
            <div key={w.id} className="glass" style={{
              padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-lg)',
              display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap',
              border: myTurn ? '1px solid var(--accent-primary)' : undefined,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                background: 'var(--accent-gradient)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.25rem', fontWeight: 800,
              }}>
                #{w.position}
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <h3 style={{ fontWeight: 700, fontSize: '1.05rem' }}>{w.stationName}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                  Position {w.position} of {total}
                  {station && <> · station is <strong>{station.status === 'locked' ? 'blocked' : station.status === 'offline' ? 'inactive' : station.status}</strong></>}
                </p>
                {myTurn && (
                  <p style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: 700, marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <BellRing size={14} /> It is free. You are first in line!
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => navigate('/map')} className="btn btn-secondary" style={{ gap: '0.4rem' }}>
                  <MapPin size={16} /> Map
                </button>
                <button onClick={() => cancel(w.stationId)} disabled={busyId === w.stationId} className="btn btn-outline">
                  {busyId === w.stationId ? <Loader className="animate-spin" size={16} /> : 'Cancel'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Waitlist;
