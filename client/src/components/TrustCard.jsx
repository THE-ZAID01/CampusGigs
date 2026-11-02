import Avatar from './Avatar.jsx';
import Icon from './Icon.jsx';
import XpBar from './XpBar.jsx';
import { dateShort } from '../utils/format.js';

function Barcode({ seed }) {
  const bars = [];
  let n = Number(seed) * 7919 + 13;
  for (let i = 0; i < 34; i += 1) {
    n = (n * 1103515245 + 12345) & 0x7fffffff;
    bars.push(1 + (n % 4));
  }
  return (
    <div className="barcode" aria-hidden="true">
      {bars.map((w, i) => <i key={i} style={{ width: w }} />)}
    </div>
  );
}

/** The "trust ID" other students see. Used on profile, public profile and dashboard. */
export default function TrustCard({ user, stats, compact = false }) {
  if (!user) return null;
  const meta = [user.department, user.yearOfStudy].filter(Boolean).join(' · ');
  return (
    <article className={`trust ${compact ? 'compact' : ''}`} aria-label={`Trust ID for ${user.name}`}>
      <div className="trust-holo">
        <div className="trust-top"><span>CampusGigs Trust ID</span><span>{user.trustId}</span></div>
      </div>
      <div className="trust-body">
        <div className="trust-id-row">
          <Avatar user={user} size={compact ? 76 : 92} />
          <div className="stack-sm" style={{ paddingBottom: 6, minWidth: 0 }}>
            <span className="level-badge"><Icon name="bolt" size={14} /> Lv {user.level}</span>
          </div>
        </div>
        <div className="stack-sm">
          <h2 style={{ wordBreak: 'break-word' }}>{user.name}</h2>
          {user.headline && <p className="muted">{user.headline}</p>}
          <div className="row wrap" style={{ gap: 8 }}>
            {user.verified && <span className="verified"><Icon name="shield" size={14} /> Verified student</span>}
            {meta && <span className="small muted">{meta}</span>}
          </div>
        </div>

        <XpBar user={user} />

        {stats && (
          <div className="stat-trio">
            <div className="stat posted"><b>{stats.gigsPosted}</b><span>Gigs posted</span></div>
            <div className="stat done"><b>{stats.gigsCompleted}</b><span>Gigs completed</span></div>
            <div className="stat active"><b>{stats.gigsHired}</b><span>Hired for</span></div>
          </div>
        )}

        {!compact && user.skills?.length > 0 && (
          <div className="row wrap" style={{ gap: 8 }}>
            {user.skills.map((s) => <span key={s} className="chip">{s}</span>)}
          </div>
        )}

        <Barcode seed={user.id} />
        <div className="trust-foot">
          <span>Member since {dateShort(user.createdAt)}</span>
          {stats?.gigsActive > 0 && <span>{stats.gigsActive} gig{stats.gigsActive > 1 ? 's' : ''} in progress</span>}
        </div>
      </div>
    </article>
  );
}
