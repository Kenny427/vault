'use client';

import { useState } from 'react';
import { usePriceAlertsStore } from '@/lib/priceAlertsStore';

interface SetAlertModalProps {
  itemId: number;
  itemName: string;
  currentPrice: number;
  onClose: () => void;
}

export default function SetAlertModal({ itemId, itemName, currentPrice, onClose }: SetAlertModalProps) {
  const addAlert = usePriceAlertsStore(state => state.addAlert);
  const [condition, setCondition] = useState<'above' | 'below'>('below');
  const [targetPrice, setTargetPrice] = useState(Math.floor(currentPrice * 0.9));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addAlert({
      itemId,
      itemName,
      targetPrice,
      condition,
    });
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div 
        className="bg-slate-900 border-2 border-osrs-accent/30 rounded-lg max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold text-slate-100 mb-1">Set Price Alert</h2>
          <p className="text-slate-400 text-sm mb-6">{itemName}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-slate-800 border border-slate-700 rounded p-3">
              <p className="text-xs text-slate-400 mb-1">Current Price</p>
              <p className="text-xl font-bold text-slate-100">{currentPrice.toLocaleString()}gp</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Alert Condition
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCondition('below')}
                  className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                    condition === 'below'
                      ? 'border-red-500 bg-red-900/20 text-red-400'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="text-2xl mb-1">📉</div>
                  <div className="text-sm font-medium">Below</div>
                </button>
                <button
                  type="button"
                  onClick={() => setCondition('above')}
                  className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                    condition === 'above'
                      ? 'border-green-500 bg-green-900/20 text-green-400'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="text-2xl mb-1">📈</div>
                  <div className="text-sm font-medium">Above</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Target Price (gp)
              </label>
              <input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100"
                required
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setTargetPrice(Math.floor(currentPrice * 0.9))}
                  className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded"
                >
                  -10%
                </button>
                <button
                  type="button"
                  onClick={() => setTargetPrice(Math.floor(currentPrice * 0.95))}
                  className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded"
                >
                  -5%
                </button>
                <button
                  type="button"
                  onClick={() => setTargetPrice(Math.floor(currentPrice * 1.05))}
                  className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded"
                >
                  +5%
                </button>
                <button
                  type="button"
                  onClick={() => setTargetPrice(Math.floor(currentPrice * 1.1))}
                  className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded"
                >
                  +10%
                </button>
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-700/50 rounded p-3">
              <p className="text-sm text-blue-300">
                You&apos;ll be notified when <span className="font-semibold">{itemName}</span> goes{' '}
                <span className={condition === 'above' ? 'text-green-400' : 'text-red-400'}>
                  {condition}
                </span>{' '}
                <span className="font-semibold">{targetPrice.toLocaleString()}gp</span>
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 bg-osrs-accent hover:bg-osrs-accent/90 text-slate-900 font-semibold rounded-lg transition-colors"
              >
                Set Alert
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
