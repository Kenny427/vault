// Command Palette component - Cmd+K / Ctrl+K to open
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface SearchItem {
  id: number;
  name: string;
  icon?: string;
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Search items from API
  const searchItems = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`/api/items/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setResults(data.slice(0, 10)); // Limit to 10 results
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchItems(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, searchItems]);

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
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

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      navigateToItem(results[selectedIndex].id);
    }
  };

  const navigateToItem = (itemId: number) => {
    setIsOpen(false);
    setQuery('');
    router.push(`/item/${itemId}`);
  };

  if (!isOpen) return null;

  // Quick actions
  const quickActions = [
    { id: 'dashboard', name: 'Go to Dashboard', action: () => { setIsOpen(false); router.push('/'); }},
    { id: 'portfolio', name: 'View Portfolio', action: () => { setIsOpen(false); router.push('/portfolio'); }},
    { id: 'opportunities', name: 'Browse Opportunities', action: () => { setIsOpen(false); router.push('/opportunities'); }},
  ];

  const showQuickActions = query.length === 0;
  const displayItems = showQuickActions ? [] : results;

  return (
    <div 
      className="command-palette-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div className="command-palette">
        <div className="command-palette-header">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search items..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="command-palette-input"
          />
          <span className="command-palette-hint">ESC to close</span>
        </div>
        
        <div className="command-palette-results">
          {showQuickActions && (
            <div className="command-palette-section">
              <div className="command-palette-section-title">Quick Actions</div>
              {quickActions.map((action, index) => (
                <button
                  key={action.id}
                  className={`command-palette-item ${index === selectedIndex ? 'selected' : ''}`}
                  onClick={action.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="command-palette-item-icon">→</span>
                  <span className="command-palette-item-text">{action.name}</span>
                </button>
              ))}
            </div>
          )}
          
          {!showQuickActions && (
            <>
              {loading && <div className="command-palette-loading">Searching...</div>}
              {!loading && displayItems.length === 0 && query.length >= 2 && (
                <div className="command-palette-empty">No items found</div>
              )}
              {displayItems.length > 0 && (
                <div className="command-palette-section">
                  <div className="command-palette-section-title">Items</div>
                  {displayItems.map((item, index) => (
                    <button
                      key={item.id}
                      className={`command-palette-item ${index === selectedIndex ? 'selected' : ''}`}
                      onClick={() => navigateToItem(item.id)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <span className="command-palette-item-icon">📦</span>
                      <span className="command-palette-item-text">{item.name}</span>
                      <span className="command-palette-item-id">#{item.id}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .command-palette-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 15vh;
          z-index: 2000;
          animation: fadeIn 100ms ease;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .command-palette {
          width: 100%;
          max-width: 560px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
          overflow: hidden;
          animation: slideDown 150ms ease;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .command-palette-header {
          display: flex;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid var(--border);
          gap: 0.75rem;
        }

        .command-palette-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 1.1rem;
          color: var(--text);
          outline: none;
        }

        .command-palette-input::placeholder {
          color: var(--muted);
        }

        .command-palette-hint {
          font-size: 0.7rem;
          color: var(--muted);
          background: var(--surface-2);
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          white-space: nowrap;
        }

        .command-palette-results {
          max-height: 400px;
          overflow-y: auto;
          padding: 0.5rem;
        }

        .command-palette-section-title {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--muted);
          padding: 0.5rem 0.75rem;
        }

        .command-palette-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.65rem 0.75rem;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          text-align: left;
          color: var(--text);
          transition: background 80ms ease;
        }

        .command-palette-item:hover,
        .command-palette-item.selected {
          background: var(--surface-2);
        }

        .command-palette-item-icon {
          font-size: 1rem;
          opacity: 0.7;
        }

        .command-palette-item-text {
          flex: 1;
          font-size: 0.95rem;
        }

        .command-palette-item-id {
          font-size: 0.75rem;
          color: var(--muted);
          font-family: monospace;
        }

        .command-palette-loading,
        .command-palette-empty {
          padding: 2rem;
          text-align: center;
          color: var(--muted);
          font-size: 0.9rem;
        }

        @media (prefers-color-scheme: dark) {
          .command-palette {
            background: linear-gradient(180deg, var(--surface-2) 0%, var(--surface) 100%);
            border-color: rgba(231, 243, 238, 0.12);
          }
          
          .command-palette-hint {
            background: var(--surface-3);
          }
          
          .command-palette-item.selected {
            background: rgba(39, 194, 103, 0.12);
          }
        }
      `}</style>
    </div>
  );
}
