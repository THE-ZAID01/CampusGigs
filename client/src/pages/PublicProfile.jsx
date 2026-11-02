import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from '../components/Icon.jsx';
import Spinner from '../components/Spinner.jsx';
import TrustCard from '../components/TrustCard.jsx';

export default function PublicProfile() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const [data, setData] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    setData(null);
    api.get(`/users/${id}`).then((r) => setData(r.data)).catch(() => setMissing(true));
  }, [id]);

  if (me && String(me.id) === String(id)) return <Navigate to="/profile" replace />;
  if (missing) return <div className="page"><div className="empty"><h2>Profile not found</h2><Link to="/dashboard" className="btn btn-primary">Back to dashboard</Link></div></div>;
  if (!data) return <Spinner />;
  const u = data.user;

  return (
    <div className="page">
      <div><Link to="/dashboard" className="row small" style={{ gap: 6 }}><Icon name="back" size={16} /> Back</Link></div>
      <div className="profile-grid">
        <TrustCard user={u} stats={data.stats} />
        <section className="card stack">
          <h2>About {u.name.split(' ')[0]}</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{u.bio || <span className="muted">No bio yet.</span>}</p>
          {u.portfolioUrl && <a className="row" style={{ gap: 8 }} href={u.portfolioUrl} target="_blank" rel="noreferrer noopener"><Icon name="link" size={18} /> {u.portfolioUrl.replace(/^https?:\/\//, '')}</a>}
          <div className="grid-2">
            <div className="card-flat"><span className="small muted">Gigs completed</span><b style={{ display: 'block', fontSize: '1.6rem' }}>{data.stats.gigsCompleted}</b></div>
            <div className="card-flat"><span className="small muted">Gigs posted</span><b style={{ display: 'block', fontSize: '1.6rem' }}>{data.stats.gigsPosted}</b></div>
          </div>
        </section>
      </div>
    </div>
  );
}
