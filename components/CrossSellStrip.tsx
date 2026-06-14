'use client';

// Cross-sell to the maker's other apps, shown as two compact cards directly
// below the header. Kept off the focused quick-start funnel and the planner
// itself so those task flows stay distraction-free.

import { usePathname } from 'next/navigation';

const HIDE_ON = ['/start', '/plan'];

const APPS = [
  { href: 'https://truebricks.online', name: 'True Bricks', desc: 'The true total cost of owning any UK home — mortgage, energy, upkeep and risk.' },
  { href: 'https://aidailysignal.app', name: 'The AI Daily Signal', desc: 'One daily brief on everything that mattered in AI, in plain English.' },
];

export default function CrossSellStrip() {
  const pathname = usePathname() || '/';
  if (HIDE_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  return (
    <div className="crosssell-strip no-print">
      <div className="container">
        <span className="cs-label">More from this maker</span>
        {APPS.map((a) => (
          <a key={a.href} className="cs-card" href={a.href} target="_blank" rel="noopener noreferrer">
            <b>{a.name} ↗</b>
            <span>{a.desc}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
