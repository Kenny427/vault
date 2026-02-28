// Redesigned App Shell with Sidebar Navigation
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '⌂', description: 'Overview & stats' },
  { href: '/opportunities', label: 'Opportunities', icon: '◎', description: 'Find flips' },
  { href: '/portfolio', label: 'Portfolio', icon: '◈', description: 'Your holdings' },
  { href: '/theses', label: 'Theses', icon: '✎', description: 'Trading thesis' },
];

// Placeholder pages for nav links that don't exist yet
const placeholderPages = ['/opportunities', '/portfolio', '/theses'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Check if current page is a placeholder (not implemented yet)
  const isPlaceholderPage = placeholderPages.includes(pathname);

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <Link href="/" className="sidebar-logo">
            <span className="sidebar-logo-icon">🛡️</span>
            {!isSidebarCollapsed && <span className="sidebar-logo-text">Vault</span>}
          </Link>
          <button 
            className="sidebar-toggle"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span className="sidebar-toggle-icon">{isSidebarCollapsed ? '→' : '←'}</span>
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <span className="sidebar-nav-icon">{item.icon}</span>
                {!isSidebarCollapsed && (
                  <>
                    <span className="sidebar-nav-label">{item.label}</span>
                    <span className="sidebar-nav-indicator" />
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Command Palette Trigger */}
        <div className="sidebar-footer">
          <button 
            className="command-trigger"
            onClick={() => {
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
            }}
          >
            <span className="command-trigger-icon">⌘</span>
            {!isSidebarCollapsed && (
              <>
                <span className="command-trigger-text">Quick search</span>
                <span className="command-trigger-key">K</span>
              </>
            )}
          </button>
          
          {!isSidebarCollapsed && (
            <div className="sidebar-hint">
              Press <kbd>?</kbd> for shortcuts
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-wrapper">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-content">
            <div className="topbar-breadcrumb">
              <span className="topbar-breadcrumb-item">Vault</span>
              {pathname !== '/' && (
                <>
                  <span className="topbar-breadcrumb-sep">/</span>
                  <span className="topbar-breadcrumb-item current">
                    {navItems.find(n => n.href === pathname || (pathname.startsWith(n.href) && n.href !== '/'))?.label || 
                     navItems.find(n => pathname.startsWith(n.href))?.label || 
                     'Page'}
                  </span>
                </>
              )}
            </div>
            
            <div className="topbar-actions">
              <button className="topbar-action" title="Notifications">
                <span className="topbar-action-icon">🔔</span>
              </button>
              <button className="topbar-action" title="Settings">
                <span className="topbar-action-icon">⚙️</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className={`main-content ${isPlaceholderPage ? 'placeholder' : ''}`}>
          {isPlaceholderPage ? (
            <div className="placeholder-content">
              <div className="placeholder-icon">🚧</div>
              <h2>Coming Soon</h2>
              <p>This page is under construction.</p>
              <Link href="/" className="btn btn-primary">Back to Dashboard</Link>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      <style jsx>{`
        .app-shell {
          display: flex;
          min-height: 100vh;
          background: var(--color-bg);
        }

        /* Sidebar */
        .sidebar {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          width: 260px;
          background: var(--color-surface);
          border-right: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          z-index: 100;
          transition: width var(--transition-slow), background var(--transition-base);
        }

        .sidebar.collapsed {
          width: 72px;
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem;
          border-bottom: 1px solid var(--color-border-subtle);
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          text-decoration: none;
          font-weight: 800;
          font-size: 1.25rem;
          color: var(--color-text);
          transition: transform var(--transition-fast);
        }

        .sidebar-logo:hover {
          transform: scale(1.02);
        }

        .sidebar-logo-icon {
          font-size: 1.5rem;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
        }

        .sidebar-logo-text {
          letter-spacing: -0.025em;
          background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .sidebar-toggle {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background: var(--color-surface);
          color: var(--color-text-muted);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .sidebar-toggle:hover {
          background: var(--color-surface-2);
          color: var(--color-text);
          border-color: var(--color-accent);
        }

        .sidebar-toggle-icon {
          font-size: 0.875rem;
        }

        /* Navigation */
        .sidebar-nav {
          flex: 1;
          padding: 1rem 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
          overflow-y: auto;
        }

        .sidebar-nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          border-radius: var(--radius-lg);
          text-decoration: none;
          color: var(--color-text-muted);
          font-weight: 600;
          font-size: 0.9375rem;
          position: relative;
          transition: all var(--transition-base);
        }

        .sidebar-nav-item:hover {
          color: var(--color-text);
          background: var(--color-surface-2);
          transform: translateX(2px);
        }

        .sidebar-nav-item.active {
          color: var(--color-accent);
          background: rgba(39, 194, 103, 0.12);
        }

        .sidebar-nav-item.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 24px;
          background: var(--color-accent);
          border-radius: 0 2px 2px 0;
        }

        .sidebar-nav-icon {
          font-size: 1.125rem;
          width: 24px;
          text-align: center;
          flex-shrink: 0;
        }

        .sidebar-nav-label {
          flex: 1;
          letter-spacing: -0.01em;
        }

        .sidebar-nav-indicator {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--color-accent);
          opacity: 0;
          transform: scale(0);
          transition: all var(--transition-fast);
        }

        .sidebar-nav-item.active .sidebar-nav-indicator {
          opacity: 1;
          transform: scale(1);
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(39, 194, 103, 0.4); }
          50% { box-shadow: 0 0 0 6px rgba(39, 194, 103, 0); }
        }

        /* Sidebar Footer */
        .sidebar-footer {
          padding: 1rem;
          border-top: 1px solid var(--color-border-subtle);
        }

        .command-trigger {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          background: var(--color-surface-2);
          color: var(--color-text-muted);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all var(--transition-base);
        }

        .command-trigger:hover {
          border-color: var(--color-accent);
          background: var(--color-surface);
          color: var(--color-text);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .command-trigger-icon {
          font-size: 0.875rem;
          opacity: 0.7;
        }

        .command-trigger-text {
          flex: 1;
          text-align: left;
        }

        .command-trigger-key {
          font-size: 0.6875rem;
          font-weight: 700;
          background: var(--color-surface);
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--color-border);
        }

        .sidebar-hint {
          margin-top: 0.75rem;
          text-align: center;
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        .sidebar-hint kbd {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 1.25rem;
          height: 1.25rem;
          padding: 0 0.375rem;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          font-family: inherit;
          font-size: 0.6875rem;
          font-weight: 700;
          margin: 0 0.25rem;
        }

        /* Main Wrapper */
        .main-wrapper {
          flex: 1;
          margin-left: 260px;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          transition: margin-left var(--transition-slow);
        }

        .sidebar.collapsed + .main-wrapper,
        .sidebar.collapsed ~ .main-wrapper {
          margin-left: 72px;
        }

        /* Topbar */
        .topbar {
          position: sticky;
          top: 0;
          z-index: 50;
          background: var(--color-surface);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--color-border-subtle);
        }

        .topbar-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.875rem 1.5rem;
          max-width: 1200px;
        }

        .topbar-breadcrumb {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }

        .topbar-breadcrumb-item {
          font-weight: 500;
        }

        .topbar-breadcrumb-item.current {
          color: var(--color-text);
          font-weight: 600;
        }

        .topbar-breadcrumb-sep {
          opacity: 0.5;
        }

        .topbar-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .topbar-action {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          border-radius: var(--radius-md);
          background: transparent;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .topbar-action:hover {
          background: var(--color-surface-2);
        }

        .topbar-action-icon {
          font-size: 1.125rem;
          opacity: 0.8;
          transition: opacity var(--transition-fast);
        }

        .topbar-action:hover .topbar-action-icon {
          opacity: 1;
        }

        /* Main Content */
        .main-content {
          flex: 1;
          padding: 1.5rem;
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
          animation: fadeIn 200ms ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Placeholder Page */
        .main-content.placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
        }

        .placeholder-content {
          text-align: center;
          padding: 3rem;
          animation: slideUp 300ms ease;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .placeholder-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          animation: bounce 2s ease-in-out infinite;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .placeholder-content h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text);
          margin-bottom: 0.5rem;
        }

        .placeholder-content p {
          color: var(--color-text-muted);
          margin-bottom: 1.5rem;
        }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: var(--color-accent);
          color: white;
          border: none;
          border-radius: var(--radius-lg);
          font-weight: 600;
          font-size: 0.9375rem;
          cursor: pointer;
          transition: all var(--transition-base);
        }

        .btn-primary:hover {
          filter: brightness(1.1);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px var(--accent-glow);
        }

        /* Dark Mode */
        @media (prefers-color-scheme: dark) {
          .sidebar {
            background: linear-gradient(180deg, var(--color-surface-2) 0%, var(--color-surface) 100%);
          }

          .sidebar-logo-icon {
            filter: drop-shadow(0 2px 6px rgba(39, 194, 103, 0.3));
          }

          .command-trigger:hover {
            box-shadow: 0 0 0 3px var(--accent-glow), 0 4px 12px rgba(0,0,0,0.2);
          }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .sidebar {
            width: 72px;
          }

          .sidebar-logo-text,
          .sidebar-nav-label,
          .command-trigger-text,
          .command-trigger-key,
          .sidebar-hint {
            display: none;
          }

          .main-wrapper {
            margin-left: 72px;
          }

          .sidebar-toggle {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
