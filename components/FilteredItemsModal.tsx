'use client';

import { useState, useRef, useEffect } from 'react';
import { EXPANDED_ITEM_POOL } from '@/lib/expandedItemPool';

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

  // Group by reason
  const groupedByReason = filteredItems.reduce((acc, item) => {
    if (!acc[item.reason]) {
      acc[item.reason] = [];
    }
    acc[item.reason].push(item);
    return acc;
  }, {} as Record<string, FilteredItem[]>);

  const reasonKeys = Object.keys(groupedByReason).sort((a, b) => groupedByReason[b].length - groupedByReason[a].length);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-slate-900 border border-slate-700 rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">🔍 Filtered Items</h2>
            <p className="text-sm text-slate-400 mt-1">
              {filteredItems.length} items didn&apos;t pass analysis thresholds
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
              No filtered items this refresh. All pool items passed initial checks.
            </p>
          ) : (
            reasonKeys.map((reason) => (
              <div key={reason} className="border border-slate-700 rounded-lg p-4 bg-slate-800/50">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold text-osrs-accent">{reason}</h3>
                  <span className="ml-auto inline-flex items-center justify-center px-3 py-1 rounded-full bg-slate-700 text-xs font-semibold text-slate-200">
                    {groupedByReason[reason].length}
                  </span>
                </div>

                <div className="space-y-2">
                  {groupedByReason[reason].map((item) => (
                    <div
                      key={item.itemId}
                      className={`flex items-center justify-between p-3 rounded bg-slate-900/50 border border-slate-700 transition-all ${
                        removingItem === item.itemId ? 'opacity-50' : ''
                      }`}
                    >
                      <div>
                        <p className="font-medium text-slate-200">{item.itemName}</p>
                        <p className="text-xs text-slate-500">ID: {item.itemId}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.itemId)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded font-medium transition-colors"
                        title="Mark item as removed from pool (won't show in analysis)"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 p-4">
          <p className="text-xs text-slate-400 mb-3">
            💡 Tip: Repeatedly filtered items are candidates for removal from the pool to speed up analysis.
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
