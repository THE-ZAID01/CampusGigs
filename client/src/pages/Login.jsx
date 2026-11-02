import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../api/axios.js';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [form, setForm] = useState({ email: loc.state?.email || '', password: '', remember: true });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form.email, form.password, form.remember);
      nav(loc.state?.from && loc.state.from !== '/login' ? loc.state.from : '/dashboard', { replace: true });
    } catch (err) {
      setError(errMsg(err, 'Could not log in'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <form className="auth-card" onSubmit={submit} noValidate>
        <div className="stack-sm">
          <h1>Welcome back</h1>
          <p className="muted">Log in to pick up where you left off.</p>
        </div>
        {loc.state?.justSignedUp && <div className="form-ok">Account created. Log in to get started.</div>}
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="field">
          <label htmlFor="email">College email</label>
          <input id="email" className="input" type="email" autoComplete="email" placeholder="you@ves.ac.in" value={form.email} onChange={set('email')} required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <div className="pw-wrap">
            <input id="password" className="input" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="Your password" value={form.password} onChange={set('password')} required />
            <button type="button" className="pw-toggle" onClick={() => setShow((s) => !s)}>{show ? 'Hide' : 'Show'}</button>
          </div>
        </div>
        <div className="row spread">
          <label className="check"><input type="checkbox" checked={form.remember} onChange={set('remember')} /> Remember me</label>
          <Link to="/forgot-password" className="small">Forgot password?</Link>
        </div>
        <button className="btn btn-primary btn-block" disabled={busy || !form.email || !form.password}>{busy ? 'Logging in…' : 'Log in'}</button>
        <p className="auth-foot">New to CampusGigs? <Link to="/signup">Create an account</Link></p>
      </form>
    </AuthLayout>
  );
}
