'use client';

import { useId } from 'react';

// Smooth area + line SVG chart, ported from the design's WCIR_chart helper.
// Pure render from a numeric series — no animation dependency.

export default function AreaChart({
  series, w = 560, h = 220, stroke = 'var(--c1)', sw = 3, grid = false, dot = false,
  className, ariaLabel, style,
}: {
  series: number[]; w?: number; h?: number; stroke?: string; sw?: number;
  grid?: boolean; dot?: boolean; className?: string; ariaLabel?: string; style?: React.CSSProperties;
}) {
  const gid = useId();
  // Guard degenerate inputs so we never emit NaN path coords.
  const data = series.length >= 2 ? series : series.length === 1 ? [series[0], series[0]] : [0, 0];
  const n = data.length;
  const pad = 0;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = (max - min) || 1;
  const X = (i: number) => pad + (i / (n - 1)) * (w - 2 * pad);
  const Y = (v: number) => h - pad - ((v - min) / span) * (h - 2 * pad);

  let d = '';
  let a = '';
  for (let i = 0; i < n; i++) {
    const x = X(i);
    const y = Y(data[i]);
    if (i === 0) { d = `M${x} ${y}`; a = `M${x} ${h} L${x} ${y}`; }
    else {
      const px = X(i - 1); const py = Y(data[i - 1]); const cx = (px + x) / 2;
      d += ` C${cx} ${py} ${cx} ${y} ${x} ${y}`;
      a += ` C${cx} ${py} ${cx} ${y} ${x} ${y}`;
    }
  }
  a += ` L${X(n - 1)} ${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} style={style}
      role="img" aria-label={ariaLabel} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="1" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {grid && [1, 2, 3].map((i) => {
        const y = pad + (i / 4) * (h - 2 * pad);
        return <line key={i} x1={pad} y1={y} x2={w - pad} y2={y} stroke="var(--line)" strokeWidth="1" />;
      })}
      <path d={a} fill={`url(#${gid})`} />
      <path d={d} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      {dot && <circle cx={X(n - 1)} cy={Y(data[n - 1])} r="5" fill={stroke} stroke="#fff" strokeWidth="2.5" />}
    </svg>
  );
}
