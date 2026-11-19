import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from '../api';
import { usePolling } from '../hooks/usePolling';

const AdminContext = createContext();

const POLL_MS = 5000;

export const AdminProvider = ({ children }) => {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const [adminUser, setAdminUser]   = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ── Live data ──────────────────────────────────────────────────────────────
  const [totalOnlineUsers, setTotalOnlineUsers]         = useState(0);
  const [totalRegisteredUsers, setTotalRegisteredUsers] = useState(0);
  const [stations, setStations]           = useState([]);
  const [waitlist, setWaitlist]           = useState([]);
  const [reports, setReports]             = useState([]);
  const [sessions, setSessions]           = useState([]);
  const [ocppLog, setOcppLog]             = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [simulatorStatus, setSimulatorStatus] = useState('disconnected');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [socket, setSocket]   = useState(null);

  const clearSession = useCallback(() => {
    setToken(null);
    setAdminUser(null);
    setStations([]); setWaitlist([]); setReports([]); setSessions([]); setOcppLog([]); setNotifications([]);
    setLoading(true);
  }, []);

  // Restore a saved admin login on page load.
  useEffect(() => {
    if (!getToken()) { setAuthLoading(false); return; }
    api.get('/auth/me')
      .then(({ user }) => {
        if (user.role === 'admin') setAdminUser(user);
        else setToken(null);
      })
      .catch(() => setToken(null))
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  const login = async (email, password) => {
    try {
      const { token, user } = await api.post('/auth/login', { email, password });
      if (user.role !== 'admin') return { success: false, error: 'This account does not have admin access.' };
      setToken(token);
      setAdminUser(user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    clearSession();
  };

  // ── Polling (replaces the Firestore onSnapshot listeners) ──────────────────
  const refresh = useCallback(async () => {
    const results = await Promise.allSettled([
      api.get('/stations'),
      api.get('/waitlist'),
      api.get('/reports'),
      api.get('/sessions'),
      api.get('/notifications'),
      api.get('/ocpp-logs'),
      api.get('/users/stats'),
    ]);
    const [st, wl, rp, se, nt, lg, us] = results;
    if (st.status === 'fulfilled') setStations(st.value);
    if (wl.status === 'fulfilled') setWaitlist(wl.value);
    if (rp.status === 'fulfilled') setReports(rp.value);
    if (se.status === 'fulfilled') setSessions(se.value);
    if (nt.status === 'fulfilled') setNotifications(nt.value);
    if (lg.status === 'fulfilled') setOcppLog(lg.value);
    if (us.status === 'fulfilled') {
      setTotalOnlineUsers(us.value.onlineUsers);
      setTotalRegisteredUsers(us.value.registeredUsers);
    }
    const failed = results.find(r => r.status === 'rejected');
    setError(failed ? failed.reason.message : null);
    setLoading(false);
  }, []);

  usePolling(refresh, POLL_MS, !!adminUser);

  // ── Socket.IO → OCPP simulator (optional) ──────────────────────────────────
  useEffect(() => {
    if (!adminUser) return undefined;
    const SIMULATOR_URL = import.meta.env.VITE_SIMULATOR_URL || `http://${window.location.hostname}:4000`;
    let s;
    let cancelled = false;

    (async () => {
      try {
        const { io } = await import('socket.io-client');
        if (cancelled) return;
        s = io(SIMULATOR_URL, { transports: ['websocket'], reconnection: true });
        setSocket(s);
        s.on('connect',    () => setSimulatorStatus('connected'));
        s.on('disconnect', () => setSimulatorStatus('disconnected'));
        s.on('ocpp_event', (entry) => setOcppLog(prev => [entry, ...prev].slice(0, 200)));
        s.on('station_status_update', ({ stationId, status }) => {
          setStations(prev => prev.map(st => (st.id === stationId ? { ...st, status } : st)));
        });
      } catch {
        setSimulatorStatus('disconnected');
      }
    })();

    return () => { cancelled = true; if (s) s.disconnect(); setSocket(null); };
  }, [adminUser]);

  // ── Admin actions ──────────────────────────────────────────────────────────
  const overrideStationStatus = async (stationId, status) => {
    try {
      await api.patch(`/stations/${stationId}/status`, { status });
      if (socket) socket.emit('admin_override', { stationId, status });
      await refresh();
    } catch (err) {
      console.error('[Admin] override failed:', err.message);
    }
  };

  // Remove someone from a station's waitlist (they get a note in their inbox).
  const removeWaitlistEntry = async (entryId) => {
    try {
      await api.delete(`/waitlist/${entryId}`);
      await refresh();
      return { success: true };
    } catch (err) {
      console.error('[Admin] remove waitlist entry failed:', err.message);
      return { success: false, error: err.message };
    }
  };

  const setReportStatus = async (reportId, status) => {
    try {
      await api.patch(`/reports/${reportId}/status`, { status });
      await refresh();
      return { success: true };
    } catch (err) {
      console.error('[Admin] update report failed:', err.message);
      return { success: false, error: err.message };
    }
  };

  // Creates a notification in the admin feed (RemoteControl / SimulationControl use this).
  const createNotification = async (title, msg, type = 'info') => {
    try {
      await api.post('/notifications', { title, msg, type });
      const list = await api.get('/notifications');
      setNotifications(list);
    } catch (err) {
      console.error('Failed to create notification:', err.message);
    }
  };

  const updateUser = async (updates) => {
    try {
      const { user } = await api.patch('/users/me', updates);
      setAdminUser(user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return (
    <AdminContext.Provider value={{
      adminUser, authLoading, login, logout,
      totalOnlineUsers, totalRegisteredUsers,
      stations, waitlist, reports, sessions,
      ocppLog, simulatorStatus, socket,
      overrideStationStatus, removeWaitlistEntry, setReportStatus, createNotification,
      loading, error, updateUser, refresh,
      notifications,
    }}>
      {children}
    </AdminContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAdminContext = () => useContext(AdminContext);
