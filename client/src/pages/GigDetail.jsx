import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errMsg } from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Avatar from '../components/Avatar.jsx';
import Icon, { Coins } from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import Spinner from '../components/Spinner.jsx';
import StatusPill from '../components/StatusPill.jsx';
import StatusStepper from '../components/StatusStepper.jsx';
import { ago, dateShort, dateTime, daysLeft } from '../utils/format.js';

function Person({ u, label }) {
  return (
    <Link to={`/u/${u.id}`} className="row" style={{ color: 'inherit', gap: 12 }}>
      <Avatar user={u} size={44} />
      <span>
        <b style={{ display: 'block' }}>{u.name}</b>
        <span className="small muted">{label ? `${label} · ` : ''}Level {u.level} · {u.title}</span>
      </span>
    </Link>
  );
}

export default function GigDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [gig, setGig] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [missing, setMissing] = useState(false);
  const [modal, setModal] = useState(null); // {type, bid?}
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const [bidForm, setBidForm] = useState({ amount: '', deliveryDays: '', message: '' });

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/gigs/${id}`);
      setGig(data.gig);
      if (data.gig.myBid) {
        setBidForm({ amount: String(data.gig.myBid.amount), deliveryDays: data.gig.myBid.deliveryDays || '', message: data.gig.myBid.message || '' });
      }
    } catch (e) {
      if (e.response?.status === 404) setMissing(true);
      else toast.error(errMsg(e));
    }
    api.get('/wallet').then((r) => setWallet(r.data)).catch(() => {});
  }, [id, toast]);

  useEffect(() => { setGig(null); load(); }, [load]);

  if (missing) return <div className="page"><div className="empty"><h2>Gig not found</h2><Link className="btn btn-primary" to="/dashboard">Back to dashboard</Link></div></div>;
  if (!gig) return <Spinner />;

  const role = gig.viewerRole;
  const left = daysLeft(gig.deadline);

  const run = async (fn, okMsg) => {
    setBusy(true);
    try {
      const res = await fn();
      if (okMsg) toast.success(typeof okMsg === 'function' ? okMsg(res.data) : okMsg);
      setModal(null);
      setText('');
      await Promise.all([load(), refresh()]);
    } catch (e) {
      toast.error(errMsg(e));
      if (e.response?.data?.code === 'INSUFFICIENT_FUNDS') load();
    } finally {
      setBusy(false);
    }
  };

  const placeBid = (e) => {
    e.preventDefault();
    run(() => api.post(`/gigs/${gig.id}/bids`, { ...bidForm, amount: Number(bidForm.amount) }), 'Bid saved');
  };
  const withdrawBid = () => run(() => api.delete(`/bids/${gig.myBid.id}`), 'Bid withdrawn');
  const acceptBid = (bid) => run(() => api.post(`/bids/${bid.id}/accept`), (d) => d.message);
  const deliver = () => run(() => api.post(`/gigs/${gig.id}/deliver`, { note: text }), 'Work delivered');
  const revision = () => run(() => api.post(`/gigs/${gig.id}/revision`, { note: text }), 'Revision requested');
  const confirm = () => run(() => api.post(`/gigs/${gig.id}/confirm`), (d) => `${d.released} GigCoins released. +${d.xp.poster} XP`);
  const leave = () => run(() => api.post(`/gigs/${gig.id}/leave`), 'You left the gig');
  const cancel = async () => {
    setBusy(true);
    try {
      await api.delete(`/gigs/${gig.id}`);
      toast.success('Gig cancelled');
      nav('/dashboard');
    } catch (e) { toast.error(errMsg(e)); setBusy(false); }
  };

  const lowest = gig.bids?.length ? Math.min(...gig.bids.filter((b) => b.status === 'pending').map((b) => b.amount)) : null;
  const balance = wallet?.balance ?? 0;

  return (
    <div className="page">
      <div><Link to="/dashboard" className="row small" style={{ gap: 6 }}><Icon name="back" size={16} /> Back to dashboard</Link></div>

      <div className="detail">
        <div className="stack">
          <section className="card stack">
            <div className="row spread wrap">
              <div className="row wrap" style={{ gap: 8 }}><span className="chip">{gig.category}</span><StatusPill status={gig.status} /></div>
              <span className="small muted">Posted {ago(gig.createdAt)}</span>
            </div>
            <h1>{gig.title}</h1>
            {gig.imageUrl && <img src={gig.imageUrl} alt="" className="gig-img" />}
            <p style={{ whiteSpace: 'pre-wrap', color: '#39426a' }}>{gig.description}</p>
            <div className="row wrap" style={{ gap: 24 }}>
              <div><span className="small muted">Budget</span><div className="big-amount"><Coins n={gig.budget} size={30} /></div></div>
              {gig.deadline && (
                <div>
                  <span className="small muted">Deadline</span>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{dateShort(gig.deadline)}</div>
                  {gig.status === 'open' && left !== null && <span className="small muted">{left < 0 ? 'Past deadline' : left === 0 ? 'Due today' : `${left} days left`}</span>}
                </div>
              )}
            </div>
            <div className="row wrap" style={{ gap: 28, paddingTop: 14, borderTop: '1.5px dashed var(--line)' }}>
              <Person u={gig.poster} label="Owner" />
              {gig.worker && <Person u={gig.worker} label="Freelancer" />}
            </div>
          </section>

          {gig.status !== 'cancelled' && (
            <section className="card stack">
              <div className="card-title" style={{ marginBottom: 0 }}><h2>Escrow progress</h2></div>
              <StatusStepper status={gig.status} />
              {gig.escrowAmount > 0 && gig.status !== 'completed' && (
                <div className="escrow-box">
                  <span className="vault"><Icon name="lock" size={24} /></span>
                  <div>
                    <b><Coins n={gig.escrowAmount} /> held in escrow</b>
                    <p className="small muted">Locked from the owner's wallet. It's released only when the owner approves the work, and refunded if the freelancer leaves.</p>
                  </div>
                </div>
              )}
              {gig.status === 'completed' && (
                <div className="escrow-box">
                  <span className="vault"><Icon name="check" size={24} /></span>
                  <div>
                    <b><Coins n={gig.escrowAmount - gig.feeAmount} /> paid to {gig.worker?.name}</b>
                    <p className="small muted">Completed {dateTime(gig.completedAt)}{gig.feeAmount ? ` · platform fee ${gig.feeAmount}` : ''}</p>
                  </div>
                </div>
              )}
            </section>
          )}

          {(gig.deliveryNote || gig.revisionNote) && (
            <section className="card stack">
              <h2>Delivery notes</h2>
              {gig.revisionNote && <div><b className="small">Revision requested</b><div className="quote">{gig.revisionNote}</div></div>}
              {gig.deliveryNote && <div><b className="small">Freelancer's delivery {gig.deliveredAt ? `· ${dateTime(gig.deliveredAt)}` : ''}</b><div className="quote">{gig.deliveryNote}</div></div>}
            </section>
          )}

          {role === 'poster' && gig.status === 'open' && (
            <section className="card stack">
              <div className="card-title" style={{ marginBottom: 0 }}><h2>Bids ({gig.bids.filter((b) => b.status === 'pending').length})</h2><span className="small muted">Lowest first</span></div>
              {gig.bids.length === 0 && <div className="empty"><p className="muted">No bids yet. Students will see this gig on the dashboard.</p></div>}
              {gig.bids.map((b) => (
                <div key={b.id} className={`bid-row ${b.status === 'pending' && b.amount === lowest ? 'best' : ''}`}>
                  <Person u={b.bidder} />
                  <div className="grow" style={{ minWidth: 180 }}>
                    <div className="row wrap" style={{ gap: 10 }}>
                      <span style={{ fontSize: '1.2rem' }}><Coins n={b.amount} /></span>
                      {b.status === 'pending' && b.amount === lowest && <span className="pill completed">Lowest bid</span>}
                      {b.status !== 'pending' && <StatusPill status={b.status} />}
                    </div>
                    <span className="small muted">{b.deliveryDays ? `${b.deliveryDays} day delivery · ` : ''}{b.bidderCompleted} gigs completed</span>
                    {b.message && <div className="quote" style={{ marginTop: 8 }}>{b.message}</div>}
                  </div>
                  {b.status === 'pending' && <button className="btn btn-primary btn-sm" onClick={() => setModal({ type: 'accept', bid: b })}>Accept and hold</button>}
                </div>
              ))}
            </section>
          )}
        </div>

        <aside className="stack" style={{ position: 'sticky', top: 88 }}>
          {role === 'visitor' && gig.status === 'open' && (
            <form className="card stack" onSubmit={placeBid}>
              <h2>{gig.myBid ? 'Your bid' : 'Place a bid'}</h2>
              {gig.myBid && <div className="row spread"><StatusPill status={gig.myBid.status} /><span className="small muted">You can change it until it's accepted</span></div>}
              <div className="field">
                <label htmlFor="amt">Your price (max {gig.budget})</label>
                <input id="amt" className="input" type="number" min="1" max={gig.budget} value={bidForm.amount} onChange={(e) => setBidForm({ ...bidForm, amount: e.target.value })} placeholder={String(Math.round(gig.budget * 0.9))} required />
              </div>
              <div className="field">
                <label htmlFor="days">Days to deliver</label>
                <input id="days" className="input" type="number" min="1" max="365" value={bidForm.deliveryDays} onChange={(e) => setBidForm({ ...bidForm, deliveryDays: e.target.value })} placeholder="3" />
              </div>
              <div className="field">
                <label htmlFor="msg">Why you?</label>
                <textarea id="msg" className="textarea" style={{ minHeight: 90 }} maxLength={500} value={bidForm.message} onChange={(e) => setBidForm({ ...bidForm, message: e.target.value })} placeholder="Share relevant experience or a quick plan." />
              </div>
              <button className="btn btn-primary" disabled={busy || !bidForm.amount}>{gig.myBid ? 'Update bid' : 'Send bid'}</button>
              {gig.myBid?.status === 'pending' && <button type="button" className="btn btn-ghost" onClick={withdrawBid} disabled={busy}>Withdraw bid</button>}
              <p className="hint">If the owner picks your bid, the coins are locked in escrow before you start, so you know the payment is real.</p>
            </form>
          )}
          {role === 'visitor' && gig.status !== 'open' && (
            <div className="card"><p className="muted">This gig is {gig.status.replace('_', ' ')} and no longer takes bids.</p></div>
          )}

          {role === 'poster' && gig.status === 'open' && (
            <div className="card stack">
              <h2>Your wallet</h2>
              <div style={{ fontSize: '1.6rem' }}><Coins n={balance} size={26} /></div>
              <p className="small muted">Accepting a bid moves exactly that amount into escrow. Bids lower than your budget save you coins.</p>
              <Link to="/wallet" className="btn btn-soft">Add GigCoins</Link>
              <button className="btn btn-danger" onClick={() => setModal({ type: 'cancel' })}>Cancel this gig</button>
            </div>
          )}

          {role === 'poster' && gig.status === 'in_progress' && (
            <div className="card stack"><h2>Waiting for delivery</h2><p className="muted">{gig.worker?.name} is working on this. Your {gig.escrowAmount} GigCoins stay locked until you approve the result.</p></div>
          )}
          {role === 'poster' && gig.status === 'delivered' && (
            <div className="card stack">
              <h2>Review the delivery</h2>
              <p className="muted">Happy with the work? Release the payment. Otherwise send it back with notes.</p>
              <button className="btn btn-mint" onClick={() => setModal({ type: 'confirm' })} disabled={busy}><Icon name="check" size={18} /> Release {gig.escrowAmount} GigCoins</button>
              <button className="btn btn-ghost" onClick={() => setModal({ type: 'revision' })} disabled={busy}>Ask for changes</button>
            </div>
          )}

          {role === 'worker' && gig.status === 'in_progress' && (
            <div className="card stack">
              <h2>Your turn</h2>
              <p className="muted">The owner's <b>{gig.escrowAmount} GigCoins</b> are locked in escrow. Finish the work, then mark it delivered.</p>
              <button className="btn btn-primary" onClick={() => setModal({ type: 'deliver' })}><Icon name="upload" size={18} /> Mark as delivered</button>
              <button className="btn btn-ghost" onClick={() => setModal({ type: 'leave' })}>Leave this gig</button>
            </div>
          )}
          {role === 'worker' && gig.status === 'delivered' && (
            <div className="card stack">
              <h2>Waiting for approval</h2>
              <p className="muted">The owner is reviewing your work. As soon as they confirm, the payment lands in your wallet.</p>
              <button className="btn btn-ghost" onClick={() => setModal({ type: 'leave' })}>Leave this gig</button>
            </div>
          )}
          {gig.status === 'completed' && role !== 'visitor' && (
            <div className="card stack"><h2>All done</h2><p className="muted">This gig is complete and the payment is settled.</p><Link className="btn btn-soft" to="/history">See history</Link></div>
          )}
          {gig.status === 'cancelled' && <div className="card"><p className="muted">This gig was cancelled by its owner.</p></div>}

          {gig.ledger?.length > 0 && (
            <div className="card ledger">
              <h3>Escrow ledger</h3>
              {gig.ledger.map((t) => (
                <div key={t.id} className="ledger-row">
                  <span>{t.label}<br /><span className="small muted">{dateTime(t.created_at)} · {t.reference}</span></span>
                  <b className={t.user_id === user.id ? (t.amount > 0 ? 'amt-in' : 'amt-out') : 'muted'}>{t.amount > 0 ? '+' : ''}{t.amount}</b>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      {modal?.type === 'accept' && (
        <Modal title="Hold coins in escrow?" onClose={() => setModal(null)}>
          <div className="stack">
            <p>You're choosing <b>{modal.bid.bidder.name}</b> for <b>{modal.bid.amount} GigCoins</b>. That amount moves from your wallet into escrow now. The other bids are declined.</p>
            <div className="card-flat stack-sm">
              <div className="row spread"><span>Your balance</span><Coins n={balance} /></div>
              <div className="row spread"><span>Held in escrow</span><b>− {modal.bid.amount}</b></div>
              <div className="row spread" style={{ borderTop: '1.5px dashed var(--line)', paddingTop: 8 }}><span>Left after holding</span><Coins n={balance - modal.bid.amount} /></div>
              {gig.budget > modal.bid.amount && <p className="small" style={{ color: '#0d6a50' }}>You save {gig.budget - modal.bid.amount} GigCoins versus your budget.</p>}
            </div>
            {balance < modal.bid.amount ? (
              <>
                <div className="form-error">You need {modal.bid.amount - balance} more GigCoins to accept this bid.</div>
                <Link to="/wallet" className="btn btn-primary">Add GigCoins</Link>
              </>
            ) : (
              <button className="btn btn-primary" disabled={busy} onClick={() => acceptBid(modal.bid)}>{busy ? 'Holding…' : `Hold ${modal.bid.amount} GigCoins`}</button>
            )}
          </div>
        </Modal>
      )}
      {modal?.type === 'deliver' && (
        <Modal title="Deliver your work" onClose={() => setModal(null)}>
          <div className="stack">
            <div className="field">
              <label htmlFor="dn">Delivery note or link</label>
              <textarea id="dn" className="textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste your Drive link and explain what's included." />
            </div>
            <button className="btn btn-primary" disabled={busy || text.trim().length < 5} onClick={deliver}>Send delivery</button>
          </div>
        </Modal>
      )}
      {modal?.type === 'revision' && (
        <Modal title="Ask for changes" onClose={() => setModal(null)}>
          <div className="stack">
            <div className="field">
              <label htmlFor="rn">What should change?</label>
              <textarea id="rn" className="textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="Be specific so the freelancer can fix it in one go." />
            </div>
            <p className="hint">Your coins stay locked in escrow while the freelancer revises.</p>
            <button className="btn btn-primary" disabled={busy || text.trim().length < 5} onClick={revision}>Send back</button>
          </div>
        </Modal>
      )}
      {modal?.type === 'confirm' && (
        <Modal title="Release payment?" onClose={() => setModal(null)}>
          <div className="stack">
            <p>This sends <b>{gig.escrowAmount} GigCoins</b> from escrow to <b>{gig.worker?.name}</b> and can't be undone.</p>
            <button className="btn btn-mint" disabled={busy} onClick={confirm}>{busy ? 'Releasing…' : 'Yes, release payment'}</button>
          </div>
        </Modal>
      )}
      {modal?.type === 'leave' && (
        <Modal title="Leave this gig?" onClose={() => setModal(null)}>
          <div className="stack">
            <p>The owner gets their {gig.escrowAmount} GigCoins back and the gig reopens for other bids.</p>
            <button className="btn btn-danger" disabled={busy} onClick={leave}>Leave gig</button>
          </div>
        </Modal>
      )}
      {modal?.type === 'cancel' && (
        <Modal title="Cancel this gig?" onClose={() => setModal(null)}>
          <div className="stack">
            <p>Pending bids will be declined. You can always post it again later.</p>
            <button className="btn btn-danger" disabled={busy} onClick={cancel}>Cancel gig</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
