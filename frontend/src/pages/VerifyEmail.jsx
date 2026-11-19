import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Mail, RefreshCw, Zap } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const DIGITS = 6;

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const emailFromUrl = searchParams.get('email') || '';
  const { verifyCode, resendCode, addNotification } = useAppContext();
  const navigate = useNavigate();

  const [digits, setDigits] = useState(Array(DIGITS).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [resendMsg, setResendMsg] = useState('');
  const [countdown, setCountdown] = useState(15 * 60); // 15 min in seconds

  const inputRefs = useRef([]);

  // countdown timer
  useEffect(() => {
    if (success) return;
    const timer = setInterval(() => {
      setCountdown(c => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [success]);

  const formatTime = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleDigitChange = (idx, val) => {
    // Allow only digits
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = digit;
    setDigits(next);
    setError('');

    if (digit && idx < DIGITS - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
    // Auto-submit when all filled
    if (digit && idx === DIGITS - 1) {
      const code = [...next].join('');
      if (code.length === DIGITS) handleSubmit(code);
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace') {
      if (digits[idx]) {
        const next = [...digits];
        next[idx] = '';
        setDigits(next);
      } else if (idx > 0) {
        inputRefs.current[idx - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < DIGITS - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGITS);
    if (!pasted) return;
    const next = Array(DIGITS).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    setError('');
    const focusIdx = Math.min(pasted.length, DIGITS - 1);
    inputRefs.current[focusIdx]?.focus();
    if (pasted.length === DIGITS) handleSubmit(pasted);
  };

  const handleSubmit = async (codeOverride) => {
    const code = codeOverride ?? digits.join('');
    if (code.length !== DIGITS) { setError('Please enter all 6 digits.'); return; }
    if (!emailFromUrl) { setError('Email address is missing. Please sign up again.'); return; }
    setLoading(true);
    setError('');
    const result = await verifyCode(emailFromUrl, code);
    setLoading(false);
    if (result.success) {
      setSuccess(true);
      addNotification('Email verified! Welcome to EV Hub ⚡', 'success');
      setTimeout(() => navigate('/'), 1800);
    } else {
      setError(result.error || 'Invalid or expired code.');
      setDigits(Array(DIGITS).fill(''));
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (!emailFromUrl) return;
    setResending(true);
    setResendMsg('');
    setError('');
    const result = await resendCode(emailFromUrl);
    setResending(false);
    if (result.success) {
      setResendMsg('A new code has been sent!');
      setCountdown(15 * 60);
      setDigits(Array(DIGITS).fill(''));
      inputRefs.current[0]?.focus();
    } else {
      setError(result.error || 'Failed to resend code.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-color)',
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background orbs */}
      <div style={{
        position: 'absolute', width: '400px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
        top: '-100px', right: '-100px',
      }} />
      <div style={{
        position: 'absolute', width: '300px', height: '300px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)',
        bottom: '-80px', left: '-80px',
      }} />

      <div className="animate-fade-in" style={{
        width: '100%',
        maxWidth: '480px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '2.5rem',
        textAlign: 'center',
        boxShadow: 'var(--shadow-lg)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo / icon */}
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          margin: '0 auto 1.5rem auto',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: success ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.12)',
          color: success ? '#22c55e' : 'var(--accent-primary)',
        }}>
          {success ? <CheckCircle2 size={36} /> : loading ? <Loader2 size={32} className="animate-spin" /> : <Mail size={34} />}
        </div>

        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
          {success ? 'Verified! 🎉' : 'Check your email'}
        </h2>

        {!success && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '0.5rem' }}>
            We sent a 6-digit code to
          </p>
        )}
        {!success && emailFromUrl && (
          <p style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '1.75rem' }}>
            {emailFromUrl}
          </p>
        )}
        {!success && !emailFromUrl && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
            Please sign up first.{' '}
            <Link to="/signup" style={{ color: 'var(--accent-primary)' }}>Go to Sign Up</Link>
          </p>
        )}

        {success ? (
          <div>
            <p style={{ color: '#22c55e', fontSize: '1rem', marginBottom: '1.5rem' }}>
              Your email is verified. Redirecting you to the app…
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/')} style={{ width: '100%', padding: '0.9rem' }}>
              Go to Dashboard
            </button>
          </div>
        ) : (
          <>
            {/* OTP digit inputs */}
            <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'center', marginBottom: '1.25rem' }}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={el => inputRefs.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleDigitChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  onPaste={i === 0 ? handlePaste : undefined}
                  style={{
                    width: '52px',
                    height: '62px',
                    textAlign: 'center',
                    fontSize: '1.6rem',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    background: 'var(--bg-tertiary)',
                    border: `2px solid ${error ? '#ef4444' : d ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    boxShadow: d ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none',
                  }}
                />
              ))}
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '0.6rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#ef4444',
                fontSize: '0.85rem',
                marginBottom: '1rem',
              }}>
                {error}
              </div>
            )}

            {/* Resend success */}
            {resendMsg && (
              <div style={{
                padding: '0.6rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.3)',
                color: '#22c55e',
                fontSize: '0.85rem',
                marginBottom: '1rem',
              }}>
                {resendMsg}
              </div>
            )}

            {/* Verify button */}
            <button
              onClick={() => handleSubmit()}
              disabled={loading || digits.join('').length !== DIGITS}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', marginBottom: '1rem' }}
            >
              {loading ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }} />Verifying…</> : 'Verify Code'}
            </button>

            {/* Timer + resend */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <span style={{ color: countdown > 0 ? 'var(--text-secondary)' : '#ef4444', fontSize: '0.8125rem' }}>
                {countdown > 0 ? `Code expires in ${formatTime(countdown)}` : 'Code expired'}
              </span>
              <button
                onClick={handleResend}
                disabled={resending}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--accent-primary)', fontSize: '0.8125rem',
                  fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px',
                }}
              >
                {resending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
                Resend Code
              </button>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <Link to="/login" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>
                ← Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input[type="text"]:focus { border-color: var(--accent-primary) !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.2) !important; }
      `}</style>
    </div>
  );
};

export default VerifyEmail;
