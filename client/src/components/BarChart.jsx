import { useState } from 'react';

const W = 640, H = 240, PAD = { t: 16, r: 8, b: 30, l: 44 };

function niceMax(v) {
  if (v <= 10) return 10;
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p) * p;
}

/** Grouped bars: earned (mint) vs spent (indigo). Hover or focus a group for exact numbers. */
export default function BarChart({ data }) {
  const [hover, setHover] = useState(null);
  const max = niceMax(Math.max(1, ...data.flatMap((d) => [d.earned, d.spent])));
  const iw = W - PAD.l - PAD.r, ih = H - PAD.t - PAD.b;
  const gw = iw / data.length;
  const bw = Math.min(22, gw * 0.32);
  const y = (v) => PAD.t + ih - (v / max) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));
  const every = data.length > 10 ? 2 : 1;
  const sel = hover !== null ? data[hover] : null;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Earned and spent GigCoins over time" style={{ display: 'block', minWidth: 420 }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#e4e9f5" strokeDasharray={t === 0 ? '0' : '4 5'} />
            <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#667090">{t}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = PAD.l + gw * i + gw / 2;
          return (
            <g key={i} tabIndex={0} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}>
              <rect x={cx - gw / 2} y={PAD.t} width={gw} height={ih} fill={hover === i ? '#eef0ff' : 'transparent'} rx="8" />
              <rect x={cx - bw - 1.5} y={y(d.earned)} width={bw} height={Math.max(0, PAD.t + ih - y(d.earned))} rx="5" fill="#1fb88d" />
              <rect x={cx + 1.5} y={y(d.spent)} width={bw} height={Math.max(0, PAD.t + ih - y(d.spent))} rx="5" fill="#7a89ff" />
              {i % every === 0 && <text x={cx} y={H - 10} textAnchor="middle" fontSize="11" fill="#667090">{d.label}</text>}
            </g>
          );
        })}
      </svg>
      <div className="small" style={{ minHeight: 22, fontWeight: 600 }} aria-live="polite">
        {sel ? <>{sel.label}: earned <span className="amt-in">{sel.earned}</span> · spent <span className="amt-out" style={{ color: '#5563d6' }}>{sel.spent}</span> GigCoins</> : <span className="muted">Hover a bar for exact amounts</span>}
      </div>
    </div>
  );
}
