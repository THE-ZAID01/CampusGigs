const GRADS = [
  ['#7a89ff', '#b18cff'], ['#ff9f6e', '#ffc58a'], ['#2fcb9f', '#6ee0c0'],
  ['#5aa9ff', '#8ad0ff'], ['#ff7aa2', '#ffb0c7'], ['#9a7bff', '#c8a8ff'],
];
export default function Avatar({ user, size = 44 }) {
  const name = user?.name || '?';
  if (user?.avatar) {
    return <img className="avatar" src={user.avatar} alt={name} width={size} height={size} style={{ width: size, height: size }} />;
  }
  const g = GRADS[(name.charCodeAt(0) + name.length) % GRADS.length];
  const initials = name.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  return (
    <span className="avatar" aria-label={name}
      style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(135deg, ${g[0]}, ${g[1]})` }}>
      {initials}
    </span>
  );
}
