'use client';

import { useState, useMemo } from 'react';
import { usePendingTransactionsStore } from '@/lib/pendingTransactionsStore';
import { usePortfolioStore } from '@/lib/portfolioStore';
import { useTradeHistoryStore } from '@/lib/tradeHistoryStore';

export default function PendingTransactionsModal({ onClose }: { onClose: () => void }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const transactions = usePendingTransactionsStore((state) => state.transactions);
  const removeTransaction = usePendingTransactionsStore((state) => state.removeTransaction);
  const markHandled = usePendingTransactionsStore((state) => state.markHandled);
  const addItem = usePortfolioStore((state) => state.addItem);
  const addSale = usePortfolioStore((state) => state.addSale);
  const updateItem = usePortfolioStore((state) => state.updateItem);
  const removeItem = usePortfolioStore((state) => state.removeItem);
  const items = usePortfolioStore((state) => state.items);
  const addTrade = useTradeHistoryStore((state) => state.addTrade);

  const filteredTransactions = useMemo(() => {
    return filterType === 'ALL'
      ? transactions
      : transactions.filter((tx) => tx.type === filterType);
  }, [transactions, filterType]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map((tx) => tx.id)));
    }
  };

  const handleAddToPortfolio = async () => {
    if (selectedIds.size === 0) {
      setError('Please select at least one transaction');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const selectedTransactions = filteredTransactions.filter((tx) => selectedIds.has(tx.id));

      for (const tx of selectedTransactions) {
        if (tx.type === 'BUY') {
          // Try to fetch item ID only if missing
          let itemId: number | undefined = tx.itemId;
          if (!itemId) {
            try {
              const response = await fetch(`https://prices.runescape.wiki/api/v1/osrs/mapping`);
              const mapping = await response.json();
              const item = mapping.find((m: any) => m.name.toLowerCase() === tx.itemName.toLowerCase());
              itemId = item?.id;
            } catch {
              console.log(`Could not find item ID for ${tx.itemName}`);
            }
          }

          await addItem({
            itemId: itemId || 0,
            itemName: tx.itemName,
            quantity: tx.quantity || 1,
            buyPrice: tx.price || 0,
            datePurchased: tx.timestamp,
            sales: [],
            lots: [],
          });

          markHandled(tx.id);
          removeTransaction(tx.id);
        }

        if (tx.type === 'SELL') {
          const match = tx.itemId
            ? items.find((item) => item.itemId === tx.itemId)
            : items.find((item) => item.itemName.toLowerCase() === tx.itemName.toLowerCase());

          if (!match) {
            setError(`No matching portfolio item for ${tx.itemName}`);
            continue;
          }

          const sellQty = Math.min(tx.quantity || match.quantity, match.quantity);
          if (sellQty <= 0) {
            setError(`Invalid sell quantity for ${tx.itemName}`);
            continue;
          }

          const sellPrice = tx.price || 0;
          if (sellPrice <= 0) {
            setError(`Missing sell price for ${tx.itemName}`);
            continue;
          }

          const totalCost = match.buyPrice * sellQty;
          const totalRevenue = sellPrice * sellQty;
          const netRevenue = totalRevenue * 0.98;
          const profit = netRevenue - totalCost;
          const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;
          const holdDays = Math.floor((tx.timestamp - match.datePurchased) / (1000 * 60 * 60 * 24));

          addTrade({
            itemId: match.itemId,
            itemName: match.itemName,
            quantityBought: match.quantity,
            buyPrice: match.buyPrice,
            buyDate: match.datePurchased,
            quantitySold: sellQty,
            sellPrice,
            sellDate: tx.timestamp,
            profit,
            roi,
            holdDays,
            notes: `DINK auto-sale (${tx.status})`,
          });

          await addSale(match.id, {
            quantity: sellQty,
            sellPrice,
            dateSold: tx.timestamp,
            notes: `DINK auto-sale (${tx.status})`,
          });

          const existingLots = match.lots && match.lots.length > 0
            ? match.lots
            : [{
                id: `${match.id}-lot`,
                quantity: match.quantity,
                buyPrice: match.buyPrice,
                datePurchased: match.datePurchased,
                notes: match.notes,
              }];

          let remainingToSell = sellQty;
          const updatedLots = existingLots.map((lot) => {
            if (remainingToSell <= 0) return lot;
            const soldFromLot = Math.min(lot.quantity, remainingToSell);
            remainingToSell -= soldFromLot;
            return {
              ...lot,
              quantity: lot.quantity - soldFromLot,
            };
          }).filter((lot) => lot.quantity > 0);

          const remaining = match.quantity - sellQty;
          if (remaining <= 0) {
            await removeItem(match.id);
          } else {
            await updateItem(match.id, { quantity: remaining, lots: updatedLots });
          }

          markHandled(tx.id);
          removeTransaction(tx.id);
        }
      }

      setSelectedIds(new Set());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to portfolio');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = (id: string) => {
    markHandled(id);
    removeTransaction(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const selectedCount = selectedIds.size;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto border border-slate-700">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-100">📥 Pending Transactions</h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-2xl">
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🔕</div>
              <p className="text-slate-400 text-lg">No pending transactions</p>
            </div>
          ) : (
            <>
              {/* Filter Tabs */}
              <div className="flex gap-2">
                {(['ALL', 'BUY', 'SELL'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filterType === type
                        ? 'bg-osrs-accent text-slate-900'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {type === 'ALL' && `All (${transactions.length})`}
                    {type === 'BUY' && `Buys (${transactions.filter((tx) => tx.type === 'BUY').length})`}
                    {type === 'SELL' && `Sells (${transactions.filter((tx) => tx.type === 'SELL').length})`}
                  </button>
                ))}
              </div>

              {/* Selection Info */}
              <div className="bg-slate-800 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-slate-300 font-medium">
                    {selectedCount} of {filteredTransactions.length} selected
                  </p>
                </div>
                <button
                  onClick={toggleSelectAll}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-sm transition-colors"
                >
                  {selectedIds.size === filteredTransactions.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto border border-slate-700 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800 border-b border-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-slate-300 font-semibold">Item</th>
                      <th className="px-4 py-3 text-right text-slate-300 font-semibold">Qty</th>
                      <th className="px-4 py-3 text-right text-slate-300 font-semibold">Price</th>
                      <th className="px-4 py-3 text-right text-slate-300 font-semibold">Total</th>
                      <th className="px-4 py-3 text-center text-slate-300 font-semibold">Type</th>
                      <th className="px-4 py-3 text-center text-slate-300 font-semibold">Status</th>
                      <th className="px-4 py-3 text-right text-slate-300 font-semibold">Time</th>
                      <th className="px-4 py-3 text-center text-slate-300 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                          No {filterType !== 'ALL' ? filterType.toLowerCase() : ''} transactions
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((tx) => (
                        <tr
                          key={tx.id}
                          className={`hover:bg-slate-800/50 transition-colors ${
                            selectedIds.has(tx.id) ? 'bg-slate-800/30' : ''
                          }`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(tx.id)}
                              onChange={() => toggleSelection(tx.id)}
                              className="w-4 h-4 rounded cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3 text-slate-100 font-medium">{tx.itemName}</td>
                          <td className="px-4 py-3 text-right text-slate-300">
                            {tx.quantity ? tx.quantity.toLocaleString() : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-300">
                            {tx.price ? `${tx.price.toLocaleString()} gp` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-osrs-accent font-semibold">
                            {tx.quantity && tx.price ? `${(tx.quantity * tx.price).toLocaleString()} gp` : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                tx.type === 'BUY'
                                  ? 'bg-green-900/30 text-green-400'
                                  : 'bg-red-900/30 text-red-400'
                              }`}
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-slate-300 text-xs">{tx.status}</td>
                          <td className="px-4 py-3 text-right text-slate-400 text-xs">
                            {new Date(tx.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleDismiss(tx.id)}
                              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs transition-colors"
                            >
                              Dismiss
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-200 text-sm">
                  ⚠️ {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-700">
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleAddToPortfolio}
                  disabled={loading || selectedCount === 0}
                  className="px-6 py-2 bg-osrs-accent hover:bg-osrs-accent/90 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 rounded-lg font-semibold transition-colors"
                >
                  {loading ? 'Adding...' : `Add ${selectedCount} to Portfolio`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
