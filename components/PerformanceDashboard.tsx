'use client';

import { useState, useMemo } from 'react';
import { useTradeHistoryStore } from '@/lib/tradeHistoryStore';

export default function PerformanceDashboard() {
  const trades = useTradeHistoryStore(state => state.trades);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const filteredTrades = useMemo(() => {
    const now = Date.now();
    const cutoffs = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      'all': Infinity,
    };
    return trades.filter(t => now - t.sellDate < cutoffs[timeframe]);
  }, [trades, timeframe]);

  const stats = useMemo(() => {
    if (filteredTrades.length === 0) {
      return {
        totalProfit: 0,
        totalInvested: 0,
        successRate: 0,
        avgROI: 0,
        avgHoldTime: 0,
        totalFlips: 0,
        bestFlip: null,
        worstFlip: null,
      };
    }

    const totalProfit = filteredTrades.reduce((sum, t) => sum + t.profit, 0);
    const totalInvested = filteredTrades.reduce((sum, t) => sum + (t.buyPrice * t.quantitySold), 0);
    const profitable = filteredTrades.filter(t => t.profit > 0).length;
    const successRate = (profitable / filteredTrades.length) * 100;
    const avgROI = filteredTrades.reduce((sum, t) => sum + t.roi, 0) / filteredTrades.length;
    const avgHoldTime = filteredTrades.reduce((sum, t) => sum + t.holdDays, 0) / filteredTrades.length;
    const bestFlip = filteredTrades.reduce((best, t) => t.profit > best.profit ? t : best);
    const worstFlip = filteredTrades.reduce((worst, t) => t.profit < worst.profit ? t : worst);

    return {
      totalProfit,
      totalInvested,
      successRate,
      avgROI,
      avgHoldTime,
      totalFlips: filteredTrades.length,
      bestFlip,
      worstFlip,
    };
  }, [filteredTrades]);

  // Category breakdown
  const categoryStats = useMemo(() => {
    const categories: Record<string, { profit: number; flips: number }> = {};
    
    filteredTrades.forEach(trade => {
      // Simple categorization by item name patterns
      let category = 'Other';
      if (trade.itemName.includes('log') || trade.itemName.includes('Log')) category = 'Logs';
      else if (trade.itemName.includes('ore') || trade.itemName.includes('bar')) category = 'Ores/Bars';
      else if (trade.itemName.includes('herb') || trade.itemName.includes('potion')) category = 'Herbs';
      else if (trade.itemName.includes('hide') || trade.itemName.includes('leather')) category = 'Dragonhides';
      else if (trade.itemName.includes('bone')) category = 'Bones';
      else if (trade.itemName.includes('rune') && !trade.itemName.includes('Runite')) category = 'Runes';
      
      if (!categories[category]) {
        categories[category] = { profit: 0, flips: 0 };
      }
      categories[category].profit += trade.profit;
      categories[category].flips += 1;
    });

    return Object.entries(categories)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.profit - a.profit);
  }, [filteredTrades]);

  const formatNumber = (value: number) =>
    value.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      {/* Timeframe Selector */}
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-sm">Period:</span>
        {(['7d', '30d', '90d', 'all'] as const).map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeframe === tf
                ? 'bg-osrs-accent text-slate-900'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {tf === 'all' ? 'All Time' : tf.toUpperCase()}
          </button>
        ))}
      </div>

      {filteredTrades.length === 0 ? (
        <div className="bg-slate-900 rounded-lg p-12 border border-slate-700 text-center">
          <div className="text-6xl mb-4">📈</div>
          <h3 className="text-xl font-semibold text-slate-300 mb-2">No data for this period</h3>
          <p className="text-slate-400">Complete some flips to see your performance metrics</p>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 border border-green-700/50 rounded-lg p-4">
              <p className="text-xs text-green-400 mb-1">Total Profit</p>
              <p className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.totalProfit >= 0 ? '+' : ''}{formatNumber(stats.totalProfit)}gp
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-700/50 rounded-lg p-4">
              <p className="text-xs text-blue-400 mb-1">Success Rate</p>
              <p className="text-2xl font-bold text-blue-400">{stats.successRate.toFixed(1)}%</p>
            </div>
            <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-700/50 rounded-lg p-4">
              <p className="text-xs text-purple-400 mb-1">Avg ROI</p>
              <p className="text-2xl font-bold text-purple-400">
                {stats.avgROI >= 0 ? '+' : ''}{stats.avgROI.toFixed(1)}%
              </p>
            </div>
            <div className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 border border-yellow-700/50 rounded-lg p-4">
              <p className="text-xs text-yellow-400 mb-1">Avg Hold Time</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.avgHoldTime.toFixed(0)}d</p>
            </div>
          </div>

          {/* Best/Worst Flips */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.bestFlip && (
              <div className="bg-slate-900 border border-green-700/50 rounded-lg p-6">
                <h3 className="text-sm font-semibold text-green-400 mb-3">🏆 Best Flip</h3>
                <p className="text-lg font-bold text-slate-100 mb-2">{stats.bestFlip.itemName}</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Profit:</span>
                    <span className="text-green-400 font-semibold">+{formatNumber(stats.bestFlip.profit)}gp</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ROI:</span>
                    <span className="text-green-400">+{stats.bestFlip.roi.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hold:</span>
                    <span className="text-slate-300">{stats.bestFlip.holdDays} days</span>
                  </div>
                </div>
              </div>
            )}
            {stats.worstFlip && (
              <div className="bg-slate-900 border border-red-700/50 rounded-lg p-6">
                <h3 className="text-sm font-semibold text-red-400 mb-3">⚠️ Worst Flip</h3>
                <p className="text-lg font-bold text-slate-100 mb-2">{stats.worstFlip.itemName}</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Profit:</span>
                    <span className="text-red-400 font-semibold">{formatNumber(stats.worstFlip.profit)}gp</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ROI:</span>
                    <span className="text-red-400">{stats.worstFlip.roi.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hold:</span>
                    <span className="text-slate-300">{stats.worstFlip.holdDays} days</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Category Breakdown */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Profit by Category</h3>
            <div className="space-y-3">
              {categoryStats.map((cat) => (
                <div key={cat.name}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-slate-300">{cat.name}</span>
                    <div className="text-right">
                      <span className={`text-sm font-semibold ${cat.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {cat.profit >= 0 ? '+' : ''}{formatNumber(cat.profit)}gp
                      </span>
                      <span className="text-xs text-slate-500 ml-2">({cat.flips} flips)</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${cat.profit >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{
                        width: `${Math.min(100, Math.abs(cat.profit / stats.totalProfit) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
