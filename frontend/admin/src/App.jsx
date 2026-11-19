import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Chargers from './pages/Chargers';
import Users from './pages/Users';
import Waitlist from './pages/Waitlist';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import OCPP from './pages/OCPP';
import RemoteControl from './pages/RemoteControl';
import Transactions from './pages/Transactions';
import Faults from './pages/Faults';
import Analytics from './pages/Analytics';
import Notifications from './pages/Notifications';
import SimulationControl from './pages/SimulationControl';
import AdminLogin from './pages/AdminLogin';
import { useAdminContext } from './context/AdminContext';
import { Loader2 } from 'lucide-react';

// Placeholder pages for the other sections
const Placeholder = ({ name }) => (
  <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
    <h2 className="text-2xl font-bold mb-2">{name}</h2>
    <p className="text-gray-400 text-center max-w-md">
      This section is currently under development. Stay tuned for real-time monitoring and advanced management features!
    </p>
  </div>
);

function App() {
  const { adminUser, authLoading } = useAdminContext();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }
  if (!adminUser) return <AdminLogin />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="chargers" element={<Chargers />} />
          <Route path="ocpp" element={<OCPP />} />
          <Route path="users" element={<Users />} />
          <Route path="waitlist" element={<Waitlist />} />
          <Route path="reports" element={<Reports />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="faults" element={<Faults />} />
          <Route path="remote" element={<RemoteControl />} />
          <Route path="simulation-control" element={<SimulationControl />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
