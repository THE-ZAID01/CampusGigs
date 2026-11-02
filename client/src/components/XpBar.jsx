export default function XpBar({ user }) {
  return (
    <div className="xp">
      <div className="xp-head">
        <span>Level {user.level} · {user.title}</span>
        <span>{user.xpInLevel}/{user.xpForNext} XP</span>
      </div>
      <div className="xp-track" role="progressbar" aria-valuenow={user.xpInLevel} aria-valuemin={0} aria-valuemax={user.xpForNext}>
        <div className="xp-fill" style={{ width: `${Math.max(user.progress, 3)}%` }} />
      </div>
    </div>
  );
}
