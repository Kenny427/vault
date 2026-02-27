// Sticky Topbar with Primary Navigation
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '⌂' },
  { href: '/opportunities', label: 'Opportunities', icon: '◎' },
  { href: '/portfolio', label: 'Portfolio', icon: '◈' },
  { href: '/theses', label: 'Theses', icon: '✎' },
];

export default function Topbar() {
  const pathname = usePathname();

  return (
    <header className="topbar">
      <div className="topbar-content">
        <Link href="/" className="topbar-logo">
          <span className="topbar-logo-icon">🛡️</span>
          <span className="topbar-logo-text">Vault</span>
        </Link>

        <nav className="topbar-nav">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`topbar-nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="topbar-nav-icon">{item.icon}</span>
                <span className="topbar-nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <button 
          className="topbar-search-trigger"
          onClick={() => {
            // Trigger command palette via custom event
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
          }}
        >
          <span className="topbar-search-icon">⌘</span>
          <span className="topbar-search-text">Search</span>
          <span className="topbar-search-key">K</span>
        </button>
      </div>

      {/* Desktop-only shortcuts hint */}
      <div className="topbar-footer-hint">
        Press <kbd>?</kbd> for shortcuts
      </div>

      <style jsx>{`
        .topbar {
          position: sticky;
          top: 0;
          z-index: 100;
          background: var(--tabbar-bg);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
        }

        .topbar-content {
          max-width: 840px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1rem;
        }

        .topbar-logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
          font-weight: 800;
          font-size: 1.1rem;
          color: var(--text);
        }

        .topbar-logo-icon {
          font-size: 1.25rem;
        }

        .topbar-logo-text {
          letter-spacing: -0.02em;
        }

        .topbar-nav {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          flex: 1;
          margin-left: 1.5rem;
        }

        .topbar-nav-item {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          text-decoration: none;
          color: var(--muted);
          font-size: 0.85rem;
          font-weight: 600;
          transition: all 120ms ease;
        }

        .topbar-nav-item:hover {
          color: var(--text);
          background: var(--surface-2);
        }

        .topbar-nav-item.active {
          color: var(--accent);
          background: rgba(39, 194, 103, 0.1);
        }

        .topbar-nav-icon {
          font-size: 0.9rem;
          opacity: 0.8;
        }

        .topbar-nav-label {
          letter-spacing: -0.01em;
        }

        .topbar-search-trigger {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.45rem 0.75rem;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--surface);
          color: var(--muted);
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 120ms ease;
        }

        .topbar-search-trigger:hover {
          border-color: var(--accent);
          color: var(--text);
        }

        .topbar-search-icon {
          font-size: 0.75rem;
          opacity: 0.7;
        }

        .topbar-search-text {
          color: var(--muted);
        }

        .topbar-search-key {
          font-size: 0.65rem;
          background: var(--surface-2);
          padding: 0.15rem 0.35rem;
          border-radius: 4px;
          font-weight: 700;
        }

        .topbar-footer-hint {
          display: none;
          justify-content: center;
          padding: 0.4rem;
          font-size: 0.7rem;
          color: var(--muted);
          background: var(--surface-2);
          border-top: 1px solid var(--border);
        }

        .topbar-footer-hint kbd {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 1.1rem;
          height: 1.1rem;
          padding: 0 0.25rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 4px;
          font-family: inherit;
          font-size: 0.6rem;
          font-weight: 700;
          margin: 0 0.2rem;
        }

        @media (max-width: 640px) {
          .topbar-nav-label {
            display: none;
          }
          
          .topbar-search-text {
            display: none;
          }
        }

        @media (min-width: 641px) {
          .topbar-footer-hint {
            display: flex;
          }
        }
      `}</style>
    </header>
  );
}
