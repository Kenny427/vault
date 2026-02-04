'use client';

import { useState, useRef } from 'react';
import { usePortfolioStore } from '@/lib/portfolioStore';

interface ParsedTransaction {
  id: string;
  itemName: string;
  itemId?: number;
  quantity: number;
  buyPrice: number;
  selected: boolean;
}

export default function CSVImportModal({ onClose }: { onClose: () => void }) {
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addItem = usePortfolioStore((state) => state.addItem);

  const parseCSV = (content: string): ParsedTransaction[] => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const transactions: ParsedTransaction[] = [];

    // Find column indices (flexible to handle various formats)
    const itemIdx = headers.findIndex((h) => h.includes('item') || h.includes('name') || h.includes('product'));
    const qtyIdx = headers.findIndex((h) => h.includes('qty') || h.includes('quantity') || h.includes('amount'));
    const priceIdx = headers.findIndex((h) => h.includes('price') || h.includes('cost') || h.includes('paid'));

    if (itemIdx === -1 || qtyIdx === -1 || priceIdx === -1) {
      throw new Error('Could not find required columns: Item/Name, Qty/Quantity, Price/Cost');
    }

    // Parse rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',').map((p) => p.trim());
      const itemName = parts[itemIdx];
      const qty = parseInt(parts[qtyIdx], 10);
      const price = parseInt(parts[priceIdx].replace(/,/g, ''), 10);

      if (!itemName || isNaN(qty) || isNaN(price)) continue;

      transactions.push({
        id: `${i}-${itemName}-${Date.now()}`,
        itemName,
        quantity: qty,
        buyPrice: price,
        selected: true, // Default to selected
      });
    }

    return transactions;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const content = await file.text();
      const parsed = parseCSV(content);

      if (parsed.length === 0) {
        setError('No valid transactions found in CSV');
        return;
      }

      setTransactions(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    );
  };

  const toggleSelectAll = () => {
    const allSelected = transactions.every((t) => t.selected);
    setTransactions((prev) => prev.map((t) => ({ ...t, selected: !allSelected })));
  };

  const handleImport = async () => {
    const selectedTransactions = transactions.filter((t) => t.selected);

    if (selectedTransactions.length === 0) {
      setError('Please select at least one transaction');
      return;
    }

    try {
      setLoading(true);

      // Add each transaction to portfolio
      for (const tx of selectedTransactions) {
        // Try to fetch item ID from OSRS API
        let itemId: number | undefined;
        try {
          const response = await fetch(`https://prices.runescape.wiki/api/v1/osrs/mapping`);
          const mapping = await response.json();
          const item = mapping.find((m: any) => m.name.toLowerCase() === tx.itemName.toLowerCase());
          itemId = item?.id;
        } catch {
          console.log(`Could not find item ID for ${tx.itemName}, will need to be looked up manually`);
        }

        addItem({
          itemId: itemId || 0, // 0 as placeholder if not found
          itemName: tx.itemName,
          quantity: tx.quantity,
          buyPrice: tx.buyPrice,
          datePurchased: Date.now(),
          sales: [],
          lots: [],
        });
      }

      setError('');
      setTransactions([]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import transactions');
    } finally {
      setLoading(false);
    }
  };

  const selectedCount = transactions.filter((t) => t.selected).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto border border-slate-700">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-100">📊 Import GE Orders</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {transactions.length === 0 ? (
            // Upload Section
            <div className="text-center space-y-4">
              <div className="border-2 border-dashed border-slate-600 rounded-lg p-12 hover:border-slate-500 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  disabled={loading}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="px-6 py-3 bg-osrs-accent hover:bg-osrs-accent/90 disabled:bg-slate-700 text-slate-900 rounded-lg font-semibold transition-colors"
                >
                  {loading ? 'Processing...' : '📁 Select CSV File'}
                </button>
                <p className="text-slate-400 text-sm mt-4">
                  Export your GE orders as CSV from RuneLite and upload here
                </p>
              </div>

              <div className="bg-slate-800 rounded-lg p-4 text-sm text-slate-300 text-left">
                <p className="font-semibold text-slate-200 mb-2">Expected CSV Format:</p>
                <code className="block bg-slate-900 p-3 rounded text-xs overflow-x-auto">
                  Item,Quantity,Price<br />
                  Iron Ore,100,150<br />
                  Coal,50,200
                </code>
                <p className="text-xs text-slate-400 mt-2">
                  Column names are flexible (Item/Name, Qty/Quantity, Price/Cost)
                </p>
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-200 text-sm">
                  ⚠️ {error}
                </div>
              )}
            </div>
          ) : (
            // Preview Section
            <>
              <div className="bg-slate-800 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-slate-300 font-medium">
                    {selectedCount} of {transactions.length} transactions selected
                  </p>
                </div>
                <button
                  onClick={toggleSelectAll}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-sm transition-colors"
                >
                  {transactions.every((t) => t.selected) ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto border border-slate-700 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800 border-b border-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={transactions.every((t) => t.selected)}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-slate-300 font-semibold">Item</th>
                      <th className="px-4 py-3 text-right text-slate-300 font-semibold">Qty</th>
                      <th className="px-4 py-3 text-right text-slate-300 font-semibold">Buy Price</th>
                      <th className="px-4 py-3 text-right text-slate-300 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className={`hover:bg-slate-800/50 transition-colors ${
                          tx.selected ? 'bg-slate-800/30' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={tx.selected}
                            onChange={() => toggleSelection(tx.id)}
                            className="w-4 h-4 rounded cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 text-slate-100 font-medium">{tx.itemName}</td>
                        <td className="px-4 py-3 text-right text-slate-300">
                          {tx.quantity.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300">
                          {tx.buyPrice.toLocaleString()} gp
                        </td>
                        <td className="px-4 py-3 text-right text-osrs-accent font-semibold">
                          {(tx.quantity * tx.buyPrice).toLocaleString()} gp
                        </td>
                      </tr>
                    ))}
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
                  onClick={() => {
                    setTransactions([]);
                    setError('');
                  }}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors"
                >
                  Upload Another File
                </button>
                <button
                  onClick={handleImport}
                  disabled={loading || selectedCount === 0}
                  className="px-6 py-2 bg-osrs-accent hover:bg-osrs-accent/90 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 rounded-lg font-semibold transition-colors"
                >
                  {loading ? 'Importing...' : `Import ${selectedCount} Item${selectedCount !== 1 ? 's' : ''}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
