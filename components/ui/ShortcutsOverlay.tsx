// Keyboard Shortcuts Overlay - Press '?' to show
'use client';

import { useState, useEffect } from 'react';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  { keys: ['?'], description: 'Show this help', category: 'Global' },
  { keys: ['⌘', 'K'], description: 'Search items', category: 'Global' },
  { keys: ['Esc'], description: 'Close modal / Clear search', category: 'Global' },
  { keys: ['↑', '↓'], description: 'Navigate search results', category: 'Search' },
  { keys: ['Enter'], description: 'Go to selected item', category: 'Search' },
  { keys: ['⌘', 'D'], description: 'Go to Dashboard', category: 'Navigation' },
  { keys: ['⌘', 'O'], description: 'Go to Opportunities', category: 'Navigation' },
  { keys: ['⌘', 'P'], description: 'Go to Portfolio', category: 'Navigation' },
];

export default function ShortcutsOverlay() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      if (e.key === '?' && !isInput) {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  // Group shortcuts by category
  const grouped = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  return (
    <div 
      className="shortcuts-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div className="shortcuts-modal">
        <div className="shortcuts-header">
          <h2 className="shortcuts-title">Keyboard Shortcuts</h2>
          <button 
            className="shortcuts-close"
            onClick={() => setIsOpen(false)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        
        <div className="shortcuts-content">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="shortcuts-section">
              <div className="shortcuts-section-title">{category}</div>
              {items.map((shortcut, idx) => (
                <div key={idx} className="shortcuts-row">
                  <div className="shortcuts-keys">
                    {shortcut.keys.map((key, keyIdx) => (
                      <span key={keyIdx}>
                        <kbd className="shortcut-key">{key}</kbd>
                        {keyIdx < shortcut.keys.length - 1 && <span className="shortcut-sep">+</span>}
                      </span>
                    ))}
                  </div>
                  <span className="shortcuts-desc">{shortcut.description}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="shortcuts-footer">
          <span className="shortcuts-footer-hint">Press <kbd>?</kbd> to toggle this menu</span>
        </div>
      </div>

      <style jsx>{`
        .shortcuts-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          z-index: 2500;
          animation: fadeIn 120ms ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .shortcuts-modal {
          width: 100%;
          max-width: 480px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          box-shadow: 0 24px 56px rgba(0, 0, 0, 0.45);
          overflow: hidden;
          animation: scaleIn 180ms ease;
        }

        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }

        .shortcuts-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.1rem 1.25rem;
          border-bottom: 1px solid var(--border);
        }

        .shortcuts-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.02em;
        }

        .shortcuts-close {
          width: 32px;
          height: 32px;
          border: none;
          background: var(--surface-2);
          border-radius: 8px;
          color: var(--muted);
          cursor: pointer;
          display: grid;
          place-items: center;
          font-size: 0.9rem;
          transition: all 100ms ease;
        }

        .shortcuts-close:hover {
          background: var(--surface);
          color: var(--text);
        }

        .shortcuts-content {
          padding: 0.75rem 0.5rem;
          max-height: 60vh;
          overflow-y: auto;
        }

        .shortcuts-section {
          padding: 0.25rem 0.75rem;
        }

        .shortcuts-section-title {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--muted);
          margin: 0.75rem 0 0.5rem;
        }

        .shortcuts-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 0.6rem;
          border-radius: 8px;
          transition: background 80ms ease;
        }

        .shortcuts-row:hover {
          background: var(--surface-2);
        }

        .shortcuts-keys {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .shortcut-key {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 1.75rem;
          height: 1.75rem;
          padding: 0 0.4rem;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 6px;
          font-family: 'IBM Plex Sans', system-ui, sans-serif;
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--text);
          letter-spacing: 0.02em;
        }

        .shortcut-sep {
          color: var(--muted);
          font-size: 0.7rem;
          margin: 0 0.1rem;
        }

        .shortcuts-desc {
          font-size: 0.85rem;
          color: var(--muted);
        }

        .shortcuts-footer {
          padding: 0.85rem 1.25rem;
          border-top: 1px solid var(--border);
          background: var(--surface-2);
        }

        .shortcuts-footer-hint {
          font-size: 0.75rem;
          color: var(--muted);
        }

        .shortcuts-footer-hint kbd {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 1.25rem;
          height: 1.25rem;
          padding: 0 0.3rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 4px;
          font-family: inherit;
          font-size: 0.65rem;
          font-weight: 700;
          margin: 0 0.15rem;
        }

        @media (prefers-color-scheme: dark) {
          .shortcuts-modal {
            background: linear-gradient(180deg, var(--surface-2) 0%, var(--surface) 100%);
            border-color: rgba(231, 243, 238, 0.12);
          }

          .shortcut-key {
            background: var(--surface-3);
            border-color: rgba(231, 243, 238, 0.15);
          }

          .shortcuts-row:hover {
            background: rgba(39, 194, 103, 0.08);
          }

          .shortcuts-footer {
            background: rgba(0, 0, 0, 0.2);
            border-color: rgba(231, 243, 238, 0.1);
          }
        }
      `}</style>
    </div>
  );
}
