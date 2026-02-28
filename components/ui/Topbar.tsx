'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/opportunities', label: 'Opportunities' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/theses', label: 'Theses' },
];

export default function Topbar() {
  const pathname = usePathname();

  return (
    <header className="neo-topbar">
      <div className="neo-topbar-inner">
        <Link href="/" className="neo-logo">
          <span className="neo-logo-dot" />
          <span>VAULT // AI</span>
        </Link>

        <nav className="neo-nav">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className={`neo-nav-link ${isActive ? 'active' : ''}`}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          className="neo-search"
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
        >
          Command <kbd>⌘K</kbd>
        </button>
      </div>
    </header>
  );
}
