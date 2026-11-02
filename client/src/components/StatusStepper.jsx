import Icon from './Icon.jsx';

const STEPS = [
  { key: 'posted', label: 'Gig posted', icon: 'briefcase' },
  { key: 'held', label: 'Coins in escrow', icon: 'lock' },
  { key: 'delivered', label: 'Work delivered', icon: 'upload' },
  { key: 'released', label: 'Payment released', icon: 'check' },
];
const INDEX = { open: 0, in_progress: 1, delivered: 2, completed: 3 };

export default function StatusStepper({ status }) {
  const idx = INDEX[status] ?? 0;
  return (
    <ol className="stepper" style={{ listStyle: 'none', padding: 0, margin: 0 }} aria-label="Escrow progress">
      {STEPS.map((s, i) => {
        const done = i < idx || status === 'completed';
        const cls = done ? 'done' : i === idx ? 'current' : '';
        return (
          <li key={s.key} className={`step ${cls}`} aria-current={i === idx ? 'step' : undefined}>
            <span className="dot"><Icon name={done ? 'check' : s.icon} size={18} /></span>
            <span>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
