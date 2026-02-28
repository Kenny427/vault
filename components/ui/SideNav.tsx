'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '⌂', shortcut: 'D' },
  { href: '/opportunities', label: 'Opportunities', icon: '◎', shortcut: 'O' },
  { href: '/portfolio', label: 'Portfolio', icon: '◈', shortcut: 'P' },
  { href: '/theses', label: 'Theses', icon: '✎', shortcut: 'T' },
];

export default function SideNav() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile nav on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Keyboard shortcut navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      if (isInput) return;
      
      if (e.metaKey || e.ctrlKey) {
        const key = e.key.toUpperCase();
        const item = navItems.find(n => n.shortcut === key);
        if (item) {
          e.preventDefault();
          window.location.href = item.href;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* Mobile menu button */}
      <button 
        className="sidenav-mobile-toggle"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        aria-label="Toggle navigation"
      >
        <span className={`sidenav-hamburger ${isMobileOpen ? 'open' : ''}`}>
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>

      {/* Sidebar backdrop (mobile) */}
      {isMobileOpen && (
        <div 
          className="sidenav-backdrop"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Side Navigation */}
      <aside className={`sidenav ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        {/* Logo */}
        <div className="sidenav-header">
          <Link href="/" className="sidenav-logo">
            <span className="sidenav-logo-icon">🛡️</span>
            {!isCollapsed && <span className="sidenav-logo-text">Vault</span>}
          </Link>
          <button 
            className="sidenav-collapse-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span className="sidenav-collapse-icon">{isCollapsed ? '→' : '←'}</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidenav-nav">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidenav-nav-item ${isActive ? 'active' : ''}`}
                title={isCollapsed ? item.label : undefined}
              >
                <span className="sidenav-nav-icon">{item.icon}</span>
                {!isCollapsed && <span className="sidenav-nav-label">{item.label}</span>}
                {!isCollapsed && (
                  <span className="sidenav-nav-shortcut">
                    <kbd>{item.shortcut}</kbd>
                  </span>
                )}
                {isActive && <span className="sidenav-nav-indicator" />}
              </Link>
            );
          })}
        </nav>

        {/* Quick Actions */}
        <div className="sidenav-section">
          {!isCollapsed && (
            <div className="sidenav-section-title">Quick Actions</div>
          )}
          <button 
            className="sidenav-action-btn"
            onClick={() => {
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
            }}
            title={isCollapsed ? 'Search (⌘K)' : undefined}
          >
            <span className="sidenav-action-icon">⌘</span>
            {!isCollapsed && <span>Search</span>}
            {!isCollapsed && <kbd className="sidenav-action-kbd">K</kbd>}
          </button>
        </div>

        {/* Footer */}
        <div className="sidenav-footer">
          {!isCollapsed && (
            <div className="sidenav-footer-hint">
              Press <kbd>?</kbd> for shortcuts
            </div>
          )}
        </div>
      </aside>

      <style jsx>{`
        /* Mobile toggle */
        .sidenav-mobile-toggle {
          display: none;
          position: fixed;
          top: 0.75rem;
          left: 0.75rem;
          z-index: 1001;
          width: 44px;
          height: 44px;
          border: none;
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          cursor: pointer;
          padding: 0;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-md);
        }

        .sidenav-hamburger {
          display: flex;
          flex-direction: column;
          gap: 4px;
          width: 20px;
        }

        .sidenav-hamburger span {
          display: block;
          height: 2px;
          background: var(--color-text);
          border-radius: 1px;
          transition: all 200ms ease;
        }

        .sidenav-hamburger.open span:nth-child(1) {
          transform: rotate(45deg) translate(4px, 4px);
        }

        .sidenav-hamburger.open span:nth-child(2) {
          opacity: 0;
        }

        .sidenav-hamburger.open span:nth-child(3) {
          transform: rotate(-45deg) translate(5px, -5px);
        }

        /* Backdrop */
        .sidenav-backdrop {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(2px);
          z-index: 999;
        }

        /* Side Navigation */
        .sidenav {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 240px;
          background: var(--color-surface);
          border-right: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          z-index: 1000;
          transition: width 200ms ease, transform 200ms ease;
        }

        .sidenav.collapsed {
          width: 72px;
        }

        /* Header */
        .sidenav-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          border-bottom: 1px solid var(--color-border-subtle);
          min-height: 64px;
        }

        .sidenav-logo {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          text-decoration: none;
          font-weight: var(--font-extrabold);
          font-size: 1.125rem;
          color: var(--color-text);
          letter-spacing: -0.02em;
        }

        .sidenav-logo-icon {
          font-size: 1.375rem;
          filter: drop-shadow(0 0 8px var(--glow-accent));
        }

        .sidenav-logo-text {
          background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .sidenav-collapse-btn {
          width: 28px;
          height: 28px;
          border: none;
          background: var(--color-surface-2);
          border-radius: var(--radius-md);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-muted);
          font-size: 0.75rem;
          transition: all 150ms ease;
          opacity: 0.7;
        }

        .sidenav-collapse-btn:hover {
          opacity: 1;
          background: var(--color-surface-3);
          color: var(--color-accent);
        }

        .collapsed .sidenav-collapse-btn {
          display: none;
        }

        /* Navigation */
        .sidenav-nav {
          flex: 1;
          padding: 0.75rem 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          overflow-y: auto;
        }

        .sidenav-nav-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border-radius: var(--radius-lg);
          text-decoration: none;
          color: var(--color-text-muted);
          font-weight: var(--font-medium);
          font-size: var(--text-sm);
          transition: all 150ms ease;
        }

        .sidenav-nav-item:hover {
          color: var(--color-text);
          background: var(--color-surface-2);
        }

        .sidenav-nav-item.active {
          color: var(--color-accent);
          background: var(--glow-accent);
        }

        .sidenav-nav-icon {
          font-size: 1.125rem;
          width: 24px;
          text-align: center;
          flex-shrink: 0;
        }

        .sidenav-nav-label {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sidenav-nav-shortcut {
          flex-shrink: 0;
        }

        .sidenav-nav-shortcut kbd {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 1.25rem;
          height: 1.25rem;
          padding: 0 0.25rem;
          background: var(--color-surface-2);
          border: 1px solid var(--color-border-subtle);
          border-radius: var(--radius-sm);
          font-family: inherit;
          font-size: 0.625rem;
          font-weight: var(--font-semibold);
          color: var(--color-text-muted);
        }

        .sidenav-nav-indicator {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 20px;
          background: var(--color-accent);
          border-radius: 0 2px 2px 0;
          box-shadow: 0 0 8px var(--glow-accent-strong);
        }

        /* Sections */
        .sidenav-section {
          padding: 0.75rem 0.5rem;
          border-top: 1px solid var(--color-border-subtle);
        }

        .sidenav-section-title {
          font-size: 0.625rem;
          font-weight: var(--font-bold);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-text-muted);
          padding: 0 0.75rem;
          margin-bottom: 0.5rem;
        }

        .sidenav-action-btn {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          width: 100%;
          padding: 0.625rem 0.75rem;
          border: 1px dashed var(--color-border);
          background: transparent;
          border-radius: var(--radius-lg);
          cursor: pointer;
          color: var(--color-text-muted);
          font-size: var(--text-sm);
          font-weight: var(--font-medium);
          transition: all 150ms ease;
        }

        .sidenav-action-btn:hover {
          border-color: var(--color-accent);
          color: var(--color-accent);
          background: var(--glow-accent);
        }

        .sidenav-action-icon {
          font-size: 0.875rem;
        }

        .sidenav-action-kbd {
          margin-left: auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 1.25rem;
          height: 1.25rem;
          padding: 0 0.25rem;
          background: var(--color-surface-2);
          border: 1px solid var(--color-border-subtle);
          border-radius: var(--radius-sm);
          font-family: inherit;
          font-size: 0.625rem;
          font-weight: var(--font-semibold);
        }

        .collapsed .sidenav-action-btn {
          justify-content: center;
          padding: 0.625rem;
        }

        /* Footer */
        .sidenav-footer {
          padding: 0.75rem;
          border-top: 1px solid var(--color-border-subtle);
        }

        .sidenav-footer-hint {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
          font-size: 0.6875rem;
          color: var(--color-text-muted);
        }

        .sidenav-footer-hint kbd {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 1rem;
          height: 1rem;
          padding: 0 0.25rem;
          background: var(--color-surface-2);
          border: 1px solid var(--color-border-subtle);
          border-radius: var(--radius-sm);
          font-family: inherit;
          font-size: 0.5625rem;
          font-weight: var(--font-semibold);
        }

        /* Collapsed state */
        .collapsed .sidenav-header {
          justify-content: center;
          padding: 1rem 0.5rem;
        }

        .collapsed .sidenav-logo {
          justify-content: center;
        }

        .collapsed .sidenav-nav-item {
          justify-content: center;
          padding: 0.75rem 0.5rem;
        }

        .collapsed .sidenav-footer {
          display: flex;
          justify-content: center;
        }

        /* Mobile styles */
        @media (max-width: 768px) {
          .sidenav-mobile-toggle {
            display: flex;
          }

          .sidenav-backdrop {
            display: block;
          }

          .sidenav {
            transform: translateX(-100%);
            width: 260px;
          }

          .sidenav.mobile-open {
            transform: translateX(0);
          }

          .sidenav.collapsed {
            width: 260px;
          }

          .sidenav-collapse-btn {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
