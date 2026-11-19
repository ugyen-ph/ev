import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from '../api';
import { usePolling } from '../hooks/usePolling';

const AppContext = createContext();

// QRScannerModal.jsx (deliberately not touched yet) still reads `bookings` from this context.
// Reservations no longer exist, so we hand it an empty list: scanning then stops at its
// "reserve first" message, exactly as agreed (scanning stays blocked). Remove this with the scan redesign.
const NO_BOOKINGS = [];

const POLL_MS = 5000;
const PERSIST_SESSION = import.meta.env.VITE_PERSIST_SESSION !== 'false';
const initialTheme = 'dark';

export const AppProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [stations, setStations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [waitlist, setWaitlist] = useState([]);   // stations I'm waiting for (with my position)
  const [myReports, setMyReports] = useState([]);
  const [inbox, setInbox] = useState([]);           // my notifications (the bell)
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true); // true only while a saved login is being restored
  const [simulatorStatus, setSimulatorStatus] = useState('disconnected'); // connected | disconnected
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState(initialTheme);
  const socketRef = useRef(null);
  const offlineNotified = useRef(false);
  const seenInbox = useRef(null); // ids already shown; null until the first load

  // ── Notifications (toasts) ───────────────────────────────────────────────────
  const addNotification = useCallback((message, type = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  }, []);

  const removeNotification = (id) => setNotifications(prev => prev.filter(n => n.id !== id));

  // ── Session handling ─────────────────────────────────────────────────────────
  const clearSession = useCallback(() => {
    setToken(null);
    setIsAuthenticated(false);
    setUser(null);
    setWaitlist([]);
    setMyReports([]);
    setInbox([]);
    seenInbox.current = null;
    setSessions([]);
    setActiveSession(null);
  }, []);

  // Restore a saved login on page load.
  useEffect(() => {
    if (!PERSIST_SESSION) setToken(null);
    if (!getToken()) { setLoading(false); return; }
    api.get('/auth/me')
      .then(({ user: me }) => {
        if (me.role === 'admin') {
          clearSession();
          return;
        }
        setUser(me);
        setIsAuthenticated(true);
      })
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, [clearSession]);

  // If the server rejects our token (expired / blocked / deleted), drop back to the login page.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
      addNotification('Your session has expired. Please log in again.', 'error');
    });
    return () => setUnauthorizedHandler(null);
  }, [clearSession, addNotification]);

  // ── Live data (polling replaces the old Firestore listeners) ─────────────────
  const loadStations = useCallback(async () => setStations(await api.get('/stations')), []);
  const loadWaitlist = useCallback(async () => setWaitlist(await api.get('/waitlist/mine')), []);
  const loadReports = useCallback(async () => setMyReports(await api.get('/reports/mine')), []);
  const loadInbox = useCallback(async () => {
    const list = await api.get('/notifications/mine');
    setInbox(list);
    // Pop a toast for messages that arrived since the last poll (not for old ones on first load).
    if (seenInbox.current === null) {
      seenInbox.current = new Set(list.map(n => n.id));
      return;
    }
    list.forEach(n => {
      if (!seenInbox.current.has(n.id)) {
        seenInbox.current.add(n.id);
        addNotification(n.msg, n.type === 'success' ? 'success' : 'info');
      }
    });
  }, [addNotification]);
  const loadSessions = useCallback(async () => {
    const all = await api.get('/sessions');
    setSessions(all);
    setActiveSession(all.find(s => s.status === 'active') || null);
  }, []);
  const loadProfile = useCallback(async () => {
    const { user: me } = await api.get('/auth/me');
    setUser(prev => (prev ? { ...prev, ...me } : me));
  }, []);

  const refresh = useCallback(
    () => Promise.all([loadStations(), loadWaitlist(), loadReports(), loadInbox(), loadSessions(), loadProfile()]),
    [loadStations, loadWaitlist, loadReports, loadInbox, loadSessions, loadProfile]
  );

  usePolling(refresh, POLL_MS, isAuthenticated);

  // ── Socket.IO connection to the OCPP simulator (optional) ────────────────────
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const SIMULATOR_URL = import.meta.env.VITE_SIMULATOR_URL || 'http://localhost:4000';
    let socket;
    let cancelled = false;

    (async () => {
      try {
        const { io } = await import('socket.io-client');
        if (cancelled) return;
        socket = io(SIMULATOR_URL, { transports: ['websocket'], reconnection: true });
        socketRef.current = socket;

        socket.on('connect', () => { setSimulatorStatus('connected'); offlineNotified.current = false; });
        socket.on('connect_error', () => {
          setSimulatorStatus('disconnected');
          if (!offlineNotified.current) {
            offlineNotified.current = true;
            console.warn('[Socket.IO] Simulator offline - live charger events are unavailable.');
          }
        });
        socket.on('disconnect', () => setSimulatorStatus('disconnected'));

        socket.on('station_status_update', ({ stationId, status }) => {
          setStations(prev => prev.map(s => (s.id === stationId ? { ...s, status, lastUpdated: Date.now() } : s)));
        });
      } catch {
        setSimulatorStatus('disconnected');
      }
    })();

    return () => { cancelled = true; if (socket) socket.disconnect(); socketRef.current = null; };
  }, [isAuthenticated, addNotification]);

  // ── Auth ─────────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    try {
      const { token, user: me } = await api.post('/auth/login', { email, password });
      if (me.role === 'admin') {
        return { success: false, error: 'Admin accounts cannot log into the User app. Please use the Admin portal (http://localhost:5177).' };
      }
      setToken(token);
      setUser(me);
      setIsAuthenticated(true);
      addNotification(`Welcome back, ${me.name}! ⚡`, 'success');
      return { success: true, user: me };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (formData) => {
    try {
      const { name, email, password } = formData;
      const res = await api.post('/auth/register', { name, email, password });
      if (res.requiresVerification) {
        return { success: true, requiresVerification: true, email: res.email, message: res.message };
      }
      setToken(res.token);
      setUser(res.user);
      setIsAuthenticated(true);
      addNotification('Account created! Welcome to EV Hub ⚡', 'success');
      return { success: true, user: res.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const verifyCode = async (email, code) => {
    try {
      const res = await api.post('/auth/verify-code', { email, code });
      setToken(res.token);
      setUser(res.user);
      setIsAuthenticated(true);
      return { success: true, user: res.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const resendCode = async (email) => {
    try {
      await api.post('/auth/resend-code', { email });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch { /* token may already be invalid */ }
    clearSession();
    addNotification('Logged out successfully', 'info');
  };

  const updateProfile = async (fields) => {
    const { user: me } = await api.patch('/users/me', fields);
    setUser(me);
    return me;
  };

  // ── Waitlist ─────────────────────────────────────────────────────────────────
  const joinWaitlist = async (stationId) => {
    try {
      await api.post('/waitlist', { stationId });
      await Promise.all([loadWaitlist(), loadStations()]);
      addNotification('You joined the waitlist ✅', 'success');
      return true;
    } catch (error) {
      addNotification(error.message, 'error');
      loadStations().catch(() => {});
      return false;
    }
  };

  const leaveWaitlist = async (stationId) => {
    try {
      await api.delete(`/waitlist/station/${encodeURIComponent(stationId)}`);
      await Promise.all([loadWaitlist(), loadStations()]);
      addNotification('You left the waitlist', 'info');
      return true;
    } catch (error) {
      addNotification(error.message, 'error');
      loadWaitlist().catch(() => {});
      return false;
    }
  };

  // ── Reports ──────────────────────────────────────────────────────────────────
  const submitReport = async ({ stationId, type, note }) => {
    try {
      await api.post('/reports', { stationId, type, note });
      await Promise.all([loadReports(), loadStations()]);
      addNotification('Report sent. Thank you! ✅', 'success');
      return true;
    } catch (error) {
      addNotification(error.message, 'error');
      return false;
    }
  };

  const markInboxRead = async () => {
    try {
      await api.post('/notifications/mine/read-all');
      setInbox(prev => prev.map(n => ({ ...n, read: true })));
    } catch { /* ignore */ }
  };

  // ── Charging ─────────────────────────────────────────────────────────────────
  // Called by the QR scanner (the server currently refuses scans until the scan flow is redesigned).
  const plugIn = async (stationId) => {
    const station = await api.post(`/stations/${stationId}/plug-in`);
    setStations(prev => prev.map(s => (s.id === station.id ? { ...s, ...station } : s)));
    return station;
  };

  const startSession = async (stationId) => {
    if (!user) { addNotification('Please login first', 'error'); return null; }
    try {
      const session = await api.post('/sessions', { stationId });
      await Promise.all([loadSessions(), loadWaitlist(), loadStations()]);
      addNotification('Charging session started! ⚡', 'success');
      return session.id;
    } catch (error) {
      addNotification(error.message, 'error');
      return null;
    }
  };

  const stopSession = async (sessionId) => {
    try {
      const { energyConsumed } = await api.post(`/sessions/${sessionId}/stop`);
      await Promise.all([loadSessions(), loadStations()]);
      addNotification(`Session complete - ${energyConsumed} kWh ✅`, 'success');
    } catch (error) {
      addNotification('Failed to stop session: ' + error.message, 'error');
    }
  };

  return (
    <AppContext.Provider value={{
      isAuthenticated, user, setUser,
      login, register, logout, updateProfile, verifyCode, resendCode,
      stations, setStations,
      notifications, addNotification, removeNotification,
      bookings: NO_BOOKINGS, // temporary shim for the untouched QR scanner, see above
      waitlist, joinWaitlist, leaveWaitlist,
      myReports, submitReport,
      inbox, markInboxRead,
      sessions, activeSession,
      plugIn, startSession, stopSession,
      refresh,
      loading,
      simulatorStatus,
      searchQuery, setSearchQuery,
    }}>
      {children}
    </AppContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAppContext = () => useContext(AppContext);
