'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import PriceChart from './PriceChart';
import { getItemDetails, getItemHistory, getItemPrice, resolveIconUrl } from '@/lib/api/osrs';

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
            onClick={() => router.back()}
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
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs">Mid</div>
            <div className="text-lg font-semibold text-osrs-accent">{currentPrice.toLocaleString()}gp</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs">High / Low</div>
            <div className="text-lg font-semibold">{highPrice.toLocaleString()} / {lowPrice.toLocaleString()}gp</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs">Spread</div>
            <div className="text-lg font-semibold text-blue-400">{spread.toLocaleString()}gp</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs">Net / ROI</div>
            <div className={`text-lg font-semibold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString()}gp ({roi >= 0 ? '+' : ''}{roi.toFixed(2)}%)
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex flex-wrap gap-3">
            <span>Limit: {itemDetails?.limit ? itemDetails.limit.toLocaleString() : '—'}</span>
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
    </div>
  );
}
