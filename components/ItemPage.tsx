'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import PriceChart from './PriceChart';
import SearchBar from './SearchBar';
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

export default function ItemPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = Number(params?.id);
  const [timeframe, setTimeframe] = useState<Timeframe>('30d');
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showDeepAnalysis, setShowDeepAnalysis] = useState(false);
  const { favorites, addToFavorites, removeFromFavorites } = useDashboardStore();
  const isFavorite = favorites.some(item => item.id === itemId);

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
    queryKey: ['history', itemId, '1y', currentPrice],
    queryFn: () => getItemHistory(itemId, 365 * 24 * 60 * 60, currentPrice || undefined),
    enabled: Number.isFinite(itemId),
  });

  const calcStats = (history?: { price: number }[]) => {
    if (!history || history.length === 0) return null;
    const prices = history.map(p => p.price);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - avg, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    const volatility = avg ? ((max - min) / avg) * 100 : 0;
    const recent = prices.slice(-7);
    const previous = prices.slice(-14, -7);
    const recentAvg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : avg;
    const prevAvg = previous.length ? previous.reduce((a, b) => a + b, 0) / previous.length : avg;
    const momentum = prevAvg ? ((recentAvg - prevAvg) / prevAvg) * 100 : 0;
    const consistency = avg ? Math.max(0, (1 - stdDev / avg) * 100) : 0;
    const percentile = max > min ? ((currentPrice - min) / (max - min)) * 100 : 50;
    const support = avg - stdDev;
    const resistance = avg + stdDev;

    return { avg, min, max, stdDev, volatility, momentum, consistency, percentile, support, resistance };
  };

  const stats30 = useMemo(() => calcStats(history30 || undefined), [history30, currentPrice]);
  const stats90 = useMemo(() => calcStats(history90 || undefined), [history90, currentPrice]);
  const stats180 = useMemo(() => calcStats(history180 || undefined), [history180, currentPrice]);
  const stats365 = useMemo(() => calcStats(history365 || undefined), [history365, currentPrice]);

  const iconUrl = resolveIconUrl(itemDetails?.icon);

  if (!Number.isFinite(itemId)) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <p className="text-slate-400">Invalid item id.</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-slate-800 text-slate-200 rounded"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => window.location.href = '/'}
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            ← Back to dashboard
          </button>
          {itemDetails?.wiki_url ? (
            <a
              href={itemDetails.wiki_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-slate-300 hover:text-slate-100"
            >
              Wiki
            </a>
          ) : null}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <SearchBar onItemSelect={(item) => {
            // If navigating to a different item, use hard navigation
            if (item.id !== itemId) {
              window.location.href = `/item/${item.id}`;
            } else {
              router.refresh();
            }
          }} />
        </div>

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center">
            {iconUrl ? (
              <img src={iconUrl} alt={itemDetails?.name || 'Item'} className="w-9 h-9" />
            ) : (
              <span className="text-lg">🪙</span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-slate-100 truncate">
              {itemDetails?.name || `Item ${itemId}`}
            </h1>
            <p className="text-slate-400 text-sm truncate">
              {itemDetails?.description || 'Market overview and trading insights'}
            </p>
          </div>
          {itemDetails?.members !== undefined ? (
            <span className={`ml-auto text-xs px-2 py-1 rounded ${itemDetails.members ? 'bg-purple-900 text-purple-300' : 'bg-green-900 text-green-300'}`}>
              {itemDetails.members ? 'Members' : 'Free'}
            </span>
          ) : null}
          <button
            onClick={() => {
              if (isFavorite) {
                removeFromFavorites(itemId);
              } else {
                addToFavorites({
                  id: itemId,
                  name: itemDetails?.name || `Item ${itemId}`,
                  addedAt: Date.now(),
                });
              }
            }}
            className={`ml-2 px-3 py-1.5 text-xs rounded border transition-colors ${
              isFavorite
                ? 'bg-osrs-accent text-slate-900 border-osrs-accent'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
            }`}
          >
            {isFavorite ? '★ Favorited' : '☆ Add to Favorites'}
          </button>
          <button
            onClick={() => setShowNotesModal(true)}
            className="ml-2 px-3 py-1.5 text-xs rounded border bg-purple-600 text-white border-purple-600 hover:bg-purple-700 transition-colors"
          >
            📝 Notes
          </button>
          <button
            onClick={() => setShowDeepAnalysis(true)}
            className="ml-2 px-3 py-1.5 text-xs rounded border bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-600 hover:from-indigo-700 hover:to-purple-700 transition-all"
          >
            🧠 Deep Analysis
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs">Mid</div>
            <div className="text-lg font-semibold text-osrs-accent">{formatNumber(currentPrice)}gp</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs">High / Low</div>
            <div className="text-lg font-semibold">{formatNumber(highPrice)} / {formatNumber(lowPrice)}gp</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs">Spread</div>
            <div className="text-lg font-semibold text-blue-400">{formatNumber(spread)}gp</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs">Net / ROI</div>
            <div className={`text-lg font-semibold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {netProfit >= 0 ? '+' : ''}{formatNumber(netProfit)}gp ({roi >= 0 ? '+' : ''}{roi.toFixed(2)}%)
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex flex-wrap gap-3">
            <span>Limit: {itemDetails?.limit ? itemDetails.limit.toLocaleString() : '—'}</span>
            <span>Daily Volume: {dailyVolume ? dailyVolume.toLocaleString() : '—'}</span>
            <span>High Alch: {itemDetails?.highalch ? `${itemDetails.highalch.toLocaleString()}gp` : '—'}</span>
            <span>Low Alch: {itemDetails?.lowalch ? `${itemDetails.lowalch.toLocaleString()}gp` : '—'}</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <span>High Updated: {priceData?.highTime ? format(new Date(priceData.highTime * 1000), 'MMM dd, HH:mm') : '—'}</span>
            <span>Low Updated: {priceData?.lowTime ? format(new Date(priceData.lowTime * 1000), 'MMM dd, HH:mm') : '—'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {TIMEFRAMES.map((t) => (
            <button
              key={t.value}
              onClick={() => setTimeframe(t.value)}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                timeframe === t.value
                  ? 'bg-slate-700 border-slate-600 text-slate-100'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-sm text-slate-300 font-semibold mb-3">Multi-Timeframe Snapshot</div>
            <div className="space-y-2 text-xs text-slate-300">
              {[
                { label: '30D', stats: stats30 },
                { label: '90D', stats: stats90 },
                { label: '180D', stats: stats180 },
                { label: '365D', stats: stats365 },
              ].map(({ label, stats }) => (
                <div key={label} className="grid grid-cols-4 gap-2">
                  <span className="text-slate-400">{label}</span>
                  <span>{stats ? formatNumber(stats.avg) : '—'}</span>
                  <span>{stats ? `${stats.volatility.toFixed(1)}%` : '—'}</span>
                  <span className={stats && stats.momentum >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                    {stats ? `${stats.momentum.toFixed(1)}%` : '—'}
                  </span>
                </div>
              ))}
              <div className="grid grid-cols-4 gap-2 text-[10px] text-slate-500 mt-2">
                <span>TF</span>
                <span>Avg</span>
                <span>Vol</span>
                <span>Momentum</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-sm text-slate-300 font-semibold mb-3">Key Levels</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-300">
                <span>Support (365D)</span>
                <span>{stats365 ? formatNumber(stats365.support) : '—'}gp</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Resistance (365D)</span>
                <span>{stats365 ? formatNumber(stats365.resistance) : '—'}gp</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Price Percentile (365D)</span>
                <span>{stats365 ? `${stats365.percentile.toFixed(0)}th` : '—'}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-sm text-slate-300 font-semibold mb-3">Flip Signals</div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Near Support</span>
                <span>{stats365 && currentPrice <= stats365.support ? 'Yes ✓' : 'No'}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Oversold (&lt;25th %)</span>
                <span>{stats365 && stats365.percentile < 25 ? 'Yes ✓' : 'No'}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Momentum Turning Up</span>
                <span>{stats30 && stats30.momentum > 0 ? 'Yes ✓' : 'No'}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Consistent Pattern</span>
                <span>{stats180 && stats180.consistency > 60 ? 'Yes ✓' : 'No'}</span>
              </div>
            </div>
          </div>
        </div>

        {priceLoading || historyLoading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-osrs-accent border-t-transparent rounded-full" />
            <p className="text-slate-400 mt-4">Loading price data...</p>
          </div>
        ) : historyData && historyData.length > 0 ? (
          <PriceChart
            data={historyData}
            itemName={itemDetails?.name || `Item ${itemId}`}
            currentPrice={currentPrice}
            averagePrice={
              historyData.reduce((sum, d) => sum + d.price, 0) /
              historyData.length
            }
            timeframeLabel={timeframeLabel}
            showStats={false}
            showLineToggles={true}
            defaultLinesOn={false}
          />
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 text-center">
            <p className="text-slate-400 text-lg mb-2">📊 No price history available</p>
            <p className="text-slate-500 text-sm">Try another item.</p>
          </div>
        )}
      </div>

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
    </div>
  );
}
