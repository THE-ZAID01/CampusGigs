import { Link } from 'react-router-dom';
import Avatar from './Avatar.jsx';
import Icon, { Coins } from './Icon.jsx';
import StatusPill from './StatusPill.jsx';
import { daysLeft } from '../utils/format.js';

/** Returns a short call-to-action when this gig needs the viewer's attention. */
function actionNote(g, meId) {
  if (g.posterId === meId) {
    if (g.status === 'delivered') return 'Work delivered. Review it and release payment.';
    if (g.status === 'open' && g.bidCount > 0) return `${g.bidCount} bid${g.bidCount > 1 ? 's' : ''} waiting for you.`;
  } else if (g.assignedTo === meId) {
    if (g.status === 'in_progress' && g.revisionNote) return 'Revision requested. Check the notes.';
    if (g.status === 'in_progress') return 'Escrow is funded. You can start now.';
    if (g.status === 'delivered') return 'Delivered. Waiting for the owner to approve.';
  }
  return null;
}

export default function GigCard({ gig, meId }) {
  const left = daysLeft(gig.deadline);
  const note = actionNote(gig, meId);
  const urgent = note && (gig.status === 'delivered' && gig.posterId === meId);
  return (
    <Link to={`/gigs/${gig.id}`} className={`gig-card ${urgent ? 'needs-action' : ''}`}>
      {gig.imageUrl && <img src={gig.imageUrl} alt="" className="gig-img" loading="lazy" />}
      <div className="row spread">
        <span className="chip">{gig.category}</span>
        <StatusPill status={gig.status} />
      </div>
      <div className="stack-sm">
        <h3>{gig.title}</h3>
        <p className="desc">{gig.description}</p>
      </div>
      {note && <div className="note-line">{note}</div>}
      {gig.myBid && gig.posterId !== meId && gig.status === 'open' && (
        <div className="note-line" style={{ background: 'var(--primary-soft)', color: 'var(--primary-deep)' }}>
          Your bid: {gig.myBid.amount} GigCoins ({gig.myBid.status})
        </div>
      )}
      <div className="gig-foot">
        <span className="row" style={{ gap: 8, minWidth: 0 }}>
          <Avatar user={gig.poster} size={28} />
          <span className="small" style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {gig.isMine ? 'You' : gig.poster.name}
          </span>
        </span>
        <span style={{ fontSize: '1.05rem' }}><Coins n={gig.escrowAmount || gig.budget} /></span>
      </div>
      <div className="row small muted" style={{ gap: 14 }}>
        <span className="row" style={{ gap: 5 }}><Icon name="users" size={15} /> {gig.bidCount} bid{gig.bidCount === 1 ? '' : 's'}</span>
        {left !== null && gig.status === 'open' && (
          <span className="row" style={{ gap: 5 }}><Icon name="calendar" size={15} /> {left < 0 ? 'Past deadline' : left === 0 ? 'Due today' : `${left} day${left > 1 ? 's' : ''} left`}</span>
        )}
      </div>
    </Link>
  );
}
