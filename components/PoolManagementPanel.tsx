'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface FilteredItemStats {
  itemId: number;
  itemName: string;
  filterCount: number;
  lastReason: string;
  lastFilteredAt: string;
}

export default function PoolManagementPanel() {
  const [stats, setStats] = useState<FilteredItemStats[]>([]);
  const [sortBy, setSortBy] = useState<'count' | 'name' | 'recent'>('count');
  const router = useRouter();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = () => {
    // Load from localStorage
    const stored = localStorage.getItem('osrs-filtered-stats') || '{}';
    const statsMap = JSON.parse(stored);
    
    const statsList = Object.values(statsMap) as FilteredItemStats[];
    setStats(statsList);
  };

  const sortedStats = [...stats].sort((a, b) => {
    switch (sortBy) {
      case 'count':
        return b.filterCount - a.filterCount;
      case 'name':
        return a.itemName.localeCompare(b.itemName);
      case 'recent':
        return new Date(b.lastFilteredAt).getTime() - new Date(a.lastFilteredAt).getTime();
      default:
        return 0;
    }
  });

  const handleClearStats = () => {
    if (confirm('Clear all filter statistics? This cannot be undone.')) {
      localStorage.removeItem('osrs-filtered-stats');
      setStats([]);
    }
  };

  const handleRemoveFromPool = (itemId: number, itemName: string) => {
    if (confirm(`Remove "${itemName}" from the analysis pool?\n\nYou'll need to manually re-add it later by editing expandedItemPool.ts`)) {
      const removed = JSON.parse(localStorage.getItem('osrs-removed-items') || '[]');
      if (!removed.includes(itemId)) {
        removed.push(itemId);
        localStorage.setItem('osrs-removed-items', JSON.stringify(removed));
        alert(`✅ "${itemName}" marked as removed. It won't appear in future analyses.`);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Pool Management</h2>
        <p className="text-sm text-slate-400">
          Track items that get filtered out during analysis to optimize your pool.
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-xs text-slate-400 uppercase font-semibold">Total Tracked</p>
          <p className="text-2xl font-bold text-osrs-accent mt-1">{stats.length}</p>
          <p className="text-xs text-slate-500 mt-2">Items with filter history</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-xs text-slate-400 uppercase font-semibold">Total Filters</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">
            {stats.reduce((sum, s) => sum + s.filterCount, 0)}
          </p>
          <p className="text-xs text-slate-500 mt-2">Across all items</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-xs text-slate-400 uppercase font-semibold">Avg Filters</p>
          <p className="text-2xl font-bold text-purple-400 mt-1">
            {stats.length > 0 ? (stats.reduce((sum, s) => sum + s.filterCount, 0) / stats.length).toFixed(1) : '0'}
          </p>
          <p className="text-xs text-slate-500 mt-2">Per item</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('count')}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
              sortBy === 'count'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Most Filtered
          </button>
          <button
            onClick={() => setSortBy('recent')}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
              sortBy === 'recent'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Most Recent
          </button>
          <button
            onClick={() => setSortBy('name')}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
              sortBy === 'name'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            A-Z
          </button>
        </div>
        <button
          onClick={handleClearStats}
          className="ml-auto px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-sm font-medium transition-colors"
        >
          Clear Stats
        </button>
      </div>

      {/* Items Table */}
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        {stats.length === 0 ? (
          <div className="p-6 text-center text-slate-400">
            <p>No filtered items yet. Run an analysis to start tracking.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Item Name</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-300">Filter Count</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Last Reason</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-300">Last Filtered</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-300">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {sortedStats.map((item) => (
                <tr key={item.itemId} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-slate-200 font-medium">
                    <button
                      onClick={() => router.push(`/item/${item.itemId}`)}
                      className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                    >
                      {item.itemName}
                    </button>
                    <p className="text-xs text-slate-500 mt-1">ID: {item.itemId}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-red-600/20 text-red-300 font-semibold">
                      {item.filterCount}x
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">{item.lastReason}</td>
                  <td className="px-4 py-3 text-sm text-right text-slate-500">
                    {new Date(item.lastFilteredAt).toLocaleDateString()} {new Date(item.lastFilteredAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRemoveFromPool(item.itemId, item.itemName)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded font-medium transition-colors"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <h3 className="font-semibold text-slate-200 mb-3">📌 How to Manage Your Pool</h3>
        <div className="space-y-3 text-sm text-slate-400">
          <div>
            <p className="font-medium text-slate-300 mb-1">✂️ Remove Items:</p>
            <p>Click &quot;Remove&quot; button above to exclude items from analysis. Marked items won&apos;t appear in future refreshes.</p>
          </div>
          <div>
            <p className="font-medium text-slate-300 mb-1">➕ Add Items:</p>
            <p>
              Edit{' '}
              <code className="bg-slate-900 px-2 py-1 rounded text-xs">lib/expandedItemPool.ts</code> and add new items to the array. See examples in the file.
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-300 mb-1">💡 Tips:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Items filtered 5+ times are candidates for removal</li>
              <li>Watch for patterns: &quot;Always above averages&quot; = bad for mean-reversion</li>
              <li>Low liquidity items waste analysis time</li>
              <li>Optimize quarterly based on filter stats</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
