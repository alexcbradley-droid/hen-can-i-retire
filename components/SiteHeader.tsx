'use client';

import { useState } from 'react';
import Link from 'next/link';
import LogoMark from './Logo';
import HeaderAuth from './HeaderAuth';

const LINKS = [
  { href: '/plan', label: 'Planner' },
  { href: '/plans', label: 'My plans' },
  { href: '/compare', label: 'Compare' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/help', label: 'Help' },
  { href: '/about', label: 'About' },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header no-print">
      <div className="container">
        <Link href="/" className="brand" aria-label="When Can I Retire — home" onClick={() => setOpen(false)}>
          <LogoMark size={32} />
          When can I <span>retire?</span>
        </Link>
        <nav className={`nav${open ? ' open' : ''}`} aria-label="Primary">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</Link>
          ))}
          <Link href="/start" className="btn btn-primary btn-sm nav-cta" onClick={() => setOpen(false)}>Start planning</Link>
        </nav>
        <HeaderAuth />
        <button className="menu-btn" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#11231f" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
        </button>
      </div>
    </header>
  );
}
