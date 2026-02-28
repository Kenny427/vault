'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [recentSearches, setRecentSearches] = useState<SearchItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('vault-recent-searches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // Save recent search
  const saveRecentSearch = useCallback((item: SearchItem) => {
    const updated = [item, ...recentSearches.filter(i => i.id !== item.id)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('vault-recent-searches', JSON.stringify(updated));
  }, [recentSearches]);

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
      setResults(data.slice(0, 10));
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
    }, 150);
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
    const totalItems = (query.length === 0 ? quickActions.length : 0) + 
                       (query.length === 0 && recentSearches.length > 0 ? recentSearches.length : 0) +
                       results.length;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, totalItems - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (query.length === 0 && selectedIndex < quickActions.length) {
        quickActions[selectedIndex].action();
      } else if (query.length === 0 && recentSearches.length > 0 && selectedIndex < quickActions.length + recentSearches.length) {
        const idx = selectedIndex - quickActions.length;
        navigateToItem(recentSearches[idx]);
      } else if (results.length > 0) {
        const idx = selectedIndex - quickActions.length - (recentSearches.length > 0 && query.length === 0 ? recentSearches.length : 0);
        if (results[idx]) navigateToItem(results[idx]);
      }
    }
  };

  const navigateToItem = (item: SearchItem) => {
    saveRecentSearch(item);
    setIsOpen(false);
    setQuery('');
    router.push(`/item/${item.id}`);
  };

  if (!isOpen) return null;

  // Quick actions
  const quickActions = [
    { id: 'dashboard', name: 'Go to Dashboard', icon: '⌂', action: () => { setIsOpen(false); router.push('/'); }},
    { id: 'portfolio', name: 'View Portfolio', icon: '◈', action: () => { setIsOpen(false); router.push('/portfolio'); }},
    { id: 'opportunities', name: 'Browse Opportunities', icon: '◎', action: () => { setIsOpen(false); router.push('/opportunities'); }},
    { id: 'theses', name: 'View Theses', icon: '✎', action: () => { setIsOpen(false); router.push('/theses'); }},
  ];

  const showQuickActions = query.length === 0;
  const showRecent = query.length === 0 && recentSearches.length > 0;
  const displayItems = results;

  // Calculate selected index offset
  const getItemIndex = (section: 'actions' | 'recent' | 'results', idx: number) => {
    if (section === 'actions') return idx;
    if (section === 'recent') return quickActions.length + idx;
    return quickActions.length + (showRecent ? recentSearches.length : 0) + idx;
  };

  let currentIndex = 0;

  return (
    <div 
      className="command-palette-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div className="command-palette">
        <div className="command-palette-header">
          <span className="command-palette-search-icon">⌘</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search items by name or ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="command-palette-input"
          />
          <span className="command-palette-hint">ESC</span>
        </div>
        
        <div className="command-palette-results">
          {showQuickActions && (
            <div className="command-palette-section">
              <div className="command-palette-section-title">Quick Navigation</div>
              {quickActions.map((action, idx) => {
                const isSelected = selectedIndex === currentIndex++;
                return (
                  <button
                    key={action.id}
                    className={`command-palette-item ${isSelected ? 'selected' : ''}`}
                    onClick={action.action}
                    onMouseEnter={() => setSelectedIndex(getItemIndex('actions', idx))}
                  >
                    <span className="command-palette-item-icon">{action.icon}</span>
                    <span className="command-palette-item-text">{action.name}</span>
                    <span className="command-palette-item-shortcut">
                      <kbd>⌘{action.name === 'Go to Dashboard' ? 'D' : action.name === 'View Portfolio' ? 'P' : action.name === 'Browse Opportunities' ? 'O' : 'T'}</kbd>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          
          {showRecent && (
            <div className="command-palette-section">
              <div className="command-palette-section-title">Recent Searches</div>
              {recentSearches.map((item, idx) => {
                const isSelected = selectedIndex === currentIndex++;
                return (
                  <button
                    key={item.id}
                    className={`command-palette-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => navigateToItem(item)}
                    onMouseEnter={() => setSelectedIndex(getItemIndex('recent', idx))}
                  >
                    <span className="command-palette-item-icon">📦</span>
                    <span className="command-palette-item-text">{item.name}</span>
                    <span className="command-palette-item-id">#{item.id}</span>
                  </button>
                );
              })}
            </div>
          )}
          
          {!showQuickActions && (
            <>
              {loading && (
                <div className="command-palette-loading">
                  <span className="command-palette-spinner"></span>
                  Searching...
                </div>
              )}
              {!loading && displayItems.length === 0 && query.length >= 2 && (
                <div className="command-palette-empty">
                  <span className="command-palette-empty-icon">∅</span>
                  No items found for &quot;{query}&quot;
                </div>
              )}
              {displayItems.length > 0 && (
                <div className="command-palette-section">
                  <div className="command-palette-section-title">Items ({displayItems.length})</div>
                  {displayItems.map((item, idx) => {
                    const isSelected = selectedIndex === currentIndex++;
                    return (
                      <button
                        key={item.id}
                        className={`command-palette-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => navigateToItem(item)}
                        onMouseEnter={() => setSelectedIndex(getItemIndex('results', idx))}
                      >
                        <span className="command-palette-item-icon">📦</span>
                        <span className="command-palette-item-text">{item.name}</span>
                        <span className="command-palette-item-id">#{item.id}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <div className="command-palette-footer">
          <span className="command-palette-footer-item">
            <kbd>↑</kbd><kbd>↓</kbd> Navigate
          </span>
          <span className="command-palette-footer-item">
            <kbd>↵</kbd> Select
          </span>
          <span className="command-palette-footer-item">
            <kbd>ESC</kbd> Close
          </span>
        </div>
      </div>

      <style jsx>{`
        .command-palette-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 12vh;
          z-index: 2000;
          animation: fadeIn 100ms ease;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .command-palette {
          width: 100%;
          max-width: 580px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-2xl);
          box-shadow: 0 24px 56px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--glow-accent);
          overflow: hidden;
          animation: slideDown 150ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-16px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .command-palette-header {
          display: flex;
          align-items: center;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--color-border-subtle);
          gap: 0.75rem;
        }

        .command-palette-search-icon {
          font-size: 1rem;
          color: var(--color-accent);
          opacity: 0.8;
        }

        .command-palette-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: var(--text-base);
          color: var(--color-text);
          outline: none;
          font-family: inherit;
        }

        .command-palette-input::placeholder {
          color: var(--color-text-muted);
        }

        .command-palette-hint {
          font-size: 0.625rem;
          font-weight: var(--font-semibold);
          color: var(--color-text-muted);
          background: var(--color-surface-2);
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          letter-spacing: 0.02em;
        }

        .command-palette-results {
          max-height: 420px;
          overflow-y: auto;
          padding: 0.5rem;
        }

        .command-palette-section {
          margin-bottom: 0.5rem;
        }

        .command-palette-section-title {
          font-size: 0.625rem;
          font-weight: var(--font-bold);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-text-muted);
          padding: 0.5rem 0.75rem 0.375rem;
        }

        .command-palette-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.625rem 0.75rem;
          border: none;
          background: transparent;
          border-radius: var(--radius-lg);
          cursor: pointer;
          text-align: left;
          color: var(--color-text);
          font-family: inherit;
          transition: all 80ms ease;
        }

        .command-palette-item:hover,
        .command-palette-item.selected {
          background: var(--glow-accent);
        }

        .command-palette-item.selected {
          box-shadow: inset 0 0 0 1px var(--color-accent);
        }

        .command-palette-item-icon {
          font-size: 1rem;
          opacity: 0.8;
          width: 24px;
          text-align: center;
        }

        .command-palette-item-text {
          flex: 1;
          font-size: var(--text-sm);
          font-weight: var(--font-medium);
        }

        .command-palette-item-shortcut {
          flex-shrink: 0;
        }

        .command-palette-item-shortcut kbd {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 1.5rem;
          height: 1.25rem;
          padding: 0 0.25rem;
          background: var(--color-surface-2);
          border: 1px solid var(--color-border-subtle);
          border-radius: var(--radius-sm);
          font-family: inherit;
          font-size: 0.5625rem;
          font-weight: var(--font-semibold);
          color: var(--color-text-muted);
        }

        .command-palette-item-id {
          font-size: 0.6875rem;
          color: var(--color-text-muted);
          font-family: var(--font-mono);
        }

        .command-palette-loading,
        .command-palette-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 2.5rem 1rem;
          text-align: center;
          color: var(--color-text-muted);
          font-size: var(--text-sm);
        }

        .command-palette-empty-icon {
          font-size: 1.5rem;
          opacity: 0.5;
        }

        .command-palette-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid var(--color-surface-2);
          border-top-color: var(--color-accent);
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .command-palette-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1.5rem;
          padding: 0.75rem 1rem;
          border-top: 1px solid var(--color-border-subtle);
          background: var(--color-surface-2);
        }

        .command-palette-footer-item {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.6875rem;
          color: var(--color-text-muted);
        }

        .command-palette-footer-item kbd {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 1rem;
          height: 1rem;
          padding: 0 0.25rem;
          background: var(--color-surface);
          border: 1px solid var(--color-border-subtle);
          border-radius: var(--radius-sm);
          font-family: inherit;
          font-size: 0.5625rem;
          font-weight: var(--font-semibold);
        }

        @media (prefers-color-scheme: dark) {
          .command-palette {
            background: linear-gradient(180deg, var(--color-surface-2) 0%, var(--color-surface) 100%);
            border-color: var(--color-border-accent);
          }
          
          .command-palette-item.selected {
            background: rgba(212, 167, 83, 0.15);
          }
        }
      `}</style>
    </div>
  );
}
