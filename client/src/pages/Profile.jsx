import { useEffect, useRef, useState } from 'react';
import api, { errMsg } from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Avatar from '../components/Avatar.jsx';
import Icon from '../components/Icon.jsx';
import TrustCard from '../components/TrustCard.jsx';
import { resizeImage } from '../utils/image.js';

const YEARS = ['First year', 'Second year', 'Third year', 'Final year', 'Postgraduate', 'Alumni'];

export default function Profile() {
  const { user, stats, setUser, refresh } = useAuth();
  const toast = useToast();
  const fileRef = useRef(null);
  const [f, setF] = useState(null);
  const [skill, setSkill] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    setF({
      name: user.name, headline: user.headline, bio: user.bio, department: user.department, yearOfStudy: user.yearOfStudy,
      skills: user.skills || [], portfolioUrl: user.portfolioUrl, upiId: user.upiId, avatar: user.avatar,
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!f) return null;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try { setF({ ...f, avatar: await resizeImage(file) }); } catch (err) { toast.error(err.message); }
  };

  const addSkill = () => {
    const s = skill.trim();
    if (s && !f.skills.includes(s) && f.skills.length < 12) setF({ ...f, skills: [...f.skills, s] });
    setSkill('');
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data } = await api.put('/users/me', { ...f, avatar: f.avatar || '' });
      setUser(data.user);
      await refresh();
      toast.success('Profile saved');
    } catch (err) {
      setError(errMsg(err));
    } finally { setBusy(false); }
  };

  // live preview of what others will see
  const preview = { ...user, ...f, skills: f.skills, avatar: f.avatar };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Your profile</h1>
          <p>This is your trust ID. Classmates check it before they hire you or accept your bid.</p>
        </div>
      </div>
      <div className="profile-grid">
        <div className="stack" style={{ position: 'sticky', top: 88 }}>
          <TrustCard user={preview} stats={stats} />
          <div className="card-flat small muted">
            Earn XP as you go: +50 for posting a gig, +250 for completing one as a freelancer, +100 when you approve a delivery.
          </div>
        </div>

        <form className="card stack" onSubmit={save}>
          <h2>Edit details</h2>
          {error && <div className="form-error" role="alert">{error}</div>}
          <div className="avatar-edit">
            <Avatar user={{ name: f.name, avatar: f.avatar }} size={84} />
            <div className="stack-sm">
              <div className="row wrap" style={{ gap: 8 }}>
                <button type="button" className="btn btn-sm" onClick={() => fileRef.current?.click()}><Icon name="upload" size={16} /> Upload photo</button>
                {f.avatar && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setF({ ...f, avatar: null })}>Remove</button>}
              </div>
              <span className="hint">Square photos work best. We resize it for you.</span>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pickPhoto} />
            </div>
          </div>

          <div className="grid-2">
            <div className="field"><label htmlFor="pn">Full name</label><input id="pn" className="input" value={f.name} onChange={set('name')} required /></div>
            <div className="field"><label htmlFor="ph">Headline</label><input id="ph" className="input" value={f.headline || ''} onChange={set('headline')} maxLength={120} placeholder="UI designer · Figma · branding" /></div>
          </div>
          <div className="grid-2">
            <div className="field"><label htmlFor="pd">Department</label><input id="pd" className="input" value={f.department || ''} onChange={set('department')} placeholder="Computer Engineering" /></div>
            <div className="field">
              <label htmlFor="py">Year of study</label>
              <select id="py" className="select" value={f.yearOfStudy || ''} onChange={set('yearOfStudy')}>
                <option value="">Select</option>{YEARS.map((y) => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="pb">About you</label>
            <textarea id="pb" className="textarea" maxLength={600} value={f.bio || ''} onChange={set('bio')} placeholder="What do you do well? What have you built or designed?" />
            <span className="hint">{(f.bio || '').length}/600</span>
          </div>
          <div className="field">
            <label htmlFor="sk">Skills</label>
            <div className="skill-input">
              {f.skills.map((s) => (
                <span key={s} className="chip">{s}<button type="button" aria-label={`Remove ${s}`} onClick={() => setF({ ...f, skills: f.skills.filter((x) => x !== s) })}>×</button></span>
              ))}
              <input id="sk" value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="Type a skill and press Enter"
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill(); } }} onBlur={addSkill} />
            </div>
          </div>
          <div className="grid-2">
            <div className="field"><label htmlFor="pp">Portfolio or GitHub link</label><input id="pp" className="input" value={f.portfolioUrl || ''} onChange={set('portfolioUrl')} placeholder="github.com/you" /></div>
            <div className="field"><label htmlFor="pu">UPI ID for withdrawals</label><input id="pu" className="input" value={f.upiId || ''} onChange={set('upiId')} placeholder="name@okaxis" /></div>
          </div>
          <div className="field"><label>College email</label><input className="input" value={user.email} disabled /></div>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
        </form>
      </div>
    </div>
  );
}
