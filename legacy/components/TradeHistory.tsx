'use client';

import { useState } from 'react';
import { useTradeHistoryStore } from '@/lib/tradeHistoryStore';

export default function TradeHistory() {
  const { trades, removeTrade, getTotalProfit, getSuccessRate } = useTradeHistoryStore();
  const [sortBy, setSortBy] = useState<'date' | 'profit' | 'roi'>('date');

  const sortedTrades = [...trades].sort((a, b) => {
    switch (sortBy) {
      case 'profit':
        return b.profit - a.profit;
      case 'roi':
        return b.roi - a.roi;
      case 'date':
      default:
        return b.sellDate - a.sellDate;
    }
  });

  const totalProfit = getTotalProfit();
  const successRate = getSuccessRate();

  const formatNumber = (value: number) =>
    value.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 border border-green-700/50 rounded-lg p-6">
          <p className="text-sm text-green-400 mb-1">Total Profit</p>
          <p className={`text-3xl font-bold ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalProfit >= 0 ? '+' : ''}{formatNumber(totalProfit)}gp
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-700/50 rounded-lg p-6">
          <p className="text-sm text-blue-400 mb-1">Success Rate</p>
          <p className="text-3xl font-bold text-blue-400">
            {successRate.toFixed(1)}%
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-700/50 rounded-lg p-6">
          <p className="text-sm text-purple-400 mb-1">Total Flips</p>
          <p className="text-3xl font-bold text-purple-400">
            {trades.length}
          </p>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-sm">Sort by:</span>
        <button
          onClick={() => setSortBy('date')}
          className={`px-3 py-1 rounded text-sm ${sortBy === 'date' ? 'bg-osrs-accent text-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
        >
          Date
        </button>
        <button
          onClick={() => setSortBy('profit')}
          className={`px-3 py-1 rounded text-sm ${sortBy === 'profit' ? 'bg-osrs-accent text-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
        >
          Profit
        </button>
        <button
          onClick={() => setSortBy('roi')}
          className={`px-3 py-1 rounded text-sm ${sortBy === 'roi' ? 'bg-osrs-accent text-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
        >
          ROI %
        </button>
      </div>

      {/* Trades List */}
      {trades.length === 0 ? (
        <div className="bg-slate-900 rounded-lg p-12 border border-slate-700 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-slate-300 mb-2">No completed flips yet</h3>
          <p className="text-slate-400">Your flip history will appear here once you record completed trades</p>
        </div>
      ) : (
        <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50 border-b border-slate-700">
                <tr>
                  <th className="text-left px-6 py-4 text-slate-300 font-semibold">Item</th>
                  <th className="text-right px-6 py-4 text-slate-300 font-semibold">Qty</th>
                  <th className="text-right px-6 py-4 text-slate-300 font-semibold">Buy/Sell</th>
                  <th className="text-right px-6 py-4 text-slate-300 font-semibold">Profit</th>
                  <th className="text-right px-6 py-4 text-slate-300 font-semibold">ROI</th>
                  <th className="text-right px-6 py-4 text-slate-300 font-semibold">Hold</th>
                  <th className="text-right px-6 py-4 text-slate-300 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {sortedTrades.map((trade) => {
                  const sellDate = new Date(trade.sellDate);
                  return (
                    <tr key={trade.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-100">{trade.itemName}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          Sold {sellDate.toLocaleDateString()}
                        </div>
                      </td>
                      <td className="text-right px-6 py-4 text-slate-300">
                        {formatNumber(trade.quantitySold)}
                      </td>
                      <td className="text-right px-6 py-4">
                        <div className="text-slate-300">{formatNumber(trade.buyPrice)}gp</div>
                        <div className="text-slate-500 text-sm">{formatNumber(trade.sellPrice)}gp</div>
                      </td>
                      <td className={`text-right px-6 py-4 font-semibold ${trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {trade.profit >= 0 ? '+' : ''}{formatNumber(trade.profit)}gp
                      </td>
                      <td className={`text-right px-6 py-4 font-semibold ${trade.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {trade.roi >= 0 ? '+' : ''}{trade.roi.toFixed(2)}%
                      </td>
                      <td className="text-right px-6 py-4 text-slate-400">
                        {trade.holdDays}d
                      </td>
                      <td className="text-right px-6 py-4">
                        <button
                          onClick={() => removeTrade(trade.id)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
