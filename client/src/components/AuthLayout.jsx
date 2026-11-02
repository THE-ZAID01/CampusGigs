import { Coin } from './Icon.jsx';
import { Logo } from './Icon.jsx';
import Icon from './Icon.jsx';

export default function AuthLayout({ children }) {
  return (
    <div className="auth">
      <section className="auth-art" aria-label="About CampusGigs">
        <div className="brand-lockup"><Logo /><span className="brand-name">CampusGigs</span></div>
        <h1 className="hero-title">
          <span>Gigs by</span>
          <span className="soft">students,</span>
          <span>for students.</span>
        </h1>
        <p className="hero-copy">
          Post a task, collect bids from people on your campus, and pay in GigCoins that stay in escrow
          until the work is approved. No chasing, no ghosting.
        </p>
        <div className="hero-points">
          <span className="chip">Escrow-protected</span>
          <span className="chip">Level up with every gig</span>
          <span className="chip">Cash out to UPI</span>
        </div>

        <div className="float f1 mini-id">
          <div style={{ width: '100%' }}>
            <div className="row" style={{ gap: 10 }}>
              <span className="avatar" style={{ width: 38, height: 38, fontSize: 14, background: 'linear-gradient(135deg,#7a89ff,#b18cff)' }}>AS</span>
              <span>Aarav S.<small>Lv 3 · Trusted Hand</small></span>
            </div>
            <div className="bar"><i /></div>
          </div>
        </div>
        <div className="float f2"><span className="vault" style={{ width: 40, height: 40, borderRadius: 13 }}><Icon name="lock" size={20} /></span>
          <span>400 GigCoins<small>held safely in escrow</small></span></div>
        <div className="float f3"><Coin size={26} /><span>Bid 400<small>beats 450, you won</small></span></div>
        <div className="float f4"><Icon name="bolt" size={18} /> +250 XP</div>
      </section>
      <section className="auth-panel">{children}</section>
    </div>
  );
}
