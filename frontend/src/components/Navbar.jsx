import React, { useState } from 'react';
import { Search, Bell, User, Zap, Wifi, WifiOff, Menu, Sun, Moon } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const timeAgo = (ms) => {
  const mins = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)} h ago`;
  return new Date(ms).toLocaleDateString();
};

const Navbar = ({ toggleSidebar }) => {
  const { user, simulatorStatus, searchQuery, setSearchQuery, inbox, markInboxRead } = useAppContext();
  const [showNotifications, setShowNotifications] = useState(false);
  const unread = (inbox || []).filter(n => !n.read).length;

  // Opening the bell marks everything as read.
  const toggleBell = () => {
    const opening = !showNotifications;
    setShowNotifications(opening);
    if (opening && unread > 0) markInboxRead();
  };

  return (
    <header className="glass" style={{
      height: 'var(--navbar-height)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      borderBottom: '1px solid var(--border-color)',
      borderRadius: 0,
      boxShadow: 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button className="menu-toggle" onClick={toggleSidebar}>
          <Menu size={24} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="navbar-search" style={{ flex: 1, display: 'flex', alignItems: 'center', marginLeft: '1rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-tertiary)',
          padding: '0.5rem 1rem',
          borderRadius: 'var(--radius-md)',
          width: '100%',
          maxWidth: 400,
          border: '1px solid var(--border-color)',
          transition: 'all 0.2s',
        }}
          onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
          onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
        >
          <Search size={18} color="var(--text-secondary)" />
          <input
            type="text"
            placeholder="Search stations, locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              marginLeft: '0.75rem',
              outline: 'none',
              fontSize: '0.9rem',
              width: '100%',
            }}
          />
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        
        {/* Simulator Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '0.4rem 0.875rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)' }}>
          {simulatorStatus === 'connected' ? (
            <><div className="live-dot" /><span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--status-available)' }}>SIMULATOR LIVE</span></>
          ) : (
            <><WifiOff size={14} color="var(--text-secondary)" /><span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>OFFLINE</span></>
          )}
        </div>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={toggleBell}
            style={{ position: 'relative', color: 'var(--text-secondary)', transition: 'all 0.2s', background: 'none', border: 'none', cursor: 'pointer' }} 
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <Bell size={20} />
            {unread > 0 && (
              <span style={{
                position: 'absolute',
                top: -4,
                right: -4,
                background: 'var(--accent-primary)',
                color: '#080f1e',
                fontSize: '0.65rem',
                fontWeight: 900,
                width: 16,
                height: 16,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid var(--bg-color)',
              }}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="glass animate-fade-in" style={{
              position: 'absolute',
              top: '100%',
              right: '-2rem',
              marginTop: '1.5rem',
              width: '320px',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 1000
            }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', color: 'var(--text-primary)' }}>
                Notifications
              </h3>
              {(inbox || []).length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', textAlign: 'center', margin: '1.5rem 0' }}>
                  No notifications yet.
                </p>
              ) : (
                <div className="custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 360, overflowY: 'auto' }}>
                  {inbox.map(n => (
                    <div key={n.id} style={{
                      padding: '0.875rem',
                      background: n.read ? 'rgba(255,255,255,0.03)' : 'rgba(57, 255, 20, 0.08)',
                      borderLeft: `3px solid ${n.read ? 'var(--border-color)' : 'var(--accent-primary)'}`,
                      borderRadius: 'var(--radius-sm)',
                    }}>
                      <p style={{ fontSize: '0.8125rem', margin: 0, color: 'var(--text-primary)', fontWeight: 600, lineHeight: 1.4 }}>{n.msg}</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0, marginTop: '0.4rem', fontWeight: 700 }}>{timeAgo(n.timestamp)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="navbar-user-info" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', paddingLeft: '1.5rem', borderLeft: '1px solid var(--border-color)' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0 }}>{user?.name || 'Guest'}</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{user?.role || 'EV Owner'}</p>
          </div>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem',
            fontWeight: 800,
            color: 'white',
            boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
          }}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
      </div>
     </header>
  );
};

export default Navbar;
