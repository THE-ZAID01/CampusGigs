import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import api, { errMsg } from '../api/axios.js';

export default function Signup() {
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [domains, setDomains] = useState(['ves.ac.in']);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    api.get('/meta').then((r) => setDomains(r.data.allowedDomains)).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    setBusy(true);
    try {
      await api.post('/auth/register', { name: form.name, email: form.email, password: form.password });
      nav('/login', { state: { email: form.email, justSignedUp: true } });
    } catch (err) {
      setError(errMsg(err, 'Could not create your account'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <form className="auth-card" onSubmit={submit} noValidate>
        <div className="stack-sm">
          <h1>Create your account</h1>
          <p className="muted">Use your college email so classmates can trust your profile.</p>
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="field">
          <label htmlFor="name">Full name</label>
          <input id="name" className="input" autoComplete="name" value={form.name} onChange={set('name')} placeholder="Aarav Sharma" required />
        </div>
        <div className="field">
          <label htmlFor="email">College email</label>
          <input id="email" className="input" type="email" autoComplete="email" value={form.email} onChange={set('email')} placeholder={`you@${domains[0]}`} required />
          <span className="hint">Allowed: {domains.map((d) => `@${d}`).join(', ')}</span>
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="pw">Password</label>
            <input id="pw" className="input" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} placeholder="6+ characters" required />
          </div>
          <div className="field">
            <label htmlFor="pw2">Confirm</label>
            <input id="pw2" className="input" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} placeholder="Repeat it" required />
          </div>
        </div>
        <button className="btn btn-primary btn-block" disabled={busy || !form.name || !form.email || !form.password}>{busy ? 'Creating…' : 'Sign up'}</button>
        <p className="auth-foot">Already have an account? <Link to="/login">Log in</Link></p>
      </form>
    </AuthLayout>
  );
}
