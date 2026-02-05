'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { usePortfolioStore } from '@/lib/portfolioStore';
import { useDashboardStore } from '@/lib/store';
import { useTradeHistoryStore } from '@/lib/tradeHistoryStore';
import PriceChart from './PriceChart';
import SearchBar from './SearchBar';
import { getItemDetails, getItemHistory, getItemPrice, resolveIconUrl } from '@/lib/api/osrs';

const TIMEFRAMES = [
  { value: '7d', label: '7D', seconds: 7 * 24 * 60 * 60 },
  { value: '30d', label: '30D', seconds: 30 * 24 * 60 * 60 },
  { value: '90d', label: '90D', seconds: 90 * 24 * 60 * 60 },
  { value: '1y', label: '1Y', seconds: 365 * 24 * 60 * 60 },
] as const;

type Timeframe = typeof TIMEFRAMES[number]['value'];

export default function PortfolioItemPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = Number(params?.id);
  const items = usePortfolioStore((state) => state.items);
  const tradeHistory = useTradeHistoryStore((state) => state.trades);
  const { favorites, addToFavorites, removeFromFavorites } = useDashboardStore();
  const isFavorite = favorites.some(item => item.id === itemId);
  const [timeframe, setTimeframe] = useState<Timeframe>('30d');

  const matchingItems = useMemo(() => items.filter((item) => item.itemId === itemId), [items, itemId]);
  const lots = useMemo(() => {
    return matchingItems.flatMap((item) =>
      item.lots && item.lots.length > 0
        ? item.lots
        : [{ id: item.id, quantity: item.quantity, buyPrice: item.buyPrice, datePurchased: item.datePurchased, notes: item.notes }]
    );
  }, [matchingItems]);
  const sales = useMemo(() => matchingItems.flatMap((item) => item.sales ?? []), [matchingItems]);
  const tradeSales = useMemo(() => {
    return tradeHistory
      .filter((trade) => trade.itemId === itemId)
      .map((trade) => ({
        id: `trade-${trade.id}`,
        quantity: trade.quantitySold,
        sellPrice: trade.sellPrice,
        dateSold: trade.sellDate,
      }));
  }, [tradeHistory, itemId]);

  const displaySales = useMemo(() => {
    const seen = new Set<string>();
    const merged = [...sales, ...tradeSales].filter((sale) => {
      const key = `${sale.dateSold}-${sale.quantity}-${sale.sellPrice}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return merged.sort((a, b) => b.dateSold - a.dateSold);
  }, [sales, tradeSales]);

  const { data: itemDetails } = useQuery({
    queryKey: ['item-details', itemId],
    queryFn: () => getItemDetails(itemId),
    enabled: Number.isFinite(itemId),
  });

  const { data: priceData } = useQuery({
    queryKey: ['price', itemId],
    queryFn: () => getItemPrice(itemId),
    enabled: Number.isFinite(itemId),
    refetchInterval: 30000,
  });

  const currentPrice = priceData ? (priceData.high + priceData.low) / 2 : 0;

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

  const stats = useMemo(() => {
    const totalQty = lots.reduce((sum, lot) => sum + lot.quantity, 0);
    const totalCost = lots.reduce((sum, lot) => sum + lot.quantity * lot.buyPrice, 0);

    const soldQty = sales.reduce((sum, sale) => sum + sale.quantity, 0);
    const avgBuy = totalQty > 0 ? totalCost / totalQty : 0;

    let realizedRevenue = 0;
    let realizedTax = 0;
    sales.forEach((sale) => {
      const gross = sale.sellPrice * sale.quantity;
      const net = gross * 0.98;
      realizedRevenue += net;
      realizedTax += gross * 0.02;
    });

    const avgSell = soldQty > 0 ? realizedRevenue / soldQty : 0;
    const realizedProfit = realizedRevenue - (avgBuy * soldQty);

    // Allocate sold quantity across lots (FIFO) to compute remaining cost
    let remainingToAllocate = soldQty;
    const remainingByLot = new Map<string, number>();
    const sortedLots = [...lots].sort((a, b) => a.datePurchased - b.datePurchased);

    sortedLots.forEach((lot) => {
      const soldFromLot = Math.min(lot.quantity, remainingToAllocate);
      remainingToAllocate -= soldFromLot;
      const remainingQtyForLot = Math.max(0, lot.quantity - soldFromLot);
      remainingByLot.set(lot.id, remainingQtyForLot);
    });

    const remainingQty = Math.max(0, totalQty - soldQty);
    const remainingCost = sortedLots.reduce((sum, lot) => {
      const remainingQtyForLot = remainingByLot.get(lot.id) ?? lot.quantity;
      return sum + (remainingQtyForLot * lot.buyPrice);
    }, 0);

    const livePrice = priceData ? (priceData.high + priceData.low) / 2 : avgBuy;
    const unrealizedValue = livePrice * remainingQty * 0.98;
    const unrealizedTax = livePrice * remainingQty * 0.02;
    const unrealizedProfit = unrealizedValue - remainingCost;
    const totalProfit = realizedProfit + unrealizedProfit;
    const roi = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

    return {
      totalQty,
      totalCost,
      soldQty,
      remainingQty,
      avgBuy,
      avgSell,
      currentPrice: livePrice,
      realizedProfit,
      unrealizedProfit,
      totalProfit,
      roi,
      realizedTax,
      unrealizedTax,
      remainingByLot,
    };
  }, [lots, sales, priceData]);

  if (!Number.isFinite(itemId)) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <p className="text-slate-400">Invalid item id.</p>
          <Link href="/" className="text-sm text-slate-300">Back</Link>
        </div>
      </div>
    );
  }

  if (lots.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="max-w-5xl mx-auto px-4 py-10 space-y-4">
          <Link href="/" className="text-sm text-slate-300">← Back to portfolio</Link>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <SearchBar onItemSelect={(item) => router.push(`/item/${item.id}`)} />
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
            <p className="text-slate-400">No portfolio lots found for this item.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-slate-300 hover:text-slate-100">← Back to portfolio</Link>
          <div className="flex items-center gap-2">
            {itemDetails?.wiki_url ? (
              <a href={itemDetails.wiki_url} target="_blank" rel="noreferrer" className="text-sm text-slate-300 hover:text-slate-100">
                Wiki
              </a>
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
              className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                isFavorite
                  ? 'bg-osrs-accent text-slate-900 border-osrs-accent'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
              }`}
            >
              {isFavorite ? '★ Favorited' : '☆ Add to Favorites'}
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <SearchBar onItemSelect={(item) => router.push(`/item/${item.id}`)} />
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
            <p className="text-slate-400 text-sm truncate">Portfolio performance overview</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs">Holdings</div>
            <div className="text-lg font-semibold text-slate-100">{stats.remainingQty.toLocaleString()}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs">Avg Buy</div>
            <div className="text-lg font-semibold">{Math.round(stats.avgBuy).toLocaleString()}gp</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs">Current</div>
            <div className="text-lg font-semibold text-blue-400">{Math.round(stats.currentPrice).toLocaleString()}gp</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs">Tax (2%)</div>
            <div className="text-lg font-semibold text-slate-200">
              {Math.round((stats.realizedTax + stats.unrealizedTax) || 0).toLocaleString()}gp
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs">Total P/L</div>
            <div className={`text-lg font-semibold ${stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.totalProfit >= 0 ? '+' : ''}{Math.round(stats.totalProfit).toLocaleString()}gp
            </div>
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

        {historyLoading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-osrs-accent border-t-transparent rounded-full" />
            <p className="text-slate-400 mt-4">Loading price history...</p>
          </div>
        ) : historyData && historyData.length > 0 ? (
          <PriceChart
            data={historyData}
            itemName={itemDetails?.name || `Item ${itemId}`}
            currentPrice={stats.currentPrice}
            averagePrice={
              historyData.reduce((sum, d) => sum + d.price, 0) /
              historyData.length
            }
            timeframeLabel={timeframeLabel}
            showStats={false}
            showLineToggles={true}
            defaultLinesOn={false}
            referenceLines={[
              {
                id: 'avg-buy',
                value: stats.avgBuy,
                label: `Avg Buy: ${Math.round(stats.avgBuy).toLocaleString()}gp`,
                color: '#38bdf8',
                dash: '2 6',
              },
            ]}
          />
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 text-center">
            <p className="text-slate-400 text-lg mb-2">📊 No price history available</p>
            <p className="text-slate-500 text-sm">Try another timeframe.</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-400">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div>Total Qty: <span className="text-slate-200">{stats.totalQty.toLocaleString()}</span></div>
            <div>Sold: <span className="text-slate-200">{stats.soldQty.toLocaleString()}</span></div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div>Total Cost: <span className="text-slate-200">{Math.round(stats.totalCost).toLocaleString()}gp</span></div>
            <div>Avg Sell: <span className="text-slate-200">{Math.round(stats.avgSell).toLocaleString()}gp</span></div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div>Realized: <span className={stats.realizedProfit >= 0 ? 'text-green-400' : 'text-red-400'}>{stats.realizedProfit >= 0 ? '+' : ''}{Math.round(stats.realizedProfit).toLocaleString()}gp</span></div>
            <div>Unrealized: <span className={stats.unrealizedProfit >= 0 ? 'text-green-400' : 'text-red-400'}>{stats.unrealizedProfit >= 0 ? '+' : ''}{Math.round(stats.unrealizedProfit).toLocaleString()}gp</span></div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div>ROI: <span className={stats.roi >= 0 ? 'text-green-400' : 'text-red-400'}>{stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(2)}%</span></div>
            <div>Tax: <span className="text-slate-200">2%</span></div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-lg">
          <div className="px-6 py-4 border-b border-slate-700 text-sm font-semibold text-slate-200">Lots</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50 border-b border-slate-700">
                <tr>
                  <th className="text-left px-6 py-3 text-slate-400">Buy Date</th>
                  <th className="text-right px-6 py-3 text-slate-400">Buy Price</th>
                  <th className="text-right px-6 py-3 text-slate-400">Qty</th>
                  <th className="text-right px-6 py-3 text-slate-400">Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {lots.map((lot) => {
                  const remainingQty = stats.remainingByLot?.get(lot.id) ?? lot.quantity;
                  return (
                    <tr key={lot.id}>
                      <td className="px-6 py-3 text-slate-300">{format(new Date(lot.datePurchased), 'MMM dd, yyyy')}</td>
                      <td className="px-6 py-3 text-right text-slate-200">{lot.buyPrice.toLocaleString()}gp</td>
                      <td className="px-6 py-3 text-right text-slate-200">{lot.quantity.toLocaleString()}</td>
                      <td className="px-6 py-3 text-right text-slate-200">{remainingQty.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-lg">
          <div className="px-6 py-4 border-b border-slate-700 text-sm font-semibold text-slate-200">Sales</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50 border-b border-slate-700">
                <tr>
                  <th className="text-left px-6 py-3 text-slate-400">Sold Date</th>
                  <th className="text-right px-6 py-3 text-slate-400">Sell Price</th>
                  <th className="text-right px-6 py-3 text-slate-400">Qty</th>
                  <th className="text-right px-6 py-3 text-slate-400">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {displaySales.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-6 text-center text-slate-500">No sales recorded yet.</td>
                  </tr>
                ) : (
                  displaySales.map((sale) => (
                    <tr key={sale.id}>
                      <td className="px-6 py-3 text-slate-300">{format(new Date(sale.dateSold), 'MMM dd, yyyy')}</td>
                      <td className="px-6 py-3 text-right text-slate-200">{sale.sellPrice.toLocaleString()}gp</td>
                      <td className="px-6 py-3 text-right text-slate-200">{sale.quantity.toLocaleString()}</td>
                      <td className="px-6 py-3 text-right text-slate-200">{Math.round(sale.sellPrice * sale.quantity * 0.98).toLocaleString()}gp</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
