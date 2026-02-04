'use client';

import { useState } from 'react';

interface BulkAnalysisProps {
  items: Array<{ itemId: number; itemName: string; currentPrice: number; avg30d?: number; avg90d?: number; volatility?: number }>;
}

export default function BulkAnalysis({ items }: BulkAnalysisProps) {
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const toggleItem = (itemId: number) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId].slice(0, 10) // Max 10 items
    );
  };

  const handleAnalyze = async () => {
    const itemsToAnalyze = items.filter(item => selectedItems.includes(item.itemId));
    
    if (itemsToAnalyze.length === 0) return;

    setAnalyzing(true);
    setAnalysis(null);

    try {
      const response = await fetch('/api/bulk-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToAnalyze }),
      });

      const data = await response.json();
      setAnalysis(data.analysis);
    } catch (error) {
      console.error('Bulk analysis failed:', error);
      setAnalysis('❌ Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">
          🔍 Bulk AI Analysis (Max 10 items)
        </h3>

        <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
          {items.slice(0, 20).map((item) => (
            <label
              key={item.itemId}
              className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-750 rounded-lg cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedItems.includes(item.itemId)}
                onChange={() => toggleItem(item.itemId)}
                disabled={!selectedItems.includes(item.itemId) && selectedItems.length >= 10}
                className="w-4 h-4"
              />
              <div className="flex-1">
                <div className="font-medium text-slate-100">{item.itemName}</div>
                <div className="text-xs text-slate-400">{item.currentPrice.toLocaleString()}gp</div>
              </div>
            </label>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-slate-400">
            {selectedItems.length} of 10 items selected
          </span>
          <button
            onClick={handleAnalyze}
            disabled={selectedItems.length === 0 || analyzing}
            className="px-6 py-3 bg-osrs-accent hover:bg-osrs-accent/90 text-slate-900 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? 'Analyzing...' : `Analyze ${selectedItems.length} Items`}
          </button>
        </div>

        {analyzing && (
          <div className="bg-slate-800 border border-slate-700 rounded p-4 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-osrs-accent mx-auto mb-3"></div>
            <p className="text-slate-400">AI is analyzing your selections...</p>
          </div>
        )}

        {analysis && !analyzing && (
          <div className="bg-slate-800 border border-slate-700 rounded p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="text-2xl">🤖</div>
              <div>
                <h4 className="font-semibold text-slate-100 mb-1">AI Analysis Results</h4>
                <p className="text-xs text-slate-400">Cost: ~$0.01-0.02</p>
              </div>
            </div>
            <div className="text-sm text-slate-300 whitespace-pre-wrap">{analysis}</div>
          </div>
        )}
      </div>
    </div>
  );
}
