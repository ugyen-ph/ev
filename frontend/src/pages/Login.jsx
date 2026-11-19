import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Zap, Mail, Lock, User, ArrowRight, Eye, EyeOff, Loader, Database, KeyRound } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { api } from '../api';

const Login = () => {
  const { login, register } = useAppContext();
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotStep, setForgotStep] = useState('email'); // 'email' -> 'reset'
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setResetCode(tokenParam);
      setForgotStep('reset');
      setShowForgot(true);
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        if (!formData.email || !formData.password) {
          throw new Error('Please fill in all fields');
        }
        const res = await login(formData.email, formData.password);
        if (!res.success) throw new Error(res.error);
      } else {
        if (!formData.name || !formData.email || !formData.password) {
          throw new Error('Please fill in all required fields');
        }
        const res = await register(formData);
        if (!res.success) throw new Error(res.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) { setForgotMessage('Please enter your email'); return; }
    setForgotLoading(true);
    setForgotMessage('');
    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail.trim() });
      setForgotStep('reset');
      if (res.resetToken) {
        // Development mode only: the server returns the code because no email service is connected yet.
        setResetCode(res.resetToken);
        setForgotMessage('✅ Development mode: your reset code was filled in below. Choose a new password.');
      } else {
        setForgotMessage('✅ If an account exists for that email, a reset code has been issued. Enter it below.');
      }
    } catch (err) {
      setForgotMessage('❌ ' + err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetCode.trim() || newPassword.length < 6) {
      setForgotMessage('❌ Enter the reset code and a new password (at least 6 characters)');
      return;
    }
    setForgotLoading(true);
    setForgotMessage('');
    try {
      await api.post('/auth/reset-password', { token: resetCode.trim(), password: newPassword });
      setForgotMessage('✅ Password updated. You can now log in.');
      setFormData(prev => ({ ...prev, email: forgotEmail.trim(), password: '' }));
      setTimeout(() => setShowForgot(false), 1500);
    } catch (err) {
      setForgotMessage('❌ ' + err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-color)',
      position: 'relative',
      overflow: 'hidden',
      padding: '1rem'
    }}>
      {/* Animated background orbs */}
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(57, 255, 20, 0.15) 0%, transparent 70%)',
        top: '-100px',
        right: '-100px',
        animation: 'pulse 4s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute',
        width: '350px',
        height: '350px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0, 255, 170, 0.12) 0%, transparent 70%)',
        bottom: '-80px',
        left: '-80px',
        animation: 'pulse 5s ease-in-out infinite reverse'
      }} />

      <div className="animate-fade-in auth-card" style={{
        display: 'flex',
        width: '100%',
        maxWidth: '1000px',
        minHeight: '600px',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Left Panel – Branding */}
        <div className="auth-left" style={{
          flex: 1,
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1a1040 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '3rem',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 30% 70%, rgba(57, 255, 20, 0.1) 0%, transparent 60%)',
          }} />
          
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <div className="animate-logo" style={{
              background: 'var(--accent-gradient)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '2rem',
              boxShadow: '0 8px 32px rgba(57, 255, 20, 0.3)'
            }}>
              <Zap size={48} color="#080f1e" fill="#080f1e" />
            </div>

            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }} className="animate-text-glow">
              <span className="text-gradient">EV Hub</span>
            </h1>

            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '1.125rem',
              lineHeight: 1.6,
              maxWidth: '300px'
            }}>
              Bhutan's premier electric vehicle charging network. Find, book, and charge – all in one place.
            </p>

            <div style={{
              display: 'flex',
              gap: '1.5rem',
              marginTop: '2rem',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              {[
                { value: '50+', label: 'Stations' },
                { value: '1.2K', label: 'Users' },
                { value: '99.9%', label: 'Uptime' }
              ].map(stat => (
                <div key={stat.label}>
                  <p className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{stat.value}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel – Form */}
        <div className="auth-right" style={{
          flex: 1,
          background: 'var(--bg-secondary)',
          padding: '3rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            {isLogin ? 'Sign in to access your EV Hub dashboard.' : 'Join the EV Hub network today.'}
          </p>

          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--status-offline)',
              marginBottom: '1.5rem',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {!isLogin && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Full Name *
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  padding: '0 1rem',
                  transition: 'border-color 0.3s'
                }}>
                  <User size={18} color="var(--text-secondary)" />
                  <input
                    name="name"
                    type="text"
                    placeholder="Karma Wangchuk"
                    value={formData.name}
                    onChange={handleChange}
                    style={{
                      flex: 1,
                      padding: '0.875rem',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Email *
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                padding: '0 1rem',
                transition: 'border-color 0.3s'
              }}>
                <Mail size={18} color="var(--text-secondary)" />
                <input
                  name="email"
                  type="email"
                  placeholder="karma@example.bt"
                  value={formData.email}
                  onChange={handleChange}
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Password *
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                padding: '0 1rem',
                transition: 'border-color 0.3s'
              }}>
                <Lock size={18} color="var(--text-secondary)" />
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {isLogin && (
                <button
                  type="button"
                  onClick={() => { setShowForgot(true); setForgotMessage(''); setForgotEmail(formData.email); setForgotStep('email'); setResetCode(''); setNewPassword(''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-primary)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginTop: '0.5rem',
                    textAlign: 'right',
                    display: 'block',
                    marginLeft: 'auto'
                  }}
                >
                  Forgot Password?
                </button>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '1rem', fontSize: '1rem', marginTop: '0.5rem' }}
            >
              {loading ? (
                <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <p style={{
            textAlign: 'center',
            marginTop: '2rem',
            color: 'var(--text-secondary)',
            fontSize: '0.875rem'
          }}>
            Don't have an account? {' '}
            <Link
              to="/signup"
              style={{
                color: 'var(--accent-primary)',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div className="glass animate-fade-in" style={{
            width: '100%',
            maxWidth: '420px',
            padding: '2rem',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-secondary)',
            margin: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{
                background: 'rgba(59,130,246,0.1)',
                padding: '0.5rem',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--accent-primary)'
              }}>
                <KeyRound size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Reset Password</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{forgotStep === 'email' ? 'Enter your email to get a reset code' : 'Enter your reset code and a new password'}</p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              padding: '0 1rem',
              marginBottom: '1rem'
            }}>
              <Mail size={18} color="var(--text-secondary)" />
              <input
                type="email"
                placeholder="karma@example.bt"
                value={forgotEmail}
                disabled={forgotStep === 'reset'}
                onChange={(e) => setForgotEmail(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.875rem',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />
            </div>

            {forgotStep === 'reset' && (
              <>
                {[
                  { ph: 'Reset code', val: resetCode, set: setResetCode, type: 'text', Icon: KeyRound },
                  { ph: 'New password (min 6 characters)', val: newPassword, set: setNewPassword, type: 'password', Icon: Lock },
                ].map(({ ph, val, set, type, Icon }) => (
                  <div key={ph} style={{
                    display: 'flex', alignItems: 'center', background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)',
                    padding: '0 1rem', marginBottom: '1rem'
                  }}>
                    <Icon size={18} color="var(--text-secondary)" />
                    <input
                      type={type}
                      placeholder={ph}
                      value={val}
                      onChange={(e) => set(e.target.value)}
                      style={{ flex: 1, padding: '0.875rem', background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none' }}
                    />
                  </div>
                ))}
              </>
            )}

            {forgotMessage && (
              <p style={{
                fontSize: '0.85rem',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: forgotMessage.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${forgotMessage.startsWith('✅') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                color: forgotMessage.startsWith('✅') ? '#10b981' : '#ef4444',
                marginBottom: '1rem',
                fontWeight: 600
              }}>
                {forgotMessage}
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setShowForgot(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={forgotStep === 'email' ? handleForgotPassword : handleResetPassword}
                disabled={forgotLoading}
                className="btn btn-primary"
                style={{ flex: 1, padding: '0.75rem' }}
              >
                {forgotLoading ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : (forgotStep === 'email' ? 'Get Reset Code' : 'Set New Password')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .auth-card {
            flex-direction: column !important;
            min-height: auto !important;
            max-height: 90vh !important;
            overflow-y: auto !important;
          }
          .auth-left, .auth-right {
            padding: 1.5rem !important;
            flex: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
