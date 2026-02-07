'use client';

import { useState, useRef, useEffect } from 'react';

interface FilteredItem {
  itemId: number;
  itemName: string;
  reason: string;
}

interface FilteredItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredItems: FilteredItem[];
}

export default function FilteredItemsModal({
  isOpen,
  onClose,
  filteredItems,
}: FilteredItemsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [removingItem, setRemovingItem] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleRemoveItem = (itemId: number) => {
    // Store in localStorage to persist removal preference
    const removed = JSON.parse(localStorage.getItem('osrs-removed-items') || '[]');
    if (!removed.includes(itemId)) {
      removed.push(itemId);
      localStorage.setItem('osrs-removed-items', JSON.stringify(removed));
      setRemovingItem(itemId);
      setTimeout(() => setRemovingItem(null), 300);
    }
  };

  // Categorize filter reasons for better organization
  const categorizeReason = (reason: string) => {
    if (reason.includes('ROI too low')) return 'Low ROI (<10%)';
    if (reason.includes('Hold time too long')) return 'Hold Time Too Long';
    if (reason.includes('Price at/above 90d average')) return 'No Price Suppression';
    if (reason.includes('Exit target too marginal')) return 'Marginal Exit Target';
    if (reason.includes('Liquidity too low')) return 'Low Liquidity';
    if (reason.includes('Insufficient history')) return 'Insufficient Data';
    return 'Other';
  };

  // Group by category
  const categorizedItems = filteredItems.reduce((acc, item) => {
    const category = categorizeReason(item.reason);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, FilteredItem[]>);

  // Sort categories by count (largest first)
  const categoryOrder = ['Low ROI (<10%)', 'No Price Suppression', 'Hold Time Too Long', 'Marginal Exit Target', 'Low Liquidity', 'Insufficient Data', 'Other'];
  const sortedCategories = categoryOrder.filter(cat => categorizedItems[cat] && categorizedItems[cat].length > 0);

  if (!isOpen) return null;

  // Calculate summary stats
  const totalFiltered = filteredItems.length;
  const categoryCounts = sortedCategories.map(cat => ({
    name: cat,
    count: categorizedItems[cat].length,
    percentage: ((categorizedItems[cat].length / totalFiltered) * 100).toFixed(0)
  }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-slate-900 border border-slate-700 rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">🔍 Stage 0 Pre-Filter Results</h2>
            <p className="text-sm text-slate-400 mt-1">
              {totalFiltered} items filtered before AI analysis
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {filteredItems.length === 0 ? (
            <p className="text-slate-400 text-center py-8">
              No filtered items this refresh. All pool items passed Stage 0 pre-filter.
            </p>
          ) : (
            <>
              {/* Summary Section */}
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-300 mb-3">📊 Filter Summary</h3>
                <div className="grid grid-cols-2 gap-3">
                  {categoryCounts.map((cat) => (
                    <div key={cat.name} className="bg-slate-800/50 rounded p-3 border border-slate-700">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-300">{cat.name}</span>
                        <span className="text-xs font-semibold text-blue-400">{cat.percentage}%</span>
                      </div>
                      <div className="text-2xl font-bold text-slate-100">{cat.count}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed Categories */}
              {sortedCategories.map((category) => (
                <details key={category} className="border border-slate-700 rounded-lg bg-slate-800/50" open={category === sortedCategories[0]}>
                  <summary className="cursor-pointer p-4 hover:bg-slate-800/80 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-osrs-accent">{category}</span>
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-slate-700 text-xs font-semibold text-slate-200">
                        {categorizedItems[category].length} items
                      </span>
                    </div>
                  </summary>

                  <div className="p-4 pt-0 space-y-2 max-h-64 overflow-y-auto">
                    {categorizedItems[category].map((item) => (
                      <div
                        key={item.itemId}
                        className={`flex items-center justify-between p-3 rounded bg-slate-900/50 border border-slate-700 transition-all ${
                          removingItem === item.itemId ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-slate-200">{item.itemName}</p>
                          <p className="text-xs text-slate-500 mt-1">{item.reason}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item.itemId)}
                          className="ml-4 px-3 py-1 bg-red-600/80 hover:bg-red-600 text-white text-xs rounded font-medium transition-colors"
                          title="Remove from pool"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 p-4">
          <p className="text-xs text-slate-400 mb-3">
            💡 Stage 0 removes unprofitable items before AI analysis (saves 70% cost). Items shown passed data quality checks but failed profitability thresholds.
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
