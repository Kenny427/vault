'use client';

import { useState } from 'react';
import { searchItems, ItemData } from '@/lib/api/osrs';
import { usePortfolioStore } from '@/lib/portfolioStore';

interface AddPortfolioItemModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddPortfolioItemModal({ onClose, onSuccess }: AddPortfolioItemModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ItemData[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemData | null>(null);
  const [quantity, setQuantity] = useState<string>('');
  const [buyPrice, setBuyPrice] = useState<string>('');
  const [notes, setNotes] = useState('');

  const addItem = usePortfolioStore((state) => state.addItem);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const results = await searchItems(query);
      setSearchResults(results.slice(0, 10));
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleSelectItem = (item: ItemData) => {
    setSelectedItem(item);
    setSearchResults([]);
    setSearchQuery(item.name);
  };

  const handleSubmit = () => {
    if (!selectedItem || !quantity || !buyPrice) {
      alert('Please fill in all required fields');
      return;
    }

    const qty = parseInt(quantity);
    const price = parseInt(buyPrice);

    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    if (isNaN(price) || price <= 0) {
      alert('Please enter a valid buy price');
      return;
    }

    addItem({
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      quantity: qty,
      buyPrice: price,
      datePurchased: Date.now(),
      notes: notes || undefined,
    });

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-lg max-w-md w-full p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-100">Add to Portfolio</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Item Search */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Search Item *
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search for an item..."
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:border-osrs-accent"
          />
          {searchResults.length > 0 && (
            <div className="mt-2 bg-slate-800 border border-slate-700 rounded max-h-48 overflow-y-auto">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className="w-full px-4 py-2 text-left hover:bg-slate-700 text-slate-200 transition-colors"
                >
                  {item.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quantity */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Quantity *
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            min="1"
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:border-osrs-accent"
          />
        </div>

        {/* Buy Price */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Buy Price (gp each) *
          </label>
          <input
            type="number"
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value)}
            placeholder="0"
            min="1"
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:border-osrs-accent"
          />
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this purchase..."
            rows={3}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:border-osrs-accent resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedItem || !quantity || !buyPrice}
            className="flex-1 px-4 py-2 bg-osrs-accent hover:bg-osrs-accent/90 text-slate-900 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Item
          </button>
        </div>
      </div>
    </div>
  );
}
