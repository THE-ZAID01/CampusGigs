import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import BarChart from '../components/BarChart.jsx';
import Icon, { Coin, Coins } from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import Spinner from '../components/Spinner.jsx';
import { ago } from '../utils/format.js';

const TX_STYLE = {
  topup: { icon: 'down', cls: 'in' },
  bonus: { icon: 'bolt', cls: 'in' },
  escrow_release: { icon: 'check', cls: 'in' },
  refund: { icon: 'refresh', cls: 'in' },
  escrow_hold: { icon: 'lock', cls: 'lock' },
  withdrawal: { icon: 'upload', cls: 'out' },
};
const TX_NAME = { topup: 'Added', bonus: 'Bonus', escrow_release: 'Earned', refund: 'Refund', escrow_hold: 'Held in escrow', withdrawal: 'Withdrawn' };

export default function Wallet() {
  const { refresh } = useAuth();
  const toast = useToast();
  const [w, setW] = useState(null);
  const [an, setAn] = useState(null);
  const [txs, setTxs] = useState(null);
  const [range, setRange] = useState('day');
  const [modal, setModal] = useState(null);
  const [amount, setAmount] = useState('');
  const [upi, setUpi] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [a, b, c] = await Promise.all([api.get('/wallet'), api.get('/wallet/analytics'), api.get('/wallet/transactions', { params: { limit: 30 } })]);
      setW(a.data); setAn(b.data); setTxs(c.data.transactions);
      setUpi((u) => u || a.data.upiId);
    } catch (e) { toast.error(errMsg(e)); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  if (!w || !an || !txs) return <Spinner />;

  const open = (type) => { setModal(type); setAmount(''); setError(''); };
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data } = modal === 'topup'
        ? await api.post('/wallet/topup', { amount: Number(amount) })
        : await api.post('/wallet/withdraw', { amount: Number(amount), upiId: upi });
      toast.success(data.message);
      setModal(null);
      await Promise.all([load(), refresh()]);
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  const series = an[range];
  const rangeTotals = series.reduce((a, d) => ({ earned: a.earned + d.earned, spent: a.spent + d.spent }), { earned: 0, spent: 0 });
  const RANGE_LABEL = { day: 'last 14 days', week: 'last 8 weeks', month: 'last 6 months' };

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>GigCoins</h1><p>Your wallet, escrow and earnings. 1 GigCoin = ₹1.</p></div>
      </div>

      <section className="wallet-hero" aria-label="Wallet balance">
        <div className="stack-sm">
          <span style={{ fontWeight: 600, opacity: 0.9 }}>Available balance</span>
          <div className="balance row" style={{ gap: 14 }}><Coin size={44} />{w.balance.toLocaleString('en-IN')}</div>
        </div>
        <div className="hero-sub">
          <div>In escrow (you pay)<b>{w.lockedInEscrow}</b></div>
          <div>Incoming on active gigs<b>{w.incomingInEscrow}</b></div>
          <div>Withdrawn so far<b>{w.withdrawnTotal}</b></div>
        </div>
        <div className="row wrap">
          <button className="btn btn-white" onClick={() => open('topup')}><Icon name="plus" size={18} /> Add coins</button>
          <button className="btn btn-outline-white" onClick={() => open('withdraw')}><Icon name="upload" size={18} /> Withdraw to UPI</button>
        </div>
      </section>

      <section className="kpis" aria-label="Earnings">
        <div className="kpi"><span>Earned today</span><b>{w.earned.today}</b></div>
        <div className="kpi"><span>Earned this week</span><b>{w.earned.week}</b></div>
        <div className="kpi"><span>Earned this month</span><b>{w.earned.month}</b></div>
        <div className="kpi"><span>Average per gig</span><b>{w.avgPerGig}</b></div>
      </section>

      <div className="wallet-cols">
        <section className="card stack">
          <div className="card-title" style={{ marginBottom: 0 }}>
            <h2>Earnings and spending</h2>
            <div className="tabs" role="tablist" style={{ boxShadow: 'none', background: '#f0f2fa' }}>
              {[['day', 'Daily'], ['week', 'Weekly'], ['month', 'Monthly']].map(([k, l]) => (
                <button key={k} role="tab" aria-selected={range === k} className={`tab ${range === k ? 'active' : ''}`} style={{ padding: '7px 14px' }} onClick={() => setRange(k)}>{l}</button>
              ))}
            </div>
          </div>
          <div className="row spread wrap">
            <div className="legend"><span><i style={{ background: '#1fb88d' }} />Earned</span><span><i style={{ background: '#7a89ff' }} />Spent on gigs</span></div>
            <span className="small muted">{RANGE_LABEL[range]}: earned <b style={{ color: 'var(--ink)' }}>{rangeTotals.earned}</b> · spent <b style={{ color: 'var(--ink)' }}>{rangeTotals.spent}</b></span>
          </div>
          <BarChart data={series} />
          <div className="row wrap small muted" style={{ gap: 18 }}>
            <span>Lifetime earned <b style={{ color: 'var(--ink)' }}>{w.earned.total}</b></span>
            <span>Lifetime spent <b style={{ color: 'var(--ink)' }}>{w.spentTotal}</b></span>
            <span>Gigs paid <b style={{ color: 'var(--ink)' }}>{w.payouts}</b></span>
          </div>
        </section>

        <section className="card">
          <div className="card-title"><h2>Recent activity</h2></div>
          {txs.length === 0 ? <p className="muted">No activity yet.</p> : txs.map((t) => {
            const s = TX_STYLE[t.type] || TX_STYLE.topup;
            return (
              <div className="tx" key={t.id}>
                <span className={`tx-ic ${s.cls}`}><Icon name={s.icon} size={18} /></span>
                <div className="grow">
                  <b style={{ display: 'block', fontSize: '0.92rem' }}>
                    {t.gigId ? <Link to={`/gigs/${t.gigId}`}>{t.label}</Link> : t.label}
                  </b>
                  <span className="small muted">{TX_NAME[t.type]} · {ago(t.createdAt)}</span>
                </div>
                <span className={t.amount > 0 ? 'amt-in' : 'amt-out'}>{t.amount > 0 ? '+' : ''}{t.amount}</span>
              </div>
            );
          })}
        </section>
      </div>

      {modal && (
        <Modal title={modal === 'topup' ? 'Add GigCoins' : 'Withdraw to UPI'} onClose={() => setModal(null)}>
          <form className="stack" onSubmit={submit}>
            <div className="form-ok" style={{ background: 'var(--amber-soft)', color: '#7a5200' }}>Demo mode: no real money moves. In production this connects to a UPI gateway.</div>
            {error && <div className="form-error" role="alert">{error}</div>}
            <div className="field">
              <label htmlFor="amt">Amount (GigCoins)</label>
              <input id="amt" className="input" type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={modal === 'topup' ? '500' : String(w.minWithdraw)} required autoFocus />
              <div className="quick">
                {(modal === 'topup' ? [100, 250, 500, 1000] : [100, 250, 500, w.balance]).filter((v, i, a) => v > 0 && a.indexOf(v) === i).map((v) => (
                  <button type="button" key={v} className="cat" onClick={() => setAmount(String(v))}>{v === w.balance && modal === 'withdraw' ? `All (${v})` : v}</button>
                ))}
              </div>
              <span className="hint">{modal === 'topup' ? `You'll pay ₹${amount || 0}.` : `You'll receive ₹${amount || 0}. Minimum ${w.minWithdraw}, available ${w.balance}.`}</span>
            </div>
            {modal === 'withdraw' && (
              <div className="field">
                <label htmlFor="upi">UPI ID</label>
                <input id="upi" className="input" value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="name@okaxis" required />
              </div>
            )}
            <button className="btn btn-primary" disabled={busy || !amount}>{busy ? 'Processing…' : modal === 'topup' ? 'Add coins' : 'Withdraw'}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
