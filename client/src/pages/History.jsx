import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api/axios.js';
import { useToast } from '../context/ToastContext.jsx';
import Icon, { Coins } from '../components/Icon.jsx';
import Spinner from '../components/Spinner.jsx';
import StatusPill from '../components/StatusPill.jsx';
import { dateShort } from '../utils/format.js';

const ROLES = [['all', 'Everything'], ['worked', 'As freelancer'], ['posted', 'As owner']];
const STATUSES = [['finished', 'Finished'], ['completed', 'Completed'], ['cancelled', 'Cancelled'], ['active', 'In progress'], ['all', 'All']];

export default function History() {
  const toast = useToast();
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('finished');
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    api.get('/history', { params: { role, status } }).then((r) => setData(r.data)).catch((e) => { toast.error(errMsg(e)); setData({ items: [], summary: {} }); });
  }, [role, status, toast]);

  const s = data?.summary || {};
  return (
    <div className="page">
      <div className="page-head"><div><h1>History</h1><p>Every gig you've worked on or posted, with what it paid.</p></div></div>

      <section className="kpis" aria-label="Summary">
        <div className="kpi"><span>Gigs finished as freelancer</span><b>{s.worked_done ?? 0}</b></div>
        <div className="kpi"><span>Gigs completed as owner</span><b>{s.posted_done ?? 0}</b></div>
        <div className="kpi"><span>Total earned</span><b><Coins n={s.earned} size={22} /></b></div>
        <div className="kpi"><span>Total paid out</span><b><Coins n={s.spent} size={22} /></b></div>
      </section>

      <div className="row wrap spread">
        <div className="tabs" role="tablist">
          {ROLES.map(([k, l]) => <button key={k} role="tab" aria-selected={role === k} className={`tab ${role === k ? 'active' : ''}`} onClick={() => setRole(k)}>{l}</button>)}
        </div>
        <select className="select" style={{ width: 'auto' }} aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>

      {!data ? <Spinner /> : data.items.length === 0 ? (
        <div className="empty">
          <h3>Nothing here yet</h3>
          <p className="muted">Finished gigs show up here with their payout.</p>
          <Link to="/dashboard" className="btn btn-primary">Find a gig</Link>
        </div>
      ) : (
        <div className="hist-list">
          {data.items.map((i) => (
            <Link key={`${i.id}-${i.role}`} to={`/gigs/${i.id}`} className="hist-item">
              <span className={`hist-ic ${i.role}`}><Icon name={i.role === 'worked' ? 'briefcase' : 'send'} size={22} /></span>
              <span className="stack-sm">
                <b>{i.title}</b>
                <span className="small muted">
                  {i.role === 'worked' ? `Worked for ${i.counterparty}` : i.counterparty ? `Hired ${i.counterparty}` : 'Posted by you'} · {i.category} · {dateShort(i.completedAt || i.createdAt)}
                </span>
              </span>
              <span className="row hist-amt" style={{ gap: 12, justifyContent: 'flex-end' }}>
                {i.amount > 0 && <span className={i.role === 'worked' ? 'amt-in' : 'amt-out'}><Coins n={i.amount} /></span>}
                <StatusPill status={i.status} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
