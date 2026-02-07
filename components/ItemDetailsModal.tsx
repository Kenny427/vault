'use client';

import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import PriceChart from './PriceChart';
import ItemNotesModal from './ItemNotesModal';
import DeepAnalysisModal from './DeepAnalysisModal';
import { getItemDailyVolume, getItemDetails, getItemHistory, getItemPrice, resolveIconUrl } from '@/lib/api/osrs';
import { useDashboardStore } from '@/lib/store';

const TIMEFRAMES = [
  { value: '7d', label: '7D', seconds: 7 * 24 * 60 * 60 },
  { value: '30d', label: '30D', seconds: 30 * 24 * 60 * 60 },
  { value: '90d', label: '90D', seconds: 90 * 24 * 60 * 60 },
  { value: '1y', label: '1Y', seconds: 365 * 24 * 60 * 60 },
] as const;

type Timeframe = typeof TIMEFRAMES[number]['value'];

interface ItemDetailsModalProps {
  itemId: number;
  onClose: () => void;
}

export default function ItemDetailsModal({ itemId, onClose }: ItemDetailsModalProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('30d');
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showDeepAnalysis, setShowDeepAnalysis] = useState(false);
  const { favorites, addToFavorites, removeFromFavorites } = useDashboardStore();
  const isFavorite = favorites.some(item => item.id === itemId);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const formatNumber = (value: number) => {
    const abs = Math.abs(value);
    if (abs < 100_000) {
      return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }
    if (abs < 1_000_000) {
      return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    }
    return `${(value / 1_000_000).toFixed(2).replace(/\.00$/, '').replace(/\.0$/, '')}M`;
  };

  const { data: itemDetails } = useQuery({
    queryKey: ['item-details', itemId],
    queryFn: () => getItemDetails(itemId),
    enabled: Number.isFinite(itemId),
  });

  const { data: priceData, isLoading: priceLoading } = useQuery({
    queryKey: ['price', itemId],
    queryFn: () => getItemPrice(itemId),
    enabled: Number.isFinite(itemId),
    refetchInterval: 30000,
  });

  const { data: dailyVolume } = useQuery({
    queryKey: ['daily-volume', itemId],
    queryFn: () => getItemDailyVolume(itemId),
    enabled: Number.isFinite(itemId),
    refetchInterval: 60 * 60 * 1000,
  });

  const currentPrice = priceData ? (priceData.high + priceData.low) / 2 : 0;
  const highPrice = priceData?.high ?? 0;
  const lowPrice = priceData?.low ?? 0;
  const spread = highPrice && lowPrice ? highPrice - lowPrice : 0;
  const netSell = highPrice ? Math.floor(highPrice * 0.98) : 0;
  const netProfit = lowPrice ? netSell - lowPrice : 0;
  const roi = lowPrice ? (netProfit / lowPrice) * 100 : 0;

  const timeframeSeconds = useMemo(() => {
    return TIMEFRAMES.find((t) => t.value === timeframe)?.seconds ?? TIMEFRAMES[1].seconds;
  }, [timeframe]);

  const timeframeLabel = useMemo(() => {
    return TIMEFRAMES.find((t) => t.value === timeframe)?.label ?? '30D';
  }, [timeframe]);

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['history', itemId, timeframe, currentPrice],
    queryFn: () => getItemHistory(itemId, timeframeSeconds, currentPrice || undefined),
    enabled: Number.isFinite(itemId),
  });

  const { data: history30 } = useQuery({
    queryKey: ['history', itemId, '30d', currentPrice],
    queryFn: () => getItemHistory(itemId, 30 * 24 * 60 * 60, currentPrice || undefined),
    enabled: Number.isFinite(itemId),
  });

  const { data: history90 } = useQuery({
    queryKey: ['history', itemId, '90d', currentPrice],
    queryFn: () => getItemHistory(itemId, 90 * 24 * 60 * 60, currentPrice || undefined),
    enabled: Number.isFinite(itemId),
  });

  const { data: history180 } = useQuery({
    queryKey: ['history', itemId, '180d', currentPrice],
    queryFn: () => getItemHistory(itemId, 180 * 24 * 60 * 60, currentPrice || undefined),
    enabled: Number.isFinite(itemId),
  });

  const { data: history365 } = useQuery({
    queryKey: ['history', itemId, '365d', currentPrice],
    queryFn: () => getItemHistory(itemId, 365 * 24 * 60 * 60, currentPrice || undefined),
    enabled: Number.isFinite(itemId),
  });

  const calcStats = (data: any) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0 };
    }
    const prices = data.map((d: any) => d.price).filter((p: number) => p > 0);
    if (prices.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0 };
    }
    return {
      avg: Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length),
      min: Math.min(...prices),
      max: Math.max(...prices),
      count: prices.length,
    };
  };

  const stats30 = useMemo(() => calcStats(history30), [history30]);
  const stats90 = useMemo(() => calcStats(history90), [history90]);
  const stats180 = useMemo(() => calcStats(history180), [history180]);
  const stats365 = useMemo(() => calcStats(history365), [history365]);

  const iconUrl = resolveIconUrl(itemDetails?.icon);

  const toggleFavorite = () => {
    if (isFavorite) {
      removeFromFavorites(itemId);
    } else {
      addToFavorites({
        id: itemId,
        name: itemDetails?.name || `Item ${itemId}`,
        addedAt: Date.now(),
      });
    }
  };

  if (!Number.isFinite(itemId)) {
    return null;
  }

  return (
    <>
      {/* Modal Overlay */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto py-8"
        onClick={onClose}
      >
        {/* Modal Content */}
        <div 
          className="relative bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-5xl mx-4 my-auto"
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
          <div className="p-6 space-y-6 max-h-[calc(100vh-4rem)] overflow-y-auto">
            {/* Header with Item Info */}
            <div className="flex items-center gap-4 pr-12">
              <div className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                {iconUrl ? (
                  <img src={iconUrl} alt={itemDetails?.name || 'Item'} className="w-9 h-9" />
                ) : (
                  <span className="text-lg">🪙</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-semibold text-slate-100 truncate">
                  {itemDetails?.name || `Item ${itemId}`}
                </h1>
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <span>ID: {itemId}</span>
                  {itemDetails?.wiki_url && (
                    <>
                      <span>•</span>
                      <a
                        href={itemDetails.wiki_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Wiki →
                      </a>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={toggleFavorite}
                className={`px-4 py-2 rounded font-medium transition-all ${
                  isFavorite
                    ? 'bg-osrs-accent text-slate-900'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {isFavorite ? '★ Favorited' : '☆ Favorite'}
              </button>
            </div>

            {/* Current Price Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-xs mb-1">Current (Mid)</p>
                <p className="text-2xl font-bold text-slate-100">
                  {priceLoading ? '...' : formatNumber(currentPrice)}
                </p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-xs mb-1">Buy (High)</p>
                <p className="text-2xl font-bold text-green-400">
                  {priceLoading ? '...' : formatNumber(highPrice)}
                </p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-xs mb-1">Sell (Low)</p>
                <p className="text-2xl font-bold text-blue-400">
                  {priceLoading ? '...' : formatNumber(lowPrice)}
                </p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-xs mb-1">Daily Volume</p>
                <p className="text-2xl font-bold text-purple-400">
                  {dailyVolume ? formatNumber(dailyVolume) : '—'}
                </p>
              </div>
            </div>

            {/* Flip Metrics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-sm mb-1">Spread</p>
                <p className="text-xl font-bold text-slate-100">{formatNumber(spread)}</p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-sm mb-1">Net Profit</p>
                <p className={`text-xl font-bold ${netProfit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatNumber(netProfit)}
                </p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-sm mb-1">ROI</p>
                <p className={`text-xl font-bold ${roi > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {roi.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Timeframe Selector */}
            <div className="flex items-center gap-2">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => setTimeframe(tf.value)}
                  className={`px-4 py-2 rounded font-medium transition-colors ${
                    timeframe === tf.value
                      ? 'bg-osrs-accent text-slate-900'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* Price Chart */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-slate-100 mb-4">
                Price History ({timeframeLabel})
              </h2>
              {historyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-osrs-accent"></div>
                </div>
              ) : historyData && historyData.length > 0 ? (
                <PriceChart 
                  data={historyData}
                  itemName={itemDetails?.name || `Item ${itemId}`}
                  currentPrice={currentPrice}
                  averagePrice={calcStats(historyData).avg}
                  timeframeLabel={timeframeLabel}
                />
              ) : (
                <div className="text-center py-12 text-slate-400">
                  No price history available for this timeframe
                </div>
              )}
            </div>

            {/* Historical Averages */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-xs mb-1">30D Average</p>
                <p className="text-lg font-bold text-slate-100">
                  {stats30.avg > 0 ? formatNumber(stats30.avg) : '—'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {stats30.min > 0 && `${formatNumber(stats30.min)} - ${formatNumber(stats30.max)}`}
                </p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-xs mb-1">90D Average</p>
                <p className="text-lg font-bold text-slate-100">
                  {stats90.avg > 0 ? formatNumber(stats90.avg) : '—'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {stats90.min > 0 && `${formatNumber(stats90.min)} - ${formatNumber(stats90.max)}`}
                </p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-xs mb-1">180D Average</p>
                <p className="text-lg font-bold text-slate-100">
                  {stats180.avg > 0 ? formatNumber(stats180.avg) : '—'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {stats180.min > 0 && `${formatNumber(stats180.min)} - ${formatNumber(stats180.max)}`}
                </p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <p className="text-slate-400 text-xs mb-1">365D Average</p>
                <p className="text-lg font-bold text-slate-100">
                  {stats365.avg > 0 ? formatNumber(stats365.avg) : '—'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {stats365.min > 0 && `${formatNumber(stats365.min)} - ${formatNumber(stats365.max)}`}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowNotesModal(true)}
                className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium transition-colors"
              >
                📝 Notes
              </button>
              <button
                onClick={() => setShowDeepAnalysis(true)}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
              >
                🧠 Deep Analysis
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Nested Modals */}
      {showNotesModal && (
        <ItemNotesModal
          itemId={itemId}
          itemName={itemDetails?.name || `Item ${itemId}`}
          onClose={() => setShowNotesModal(false)}
        />
      )}
      {showDeepAnalysis && (
        <DeepAnalysisModal
          itemId={itemId}
          itemName={itemDetails?.name || `Item ${itemId}`}
          onClose={() => setShowDeepAnalysis(false)}
        />
      )}
    </>
  );
}
