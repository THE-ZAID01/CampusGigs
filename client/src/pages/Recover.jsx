import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import api, { errMsg } from '../api/axios.js';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data } = await api.post('/auth/forgot', { email });
      setResult(data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <form className="auth-card" onSubmit={submit}>
        <div className="stack-sm">
          <h1>Reset your password</h1>
          <p className="muted">Enter your college email and we'll create a reset link.</p>
        </div>
        {error && <div className="form-error">{error}</div>}
        {result && (
          <div className="form-ok">
            {result.message}
            {result.demoResetLink && (
              <p className="small" style={{ marginTop: 8 }}>
                Demo mode (no email server): <a href={result.demoResetLink}>open your reset link</a>
              </p>
            )}
          </div>
        )}
        <div className="field">
          <label htmlFor="e">College email</label>
          <input id="e" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@ves.ac.in" required />
        </div>
        <button className="btn btn-primary btn-block" disabled={busy || !email}>{busy ? 'Creating link…' : 'Create reset link'}</button>
        <p className="auth-foot"><Link to="/login">Back to log in</Link></p>
      </form>
    </AuthLayout>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/auth/reset', { token: params.get('token'), password });
      nav('/login');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <form className="auth-card" onSubmit={submit}>
        <div className="stack-sm"><h1>Choose a new password</h1><p className="muted">Pick something you haven't used before.</p></div>
        {error && <div className="form-error">{error}</div>}
        <div className="field">
          <label htmlFor="np">New password</label>
          <input id="np" className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6+ characters" required />
        </div>
        <button className="btn btn-primary btn-block" disabled={busy || password.length < 6}>{busy ? 'Saving…' : 'Save password'}</button>
        <p className="auth-foot"><Link to="/login">Back to log in</Link></p>
      </form>
    </AuthLayout>
  );
}
