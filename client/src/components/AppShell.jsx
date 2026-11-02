import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/axios.js';
import Avatar from './Avatar.jsx';
import Icon, { Coins, Logo } from './Icon.jsx';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: 'home' },
  { to: '/profile', label: 'Profile', icon: 'user' },
  { to: '/wallet', label: 'GigCoins', icon: 'wallet' },
  { to: '/history', label: 'History', icon: 'clock' },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();

  // balance chip refreshes whenever the user moves between pages
  const [balance, setBalance] = useState(user?.balance ?? 0);
  useEffect(() => {
    api.get('/wallet').then((r) => setBalance(r.data.balance)).catch(() => {});
  }, [loc.pathname, loc.key]);

  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const doLogout = () => {
    logout();
    nav('/login');
  };

  return (
    <>
      <header className="topbar">
        <button className={`burger ${open ? 'open' : ''}`} onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="side-drawer">
          <span className="burger-lines"><span /><span /><span /></span>
        </button>
        <Link to="/dashboard" className="row" style={{ gap: 10, color: 'inherit' }}>
          <Logo size={36} /><span className="brand-name">CampusGigs</span>
        </Link>
        <div className="top-actions">
          <Link to="/wallet" className="wallet-chip" aria-label="Open GigCoins wallet">
            <Coins n={balance} /><span className="label-text small muted">GigCoins</span>
          </Link>
          <Link to="/profile" aria-label="Your profile"><Avatar user={user} size={40} /></Link>
        </div>
      </header>

      <div className={`overlay ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />
      <aside id="side-drawer" className={`drawer ${open ? 'open' : ''}`} aria-hidden={!open} inert={!open ? '' : undefined}>
        <div className="drawer-head">
          <span className="row" style={{ gap: 10 }}><Logo size={36} /><span className="brand-name">CampusGigs</span></span>
          <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close menu"><Icon name="x" size={18} /></button>
        </div>
        <Link to="/profile" className="drawer-user">
          <Avatar user={user} size={48} />
          <span className="grow">
            <b style={{ display: 'block' }}>{user?.name}</b>
            <span className="small muted">Level {user?.level} · {user?.xpInLevel}/{user?.xpForNext} XP</span>
          </span>
        </Link>
        <nav className="nav" aria-label="Main">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon name={n.icon} /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="drawer-foot">
          <p className="small muted">Escrow keeps every gig payment safe until the work is approved.</p>
          <button className="btn btn-ghost btn-block" onClick={doLogout}><Icon name="logout" size={18} /> Log out</button>
        </div>
      </aside>

      <main><Outlet context={{ setBalance }} /></main>
    </>
  );
}
