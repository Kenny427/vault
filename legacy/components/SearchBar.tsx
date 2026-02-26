'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { searchItems, ItemData, getPopularItems } from '@/lib/api/osrs';
import { useDashboardStore } from '@/lib/store';

interface SearchBarProps {
  onItemSelect: (item: ItemData) => void;
}

export default function SearchBar({ onItemSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<ItemData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout>();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const { setSearchQuery } = useDashboardStore();

  const handleSearch = useCallback(async (value: string) => {
    setQuery(value);
    setSearchQuery(value);

    if (value.length < 1) {
      // Show popular items when search is empty
      setIsLoading(true);
      try {
        const popular = await getPopularItems();
        setSuggestions(popular.slice(0, 20));
        setIsOpen(true);
      } catch (error) {
        console.error('Failed to load popular items:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchItems(value);
      setSuggestions(results);
      setIsOpen(true);
    } catch (error) {
      console.error('Search error:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [setSearchQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value); // Update immediately for responsive typing
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (value.length === 0) {
      handleSearch(value); // Now async-safe
      return;
    }

    // Debounce the actual search
    debounceTimer.current = setTimeout(() => {
      handleSearch(value);
    }, 150); // Reduced from 300ms to 150ms
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Select the first suggestion if available
      if (suggestions.length > 0) {
        handleSelect(suggestions[0]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setQuery('');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const handleSelect = (item: ItemData) => {
    // Close dropdown immediately to provide visual feedback
    setIsOpen(false);
    
    // Call the navigation callback
    onItemSelect(item);
    
    // Clear search state after a brief delay to ensure navigation completes
    setTimeout(() => {
      setQuery('');
      setSuggestions([]);
    }, 100);
  };

  const handleFocus = async () => {
    if (query.length === 0) {
      await handleSearch('');
    }
    setIsOpen(true);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder="Search items or click to see popular items..."
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-osrs-accent transition-colors"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin h-5 w-5 border-2 border-osrs-accent border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
        >
          {query.length === 0 && (
            <div className="px-4 py-2 text-xs text-slate-500 border-b border-slate-700 sticky top-0 bg-slate-900">
              📈 Popular Trading Items
            </div>
          )}

          {suggestions.map((item) => (
            <button
              type="button"
              key={`${item.id}-${item.name}`}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(item);
              }}
              className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-b-0"
            >
              <div className="font-medium text-slate-100">{item.name}</div>

              <div className="text-xs text-slate-400">
                {item.members ? '(Members)' : '(F2P)'} {item.value && `• GE: ${item.value}`}
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.length >= 1 && suggestions.length === 0 && !isLoading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg p-4 text-center text-slate-400">
          No items found for &quot;{query}&quot;
        </div>
      )}
    </div>
  );
}
