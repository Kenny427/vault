'use client';

import { useState } from 'react';
import { useTradeHistoryStore } from '@/lib/tradeHistoryStore';
import { usePortfolioStore } from '@/lib/portfolioStore';

interface RecordTradeModalProps {
  item: any;
  currentPrice: number;
  onClose: () => void;
}

export default function RecordTradeModal({ item, currentPrice, onClose }: RecordTradeModalProps) {
  const addTrade = useTradeHistoryStore(state => state.addTrade);
  const removeItem = usePortfolioStore(state => state.removeItem);
  
  const [quantityToSell, setQuantityToSell] = useState(item.remainingQuantity);
  const [sellPrice, setSellPrice] = useState(currentPrice);
  const [notes, setNotes] = useState('');

  const totalCost = item.buyPrice * quantityToSell;
  const totalRevenue = sellPrice * quantityToSell;
  const netRevenue = totalRevenue * 0.98;
  const profit = netRevenue - totalCost;
  const roi = (profit / totalCost) * 100;
  const holdDays = Math.floor((Date.now() - item.datePurchased) / (1000 * 60 * 60 * 24));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Record the trade
    addTrade({
      itemId: item.itemId,
      itemName: item.itemName,
      quantityBought: item.quantity,
      buyPrice: item.buyPrice,
      buyDate: item.datePurchased,
      quantitySold: quantityToSell,
      sellPrice,
      sellDate: Date.now(),
      profit,
      roi,
      holdDays,
      notes: notes || undefined,
    });

    // Update portfolio (remove sold quantity)
    if (quantityToSell >= item.remainingQuantity) {
      removeItem(item.id);
    } else {
      // Partial sale - update remaining quantity
      usePortfolioStore.setState((state) => ({
        items: state.items.filter(p => p.id !== item.id)
      }));
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border-2 border-osrs-accent/30 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-slate-100 mb-1">Record Flip</h2>
          <p className="text-slate-400 text-sm mb-6">{item.itemName}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Quantity to Sell (Max: {item.remainingQuantity})
              </label>
              <input
                type="number"
                value={quantityToSell}
                onChange={(e) => setQuantityToSell(Math.min(item.remainingQuantity, parseInt(e.target.value) || 0))}
                min={1}
                max={item.remainingQuantity}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Sell Price (gp each)
              </label>
              <input
                type="number"
                value={sellPrice}
                onChange={(e) => setSellPrice(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Current market price: {currentPrice.toLocaleString()}gp</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes about this flip..."
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100 h-20"
              />
            </div>

            {/* Summary */}
            <div className="bg-slate-800 border border-slate-700 rounded p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Bought at:</span>
                <span className="text-slate-300">{item.buyPrice.toLocaleString()}gp × {quantityToSell}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Selling at:</span>
                <span className="text-slate-300">{sellPrice.toLocaleString()}gp × {quantityToSell} (after 2% tax)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Hold time:</span>
                <span className="text-slate-300">{holdDays} days</span>
              </div>
              <div className="border-t border-slate-700 pt-2 mt-2">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-300">Profit:</span>
                  <span className={profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {profit >= 0 ? '+' : ''}{profit.toLocaleString()}gp ({roi >= 0 ? '+' : ''}{roi.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 bg-osrs-accent hover:bg-osrs-accent/90 text-slate-900 font-semibold rounded-lg transition-colors"
              >
                Record Flip
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
