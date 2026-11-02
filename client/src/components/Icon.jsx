const P = {
  home: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" /></>,
  wallet: <><rect x="3" y="6" width="18" height="14" rx="3" /><path d="M16 13h2M3 10h18M7 6l8-3 2 3" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  logout: <><path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" /><path d="M16 8l4 4-4 4M20 12H9" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  shield: <><path d="M12 3 5 6v5c0 4.5 3 8.2 7 10 4-1.8 7-5.5 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></>,
  upload: <><path d="M12 16V5M7 9l5-5 5 5" /><path d="M5 19h14" /></>,
  down: <><path d="M12 4v11M7 11l5 5 5-5" /><path d="M5 20h14" /></>,
  back: <path d="M15 5 8 12l7 7" />,
  send: <path d="M4 12 20 4l-5 16-3-7-8-1Z" />,
  bolt: <path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z" />,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="3" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" /></>,
  trend: <path d="M3 17 9 11l4 4 8-9M15 6h6v6" />,
  edit: <><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="m13 7 4 4" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" /><path d="M16 5a3.5 3.5 0 0 1 0 6.5M18 15c2.2.6 3.5 2.3 3.5 5" /></>,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14.5-4M4 13a8 8 0 0 0 14.5 4" /><path d="M20 4v5h-5M4 20v-5h5" /></>,
};

export default function Icon({ name, size = 20, stroke = 2, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {P[name]}
    </svg>
  );
}

export function Coin({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="coinG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd9a8" /><stop offset="1" stopColor="#ff9f6e" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="url(#coinG)" />
      <circle cx="12" cy="12" r="8" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="1.5" />
      <text x="12" y="16.2" fontSize="11" fontWeight="800" textAnchor="middle" fill="#fff" fontFamily="Arial">G</text>
    </svg>
  );
}

export const Coins = ({ n, size = 18 }) => (
  <span className="coin"><Coin size={size} />{Number(n || 0).toLocaleString('en-IN')}</span>
);

export function Logo({ size = 46 }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size, borderRadius: size * 0.32 }}>
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#ffd9bd" />
        <text x="12" y="16.6" fontSize="12.5" fontWeight="800" textAnchor="middle" fill="#5565f0" fontFamily="Arial">G</text>
      </svg>
    </span>
  );
}
