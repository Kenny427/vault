'use client';

import { useState } from 'react';

interface ProfitCalculatorProps {
  itemName?: string;
  currentPrice?: number;
}

export default function ProfitCalculator({ itemName, currentPrice }: ProfitCalculatorProps) {
  const [buyPrice, setBuyPrice] = useState(currentPrice || 1000);
  const [sellPrice, setSellPrice] = useState(currentPrice ? Math.floor(currentPrice * 1.1) : 1100);
  const [quantity, setQuantity] = useState(100);

  const totalCost = buyPrice * quantity;
  const totalRevenue = sellPrice * quantity;
  const profit = totalRevenue - totalCost;
  const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;
  const profitPerItem = sellPrice - buyPrice;

  const formatNumber = (value: number) =>
    value.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-slate-100 mb-4">
        💰 Profit Calculator
        {itemName && <span className="text-sm text-slate-400 ml-2">({itemName})</span>}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Buy Price (gp)
          </label>
          <input
            type="number"
            value={buyPrice}
            onChange={(e) => setBuyPrice(parseInt(e.target.value) || 0)}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Sell Price (gp)
          </label>
          <input
            type="number"
            value={sellPrice}
            onChange={(e) => setSellPrice(parseInt(e.target.value) || 0)}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Quantity
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b border-slate-700">
          <span className="text-slate-400">Total Cost:</span>
          <span className="text-slate-100 font-semibold">{formatNumber(totalCost)}gp</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-slate-700">
          <span className="text-slate-400">Total Revenue:</span>
          <span className="text-slate-100 font-semibold">{formatNumber(totalRevenue)}gp</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-slate-700">
          <span className="text-slate-400">Profit per Item:</span>
          <span className={`font-semibold ${profitPerItem >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {profitPerItem >= 0 ? '+' : ''}{formatNumber(profitPerItem)}gp
          </span>
        </div>
        <div className="flex justify-between items-center py-3 bg-slate-800/50 rounded-lg px-4 mt-4">
          <span className="text-slate-300 font-semibold">Total Profit:</span>
          <div className="text-right">
            <div className={`text-2xl font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {profit >= 0 ? '+' : ''}{formatNumber(profit)}gp
            </div>
            <div className={`text-sm ${roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {roi >= 0 ? '+' : ''}{roi.toFixed(2)}% ROI
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
