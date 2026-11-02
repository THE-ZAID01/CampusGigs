import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import GigCard from '../components/GigCard.jsx';
import PostGigModal from '../components/PostGigModal.jsx';
import TrustCard from '../components/TrustCard.jsx';
import Spinner from '../components/Spinner.jsx';
import Icon, { Coins } from '../components/Icon.jsx';
import StatusPill from '../components/StatusPill.jsx';

const FALLBACK_CATS = ['Design', 'Development', 'Writing', 'Tutoring', 'Video & Photo', 'Marketing', 'Data & Research', 'Errands', 'Other'];

export default function Dashboard() {
  const { user, stats, refresh } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [tab, setTab] = useState('explore');
  const [meta, setMeta] = useState({ categories: FALLBACK_CATS });
  const [wallet, setWallet] = useState(null);
  const [showPost, setShowPost] = useState(false);

  const [q, setQ] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('newest');
  const [explore, setExplore] = useState(null);
  const [posted, setPosted] = useState(null);
  const [working, setWorking] = useState(null);
  const [bids, setBids] = useState(null);

  const loadExplore = useCallback(async () => {
    try {
      const { data } = await api.get('/gigs', { params: { scope: 'explore', q: q || undefined, category, sort } });
      setExplore(data.gigs);
    } catch (e) { toast.error(errMsg(e)); setExplore([]); }
  }, [q, category, sort, toast]);

  const loadMine = useCallback(async () => {
    try {
      const [p, w, b] = await Promise.all([
        api.get('/gigs', { params: { scope: 'posted' } }),
        api.get('/gigs', { params: { scope: 'working' } }),
        api.get('/bids/mine'),
      ]);
      setPosted(p.data.gigs);
      setWorking(w.data.gigs);
      setBids(b.data.bids);
    } catch (e) { toast.error(errMsg(e)); }
  }, [toast]);

  useEffect(() => {
    api.get('/meta').then((r) => setMeta(r.data)).catch(() => {});
    api.get('/wallet').then((r) => setWallet(r.data)).catch(() => {});
    loadMine();
  }, [loadMine]);

  useEffect(() => {
    const t = setTimeout(loadExplore, 250); // debounce typing
    return () => clearTimeout(t);
  }, [loadExplore]);

  const onCreated = async ({ gig, xpGained }) => {
    setShowPost(false);
    toast.success(`Gig posted. +${xpGained} XP`);
    await Promise.all([loadMine(), loadExplore(), refresh()]);
    setTab('posted');
    nav(`/gigs/${gig.id}`);
  };

  const pendingBids = useMemo(() => (bids || []).filter((b) => b.status === 'pending' || b.status === 'rejected'), [bids]);
  const needsMe = useMemo(
    () => (posted || []).filter((g) => g.status === 'delivered' || (g.status === 'open' && g.bidCount > 0)).length,
    [posted]
  );
  const first = user?.name?.split(' ')[0];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Hey {first}, what's the gig today?</h1>
          <p>Find work to bid on, or post something you need done.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowPost(true)}><Icon name="plus" size={18} /> Post a gig</button>
      </div>

      <div className="dash">
        <section className="stack" aria-label="Gigs">
          <div className="tabs" role="tablist">
            {[
              ['explore', 'Explore gigs', explore?.length],
              ['posted', 'Posted by me', posted?.length],
              ['work', 'My work & bids', (working?.length || 0) + pendingBids.length],
            ].map(([key, label, count]) => (
              <button key={key} role="tab" aria-selected={tab === key} className={`tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
                {label}{count > 0 && <span className="count">{count}</span>}
              </button>
            ))}
          </div>

          {tab === 'explore' && (
            <>
              <div className="toolbar">
                <div className="search">
                  <Icon name="search" size={18} />
                  <input className="input" placeholder="Search gigs, e.g. logo, React, notes" aria-label="Search gigs" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
                <select className="select" style={{ width: 'auto' }} aria-label="Sort gigs" value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="newest">Newest first</option>
                  <option value="budget_high">Highest budget</option>
                  <option value="budget_low">Lowest budget</option>
                  <option value="deadline">Nearest deadline</option>
                </select>
              </div>
              <div className="cats">
                {['All', ...meta.categories].map((c) => (
                  <button key={c} className={`cat ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
                ))}
              </div>
              {explore === null ? <Spinner /> : explore.length === 0 ? (
                <div className="empty">
                  <h3>No gigs match that</h3>
                  <p className="muted">Try another keyword or category, or post the gig yourself.</p>
                  <button className="btn btn-primary" onClick={() => setShowPost(true)}>Post a gig</button>
                </div>
              ) : (
                <div className="gig-grid">{explore.map((g) => <GigCard key={g.id} gig={g} meId={user.id} />)}</div>
              )}
            </>
          )}

          {tab === 'posted' && (
            posted === null ? <Spinner /> : posted.length === 0 ? (
              <div className="empty">
                <h3>You haven't posted a gig yet</h3>
                <p className="muted">Describe what you need and set a budget. Students will send you bids.</p>
                <button className="btn btn-primary" onClick={() => setShowPost(true)}>Post your first gig</button>
              </div>
            ) : (
              <div className="gig-grid">{posted.map((g) => <GigCard key={g.id} gig={g} meId={user.id} />)}</div>
            )
          )}

          {tab === 'work' && (
            working === null || bids === null ? <Spinner /> : (
              <div className="stack">
                <h2>Working on now</h2>
                {working.length === 0 ? (
                  <div className="empty"><p className="muted">No active gigs. Win a bid and it will show up here with its escrow status.</p></div>
                ) : (
                  <div className="gig-grid">{working.map((g) => <GigCard key={g.id} gig={g} meId={user.id} />)}</div>
                )}
                <h2>Your bids</h2>
                {bids.length === 0 ? (
                  <div className="empty">
                    <p className="muted">You haven't bid on anything yet.</p>
                    <button className="btn btn-primary" onClick={() => setTab('explore')}>Explore gigs</button>
                  </div>
                ) : (
                  <div className="stack-sm">
                    {bids.map((b) => (
                      <Link key={b.id} to={`/gigs/${b.gigId}`} className="hist-item" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
                        <span className="stack-sm">
                          <b>{b.gig.title}</b>
                          <span className="small muted">by {b.gig.posterName} · budget {b.gig.budget} GigCoins</span>
                        </span>
                        <span className="row" style={{ gap: 12 }}>
                          <Coins n={b.amount} /><StatusPill status={b.status} />
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          )}
        </section>

        <aside className="aside" aria-label="Your summary">
          <Link to="/profile" style={{ color: 'inherit' }} aria-label="Open your profile">
            <TrustCard user={user} stats={stats} compact />
          </Link>
          <div className="card stack-sm">
            <div className="row spread">
              <b>Your wallet</b>
              <Link to="/wallet" className="small">Manage</Link>
            </div>
            <div style={{ fontSize: '1.8rem' }}><Coins n={wallet?.balance ?? user?.balance} size={26} /></div>
            <div className="row small muted spread">
              <span>In escrow (you pay)</span><b style={{ color: 'var(--ink)' }}>{wallet?.lockedInEscrow ?? 0}</b>
            </div>
            <div className="row small muted spread">
              <span>Incoming on active gigs</span><b style={{ color: 'var(--ink)' }}>{wallet?.incomingInEscrow ?? 0}</b>
            </div>
          </div>
          {needsMe > 0 && (
            <button className="card-flat" style={{ textAlign: 'left', borderColor: 'var(--peach)', background: 'var(--peach-soft)', fontWeight: 700 }} onClick={() => setTab('posted')}>
              {needsMe} of your gigs need a decision
            </button>
          )}
        </aside>
      </div>

      {showPost && <PostGigModal categories={meta.categories} onClose={() => setShowPost(false)} onCreated={onCreated} />}
    </div>
  );
}
