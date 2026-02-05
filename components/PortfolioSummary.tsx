
'use client';

import { useEffect, useState } from 'react';
import { usePortfolioStore } from '@/lib/portfolioStore';
import { getBatchPrices } from '@/lib/api/osrs';
import { formatCompactNumber } from './Portfolio';

interface PortfolioStats {
  totalInvested: number;
  currentValue: number;
  totalProfit: number;
  profitPercentage: number;
  realizedProfit: number;
  unrealizedProfit: number;
  itemCount: number;
}

export default function PortfolioSummary() {
  const items = usePortfolioStore((state) => state.items);
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    calculateStats();
  }, [items]);

  const calculateStats = async () => {
    if (items.length === 0) {
      setStats(null);
      return;
    }

    setLoading(true);
    try {
      // Get unique item IDs
      const itemIds = [...new Set(items.map(item => item.itemId))];
      
      // Fetch current prices
      const prices = await getBatchPrices(itemIds);

      let totalInvested = 0;
      let currentValue = 0;
      let realizedProfit = 0;
      let remainingCost = 0;

      items.forEach(item => {
        const invested = item.buyPrice * item.quantity;
        totalInvested += invested;

        const soldQty = (item.sales ?? []).reduce((sum, sale) => sum + sale.quantity, 0);
        const remainingQty = Math.max(0, item.quantity - soldQty);

        // Realized profit from sales (2% tax)
        (item.sales ?? []).forEach((sale) => {
          const gross = sale.sellPrice * sale.quantity;
          const net = gross * 0.98;
          const cost = item.buyPrice * sale.quantity;
          realizedProfit += (net - cost);
        });

        remainingCost += item.buyPrice * remainingQty;

        const priceData = prices[item.itemId];
        if (priceData) {
          const currentPrice = (priceData.high + priceData.low) / 2;
          const sellValue = currentPrice * remainingQty;
          const tax = sellValue * 0.02;
          currentValue += (sellValue - tax);
        } else {
          currentValue += item.buyPrice * remainingQty;
        }
      });

      const unrealizedProfit = currentValue - remainingCost;
      const totalProfit = realizedProfit + unrealizedProfit;
      const profitPercentage = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

      setStats({
        totalInvested,
        currentValue,
        totalProfit,
        profitPercentage,
        realizedProfit,
        unrealizedProfit,
        itemCount: itemIds.length,
      });
    } catch (error) {
      console.error('Failed to calculate stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!stats && items.length === 0) {
    return null;
  }

  if (loading || !stats) {
    return (
      <div className="bg-slate-900 rounded-lg p-6 mb-6 border border-slate-700">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-800 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="h-20 bg-slate-800 rounded"></div>
            <div className="h-20 bg-slate-800 rounded"></div>
            <div className="h-20 bg-slate-800 rounded"></div>
            <div className="h-20 bg-slate-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const isProfit = stats.totalProfit >= 0;

  return (
    <div className="bg-slate-900 rounded-lg p-6 mb-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-100">Portfolio Overview</h3>
        <span className="text-xs text-slate-400">{stats.itemCount} items</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
          <div className="text-xs text-slate-400 mb-1">Invested</div>
          <div className="text-xl font-semibold text-slate-100">
            {stats.totalInvested.toLocaleString()}
          </div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
          <div className="text-xs text-slate-400 mb-1">Current Value</div>
          <div className="text-xl font-semibold text-slate-100">
            {Math.round(stats.currentValue).toLocaleString()}
          </div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
          <div className="text-xs text-slate-400 mb-1">Total P/L</div>
          <div className={`text-xl font-semibold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
            {isProfit ? '+' : ''}{formatCompactNumber(Math.round(stats.totalProfit))}
          </div>
          <div className={`text-xs ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
            {isProfit ? '+' : ''}{stats.profitPercentage.toFixed(1)}%
          </div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
          <div className="text-xs text-slate-400 mb-1">Realized / Unrealized</div>
          <div className="text-sm text-slate-200">
            <span className={stats.realizedProfit >= 0 ? 'text-green-400' : 'text-red-400'}>
              {stats.realizedProfit >= 0 ? '+' : ''}{formatCompactNumber(Math.round(stats.realizedProfit))}
            </span>
            <span className="text-slate-500"> / </span>
            <span className={stats.unrealizedProfit >= 0 ? 'text-green-400' : 'text-red-400'}>
              {stats.unrealizedProfit >= 0 ? '+' : ''}{formatCompactNumber(Math.round(stats.unrealizedProfit))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
