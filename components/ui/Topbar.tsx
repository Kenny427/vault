'use client';

import { useState, useEffect } from 'react';

interface TopbarProps {
  /** Optional title to display in the topbar */
  title?: string;
  /** Optional right-side content */
  actions?: React.ReactNode;
}

export default function Topbar({ title, actions }: TopbarProps) {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-content">
        {title && <h1 className="topbar-title">{title}</h1>}
        
        <div className="topbar-center">
          <button 
            className="topbar-search"
            onClick={() => {
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
            }}
          >
            <span className="topbar-search-icon">⌘</span>
            <span className="topbar-search-text">Search items...</span>
            <span className="topbar-search-shortcut">
              <kbd>K</kbd>
            </span>
          </button>
        </div>

        <div className="topbar-right">
          {actions}
          <div className="topbar-time">
            <span className="topbar-time-icon">◷</span>
            <span className="topbar-time-value">{currentTime}</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .topbar {
          position: sticky;
          top: 0;
          z-index: 50;
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-border-subtle);
          backdrop-filter: blur(8px);
        }

        .topbar-content {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1.25rem;
          max-width: 100%;
        }

        .topbar-title {
          font-size: var(--text-lg);
          font-weight: var(--font-bold);
          color: var(--color-text);
          letter-spacing: -0.02em;
          margin: 0;
          white-space: nowrap;
        }

        .topbar-center {
          flex: 1;
          display: flex;
          justify-content: center;
          max-width: 400px;
          margin: 0 auto;
        }

        .topbar-search {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          max-width: 320px;
          padding: 0.5rem 0.75rem;
          border: 1px solid var(--color-border);
          background: var(--color-surface-2);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 150ms ease;
        }

        .topbar-search:hover {
          border-color: var(--color-accent);
          background: var(--color-surface);
          box-shadow: 0 0 0 3px var(--glow-accent);
        }

        .topbar-search-icon {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          opacity: 0.7;
        }

        .topbar-search-text {
          flex: 1;
          text-align: left;
          font-size: var(--text-sm);
          color: var(--color-text-muted);
        }

        .topbar-search-shortcut {
          flex-shrink: 0;
        }

        .topbar-search-shortcut kbd {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 1.125rem;
          height: 1.125rem;
          padding: 0 0.25rem;
          background: var(--color-surface);
          border: 1px solid var(--color-border-subtle);
          border-radius: var(--radius-sm);
          font-family: inherit;
          font-size: 0.5625rem;
          font-weight: var(--font-semibold);
          color: var(--color-text-muted);
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .topbar-time {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.625rem;
          background: var(--color-surface-2);
          border-radius: var(--radius-md);
          font-size: var(--text-xs);
          font-weight: var(--font-medium);
          color: var(--color-text-muted);
          font-family: var(--font-mono);
          letter-spacing: 0.02em;
        }

        .topbar-time-icon {
          font-size: 0.75rem;
          animation: pulse 3s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        @media (max-width: 640px) {
          .topbar-title {
            display: none;
          }
          
          .topbar-search-text {
            display: none;
          }
          
          .topbar-search {
            width: auto;
            padding: 0.5rem;
          }
        }
      `}</style>
    </header>
  );
}
