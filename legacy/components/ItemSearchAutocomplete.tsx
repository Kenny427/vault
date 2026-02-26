'use client';

import { useState, useEffect, useRef } from 'react';

interface ItemSearchAutocompleteProps {
  onSelect: (item: { id: number; name: string }) => void;
  placeholder?: string;
}

export default function ItemSearchAutocomplete({ onSelect, placeholder = 'Search items...' }: ItemSearchAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    
    // Debounce search
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        const response = await fetch(`https://prices.runescape.wiki/api/v1/osrs/mapping`);
        const allItems = await response.json();
        const filtered = allItems
          .filter((item: any) => item.name.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 10);
        setSuggestions(filtered);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error searching items:', error);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query]);

  const handleSelect = (item: any) => {
    onSelect({ id: item.id, name: item.name });
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-800 border border-slate-700 rounded px-4 py-2 text-slate-100 focus:outline-none focus:border-osrs-accent"
      />
      
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-osrs-accent"></div>
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {suggestions.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-b-0"
            >
              <div className="font-medium text-slate-100">{item.name}</div>
              <div className="text-xs text-slate-500">ID: {item.id}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
