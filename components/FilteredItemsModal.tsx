'use client';

import { useState, useRef, useEffect } from 'react';

interface FilteredItem {
  itemId: number;
  itemName: string;
  reason: string;
}

interface AIRejectedItem {
  itemId: number;
  itemName: string;
  systemScore: number;
  systemConfidence: number;
  aiDecision: string;
  aiReasoning: string;
  aiConfidence: number;
}

interface FilteredItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredItems: FilteredItem[];
  aiRejectedItems: AIRejectedItem[];
}

export default function FilteredItemsModal({
  isOpen,
  onClose,
  filteredItems,
  aiRejectedItems = [],
}: FilteredItemsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'stage0' | 'ai'>('stage0');

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
    }
  };

  // Categorize Stage 0 filter reasons
  const categorizeReason = (reason: string) => {
    if (reason.includes('ROI too low')) return 'Low ROI';
    if (reason.includes('Hold time too long')) return 'Hold Time';
    if (reason.includes('Price at/above 90d average')) return 'No Suppression';
    if (reason.includes('Exit target too marginal')) return 'Low Target';
    if (reason.includes('Liquidity too low')) return 'Low Liquidity';
    if (reason.includes('Insufficient history')) return 'Insufficient Data';
    return 'Other';
  };

  // Group Stage 0 by category
  const categorizedStage0 = filteredItems.reduce((acc, item) => {
    const category = categorizeReason(item.reason);
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, FilteredItem[]>);

  // Group AI rejections by stage
  const stage1Rejections = aiRejectedItems.filter(r => r.aiDecision === 'rejected_stage1_mandatory');
  const stage2Rejections = aiRejectedItems.filter(r => r.aiDecision === 'rejected_stage2_quality');

  // Calculate totals
  const totalRejected = filteredItems.length + aiRejectedItems.length;
  const stage0Count = filteredItems.length;
  const aiCount = aiRejectedItems.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-slate-900 border border-slate-700 rounded-lg max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">🔍 Rejection Analysis</h2>
            <p className="text-sm text-slate-400 mt-1">
              {totalRejected} items rejected • Stage 0: {stage0Count} • AI: {aiCount}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-slate-800/50 border-b border-slate-700 flex gap-2 px-6">
          <button
            onClick={() => setActiveTab('stage0')}
            className={`px-6 py-3 font-medium transition-all border-b-2 ${
              activeTab === 'stage0'
                ? 'text-blue-400 border-blue-400'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            Stage 0: Pre-Filter
            <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-700 text-xs">
              {stage0Count}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-6 py-3 font-medium transition-all border-b-2 ${
              activeTab === 'ai'
                ? 'text-purple-400 border-purple-400'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            AI Rejections
            <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-700 text-xs">
              {aiCount}
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'stage0' ? (
            <div className="space-y-4">
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-300 mb-2">📊 Automatic Pre-Filter</h3>
                <p className="text-xs text-slate-400">
                  Items failing basic profitability/feasibility checks (saves ~70% AI cost)
                </p>
              </div>

              {stage0Count === 0 ? (
                <p className="text-slate-400 text-center py-8">
                  ✓ All pool items passed Stage 0 pre-filter
                </p>
              ) : (
                Object.entries(categorizedStage0).map(([category, items]) => (
                  <details key={category} className="border border-slate-700 rounded-lg bg-slate-800/50">
                    <summary className="cursor-pointer p-4 hover:bg-slate-800/80 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-base font-semibold text-blue-300">{category}</span>
                        <span className="px-2.5 py-1 rounded-full bg-slate-700 text-xs font-semibold text-slate-200">
                          {items.length}
                        </span>
                      </div>
                    </summary>
                    <div className="p-4 pt-0 space-y-2 max-h-64 overflow-y-auto">
                      {items.map((item) => (
                        <div
                          key={item.itemId}
                          className="flex items-start justify-between p-3 rounded bg-slate-900/50 border border-slate-700"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-200 truncate">{item.itemName}</p>
                            <p className="text-xs text-slate-500 mt-1">{item.reason}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.itemId)}
                            className="ml-3 px-3 py-1 bg-red-600/80 hover:bg-red-600 text-white text-xs rounded font-medium transition-colors flex-shrink-0"
                            title="Remove from pool"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </details>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-purple-300 mb-2">🤖 AI Quality Control</h3>
                <p className="text-xs text-slate-400">
                  Items analyzed by AI but rejected for structural issues or weak recovery potential
                </p>
              </div>

              {aiCount === 0 ? (
                <p className="text-slate-400 text-center py-8">
                  ✓ All AI-analyzed items were approved
                </p>
              ) : (
                <>
                  {/* Stage 1: Mandatory Rejections */}
                  {stage1Rejections.length > 0 && (
                    <details className="border border-red-700/50 rounded-lg bg-red-900/10">
                      <summary className="cursor-pointer p-4 hover:bg-red-900/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-base font-semibold text-red-400">
                            ⛔ Stage 1: Mandatory Rejections
                          </span>
                          <span className="px-2.5 py-1 rounded-full bg-red-900/50 text-xs font-semibold text-red-300">
                            {stage1Rejections.length}
                          </span>
                        </div>
                        <p className="text-xs text-red-400/70 mt-1">
                          Structural issues • Permanent declines • Critical flaws
                        </p>
                      </summary>
                      <div className="p-4 pt-0 space-y-3 max-h-96 overflow-y-auto">
                        {stage1Rejections.map((item) => (
                          <div
                            key={item.itemId}
                            className="p-4 rounded bg-slate-900/50 border border-red-700/30"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-slate-200">{item.itemName}</h4>
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-900/50 text-red-300">
                                AI: {item.aiConfidence}%
                              </span>
                            </div>
                            <p className="text-sm text-slate-400 leading-relaxed">{item.aiReasoning}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Stage 2: Quality Rejections */}
                  {stage2Rejections.length > 0 && (
                    <details className="border border-orange-700/50 rounded-lg bg-orange-900/10">
                      <summary className="cursor-pointer p-4 hover:bg-orange-900/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-base font-semibold text-orange-400">
                            ⚠️ Stage 2: Quality Rejections
                          </span>
                          <span className="px-2.5 py-1 rounded-full bg-orange-900/50 text-xs font-semibold text-orange-300">
                            {stage2Rejections.length}
                          </span>
                        </div>
                        <p className="text-xs text-orange-400/70 mt-1">
                          Weak signals • Marginal opportunities • Low confidence
                        </p>
                      </summary>
                      <div className="p-4 pt-0 space-y-3 max-h-96 overflow-y-auto">
                        {stage2Rejections.map((item) => (
                          <div
                            key={item.itemId}
                            className="p-4 rounded bg-slate-900/50 border border-orange-700/30"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-slate-200">{item.itemName}</h4>
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-900/50 text-orange-300">
                                AI: {item.aiConfidence}%
                              </span>
                            </div>
                            <p className="text-sm text-slate-400 leading-relaxed">{item.aiReasoning}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-800 border-t border-slate-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-400">
              {activeTab === 'stage0' 
                ? '💡 Stage 0 filters items before AI to reduce costs'
                : '🧠 AI rejections reveal why opportunities don\'t meet quality standards'}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
