'use client';

import { useState, useEffect } from 'react';
import { POPULAR_CATEGORIES } from '@/lib/api/osrs';

interface PoolAIReview {
  add: string[];
  remove: string[];
  notes: string[];
}

export default function PoolManager() {
  const [poolItems, setPoolItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [aiReview, setAiReview] = useState<PoolAIReview | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);

  useEffect(() => {
    setPoolItems([...POPULAR_CATEGORIES].sort());
  }, []);

  const categories = {
    all: 'All Items',
    logs: 'Logs & Fletching',
    ores: 'Ores & Bars',
    bones: 'Bones',
    herbs: 'Herblore',
    dragonhide: 'Dragonhides & Leather',
    runes: 'Runes & Essence',
    fish: 'Fish',
    gems: 'Gems & Jewelry',
    ammo: 'Ammo & Combat',
  };

  const categorizeItem = (item: string): string => {
    const lower = item.toLowerCase();
    if (lower.includes('log') || lower.includes('bow') || lower.includes('arrow shaft') || lower.includes('feather') || lower.includes('flax')) return 'logs';
    if (lower.includes('ore') || lower.includes('bar') || lower.includes('coal')) return 'ores';
    if (lower.includes('bone')) return 'bones';
    if (lower.includes('herb') || lower.includes('weed') || lower.includes('potion') || lower.includes('seed') || lower.includes('ranarr') || lower.includes('snapdragon') || lower.includes('torstol') || lower.includes('avantoe') || lower.includes('kwuarm') || lower.includes('cadantine') || lower.includes('lantadyme') || lower.includes('dwarf weed') || lower.includes('toadflax')) return 'herbs';
    if (lower.includes('dragonhide') || lower.includes('dragon leather')) return 'dragonhide';
    if (lower.includes('rune') || lower.includes('essence')) return 'runes';
    if (lower.includes('raw ') || lower.includes('fish')) return 'fish';
    if (lower.includes('uncut') || lower.includes('sapphire') || lower.includes('emerald') || lower.includes('ruby') || lower.includes('diamond') || lower.includes('dragonstone') || lower.includes('zenyte') || lower.includes('ring') || lower.includes('amulet') || lower.includes('necklace') || lower.includes('bracelet')) return 'gems';
    if (lower.includes('bolt') || lower.includes('arrow') || lower.includes('cannonball') || lower.includes('dart')) return 'ammo';
    return 'other';
  };

  const filteredItems = poolItems.filter(item => {
    const matchesSearch = item.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || categorizeItem(item) === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleAddItem = () => {
    const trimmed = newItem.trim().toLowerCase();
    if (!trimmed) return;
    
    if (poolItems.some(item => item.toLowerCase() === trimmed)) {
      alert('Item already exists in pool!');
      return;
    }

    const updatedPool = [...poolItems, trimmed].sort();
    setPoolItems(updatedPool);
    setNewItem('');
    
    // Show code to copy
    alert(`Item added! To persist this change, add "${trimmed}" to POPULAR_CATEGORIES in lib/api/osrs.ts`);
  };

  const handleAIReview = async () => {
    if (poolItems.length === 0) return;

    setIsReviewing(true);
    try {
      const response = await fetch('/api/analyze-pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(poolItems),
        keepalive: true,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze pool');
      }

      const review = await response.json();
      setAiReview(review);
    } catch (error) {
      console.error('AI pool review failed:', error);
      alert('Failed to review pool. Please try again.');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleRemoveItem = (itemToRemove: string) => {
    if (!confirm(`Remove "${itemToRemove}" from pool?`)) return;
    
    const updatedPool = poolItems.filter(item => item !== itemToRemove);
    setPoolItems(updatedPool);
    
    alert(`Item removed! To persist this change, remove "${itemToRemove}" from POPULAR_CATEGORIES in lib/api/osrs.ts`);
  };

  const getCategoryCount = (cat: string) => {
    if (cat === 'all') return poolItems.length;
    return poolItems.filter(item => categorizeItem(item) === cat).length;
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
          <h2 className="text-2xl font-bold text-slate-100">Item Pool Manager</h2>
          <div className="flex gap-2">
            <button
              onClick={handleAIReview}
              disabled={isReviewing || poolItems.length === 0}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-semibold rounded transition-colors"
              title="AI reviews pool and suggests add/remove items"
            >
              {isReviewing ? '⏳ Reviewing...' : '🤖 AI Review Pool'}
            </button>
            {aiReview && (
              <button
                onClick={() => setAiReview(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded transition-colors"
                title="Clear AI review"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <p className="text-slate-400 text-sm mb-4">
          Manage the items analyzed for flip opportunities. Changes here are temporary - update POPULAR_CATEGORIES in lib/api/osrs.ts to persist.
        </p>

        {aiReview && (
          <div className="mb-6 bg-gradient-to-br from-purple-900/30 to-blue-900/20 border border-purple-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-purple-300">🤖 AI Pool Suggestions</h3>
              <span className="text-xs text-slate-400">One batch call</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <h4 className="text-sm font-semibold text-green-400 mb-2">Add</h4>
                {aiReview.add.length > 0 ? (
                  <ul className="space-y-1 text-sm text-slate-200">
                    {aiReview.add.map((item) => (
                      <li key={`add-${item}`} className="flex items-center gap-2">
                        <span className="text-green-400">+</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">No additions suggested.</p>
                )}
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <h4 className="text-sm font-semibold text-red-400 mb-2">Remove</h4>
                {aiReview.remove.length > 0 ? (
                  <ul className="space-y-1 text-sm text-slate-200">
                    {aiReview.remove.map((item) => (
                      <li key={`remove-${item}`} className="flex items-center gap-2">
                        <span className="text-red-400">-</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">No removals suggested.</p>
                )}
              </div>
            </div>
            {aiReview.notes.length > 0 && (
              <div className="mt-4 bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <h4 className="text-sm font-semibold text-slate-300 mb-2">Notes</h4>
                <ul className="space-y-1 text-sm text-slate-300">
                  {aiReview.notes.map((note, i) => (
                    <li key={`note-${i}`} className="flex items-start gap-2">
                      <span className="text-purple-400 mt-0.5">•</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Add New Item */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
            placeholder="Enter exact item name (e.g., 'dragon bones')"
            className="flex-1 px-4 py-2 bg-slate-800 border border-slate-600 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:border-osrs-accent"
          />
          <button
            onClick={handleAddItem}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded transition-colors"
          >
            Add Item
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search items..."
            className="flex-1 px-4 py-2 bg-slate-800 border border-slate-600 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:border-osrs-accent"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-600 rounded text-slate-100 focus:outline-none focus:border-osrs-accent"
          >
            {Object.entries(categories).map(([key, label]) => (
              <option key={key} value={key}>
                {label} ({getCategoryCount(key)})
              </option>
            ))}
          </select>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.entries(categories).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setCategoryFilter(key)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                categoryFilter === key
                  ? 'bg-osrs-accent text-slate-900'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {label.split(' ')[0]} ({getCategoryCount(key)})
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="bg-slate-800/50 rounded-lg p-4 max-h-96 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {filteredItems.map((item) => (
              <div
                key={item}
                className="flex items-center justify-between bg-slate-700/50 hover:bg-slate-700 p-2 rounded group transition-colors"
              >
                <span className="text-slate-200 text-sm truncate flex-1">{item}</span>
                <button
                  onClick={() => handleRemoveItem(item)}
                  className="ml-2 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          {filteredItems.length === 0 && (
            <div className="text-center text-slate-500 py-8">
              No items match your search
            </div>
          )}
        </div>

        {/* Export Button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => {
              const code = `export const POPULAR_CATEGORIES = [\n  ${poolItems.map(item => `'${item}'`).join(',\n  ')}\n];`;
              navigator.clipboard.writeText(code);
              alert('Pool array copied to clipboard! Paste into lib/api/osrs.ts');
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition-colors"
          >
            📋 Copy Pool to Clipboard
          </button>
        </div>
      </div>
    </div>
  );
}
