import React, { useState } from 'react';
import { Zap, Mail, Lock, Loader2, ShieldCheck } from 'lucide-react';
import { useAdminContext } from '../context/AdminContext';

const AdminLogin = () => {
  const { login } = useAdminContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter your email and password'); return; }
    setBusy(true);
    setError('');
    const res = await login(email, password);
    if (!res.success) setError(res.error);
    setBusy(false);
  };

  const inputWrap = 'flex items-center gap-3 bg-bg-primary border border-border rounded-xl px-4 focus-within:ring-2 focus-within:ring-primary/50';
  const input = 'flex-1 bg-transparent py-3 outline-none text-slate-100 placeholder:text-gray-500';

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-bg-secondary border border-border rounded-2xl p-8 shadow-2xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-xl"><Zap size={26} /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">EV Hub Control Center</h1>
            <p className="text-sm text-gray-400 flex items-center gap-1"><ShieldCheck size={14} /> Operator sign in</p>
          </div>
        </div>

        <div className={inputWrap}>
          <Mail size={18} className="text-gray-400" />
          <input
            type="email" autoComplete="username" placeholder="admin@evhub.com" className={input}
            value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }}
          />
        </div>
        <div className={inputWrap}>
          <Lock size={18} className="text-gray-400" />
          <input
            type="password" autoComplete="current-password" placeholder="Password" className={input}
            value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }}
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          type="submit" disabled={busy}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : 'Sign in'}
        </button>
      </form>
    </div>
  );
};

export default AdminLogin;
