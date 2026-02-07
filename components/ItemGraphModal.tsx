'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PriceChart from './PriceChart';
import { getItemHistory, getItemPrice } from '@/lib/api/osrs';

const TIMEFRAMES = [
  { value: '7d', label: '7D', seconds: 7 * 24 * 60 * 60 },
  { value: '30d', label: '30D', seconds: 30 * 24 * 60 * 60 },
  { value: '90d', label: '90D', seconds: 90 * 24 * 60 * 60 },
  { value: '180d', label: '180D', seconds: 180 * 24 * 60 * 60 },
  { value: '1y', label: '1Y', seconds: 365 * 24 * 60 * 60 },
] as const;

type Timeframe = typeof TIMEFRAMES[number]['value'];

interface ItemGraphModalProps {
  itemId: number;
  itemName: string;
  onClose: () => void;
}

export default function ItemGraphModal({ itemId, itemName, onClose }: ItemGraphModalProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('30d');

  const timeframeConfig = TIMEFRAMES.find(t => t.value === timeframe);
  const timeframeLabel = timeframeConfig?.label ?? '30D';
  const timeframeSeconds = timeframeConfig?.seconds ?? 30 * 24 * 60 * 60;

  // Fetch current price
  const { data: priceData } = useQuery({
    queryKey: ['item-price', itemId],
    queryFn: () => getItemPrice(itemId),
    staleTime: 5000,
  });

  // Fetch price history
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['item-history', itemId, timeframe],
    queryFn: () => getItemHistory(itemId, timeframeSeconds),
    staleTime: 60000,
  });

  const currentPrice = priceData?.high && priceData?.low
    ? Math.round((priceData.high + priceData.low) / 2)
    : 0;

  const calcStats = (data: Array<{ timestamp: number; price: number }>) => {
    if (!data.length) return { avg: 0 };
    const sum = data.reduce((acc, d) => acc + d.price, 0);
    return { avg: Math.round(sum / data.length) };
  };

  // Handle escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div 
        className="relative bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-4xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors z-10"
          title="Close (Esc)"
        >
          ✕
        </button>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Header */}
          <div>
            <h2 className="text-xl font-semibold text-slate-100">{itemName}</h2>
            <p className="text-sm text-slate-400">Price History</p>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center gap-2">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setTimeframe(tf.value)}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  timeframe === tf.value
                    ? 'bg-slate-700 border-slate-600 text-slate-100'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 min-h-[400px]">
            {historyLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-osrs-accent"></div>
              </div>
            ) : historyData && historyData.length > 0 ? (
              <PriceChart 
                data={historyData}
                itemName={itemName}
                currentPrice={currentPrice}
                averagePrice={calcStats(historyData).avg}
                timeframeLabel={timeframeLabel}
              />
            ) : (
              <div className="flex items-center justify-center h-[400px] text-slate-400">
                No price history available for this timeframe
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
