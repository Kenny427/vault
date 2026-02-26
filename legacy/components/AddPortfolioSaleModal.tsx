'use client';

import { useMemo, useState } from 'react';
import { usePortfolioStore } from '@/lib/portfolioStore';

interface AddPortfolioSaleModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddPortfolioSaleModal({ onClose, onSuccess }: AddPortfolioSaleModalProps) {
  const items = usePortfolioStore((state) => state.items);
  const addSale = usePortfolioStore((state) => state.addSale);

  const [selectedId, setSelectedId] = useState<string>(items[0]?.id ?? '');
  const [quantity, setQuantity] = useState<string>('');
  const [sellPrice, setSellPrice] = useState<string>('');
  const [notes, setNotes] = useState('');

  const selectedItem = useMemo(() => items.find((item) => item.id === selectedId), [items, selectedId]);

  const remainingQuantity = useMemo(() => {
    if (!selectedItem) return 0;
    const sold = (selectedItem.sales ?? []).reduce((sum, sale) => sum + sale.quantity, 0);
    return Math.max(0, selectedItem.quantity - sold);
  }, [selectedItem]);

  const handleSubmit = () => {
    if (!selectedItem || !quantity || !sellPrice) {
      alert('Please fill in all required fields');
      return;
    }

    const qty = parseInt(quantity, 10);
    const price = parseInt(sellPrice, 10);

    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    if (qty > remainingQuantity) {
      alert('You cannot sell more than your remaining quantity');
      return;
    }

    if (isNaN(price) || price <= 0) {
      alert('Please enter a valid sell price');
      return;
    }

    addSale(selectedItem.id, {
      quantity: qty,
      sellPrice: price,
      dateSold: Date.now(),
      notes: notes || undefined,
    });

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-lg max-w-md w-full p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-100">Record a Sale</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-2xl">
            ×
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">Item *</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100"
          >
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.itemName}
              </option>
            ))}
          </select>
          <div className="text-xs text-slate-500 mt-1">Remaining: {remainingQuantity.toLocaleString()}</div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">Quantity Sold *</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            min="1"
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">Sell Price (gp each) *</label>
          <input
            type="number"
            value={sellPrice}
            onChange={(e) => setSellPrice(e.target.value)}
            placeholder="0"
            min="1"
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this sale..."
            rows={3}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedItem || !quantity || !sellPrice}
            className="flex-1 px-4 py-2 bg-osrs-accent hover:bg-osrs-accent/90 text-slate-900 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Record Sale
          </button>
        </div>
      </div>
    </div>
  );
}
