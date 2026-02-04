'use client';

import { useEffect, useState } from 'react';
import SearchBar from '@/components/SearchBar';
import { ItemData } from '@/lib/api/osrs';

interface PoolItem {
  id: number;
  name: string;
}

export default function AdminPoolPage() {
  const [pool, setPool] = useState<PoolItem[]>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('osrs-custom-pool');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setPool(parsed);
        } catch {
          setPool([]);
        }
      }
    }
  }, []);

  const savePool = (items: PoolItem[]) => {
    setPool(items);
    if (typeof window !== 'undefined') {
      localStorage.setItem('osrs-custom-pool', JSON.stringify(items));
    }
  };

  const handleAdd = (item: ItemData) => {
    if (pool.some(p => p.id === item.id)) {
      setStatus('Item already in pool.');
      return;
    }
    const updated = [...pool, { id: item.id, name: item.name }].sort((a, b) => a.name.localeCompare(b.name));
    savePool(updated);
    setStatus(`Added ${item.name}.`);
  };

  const handleRemove = (id: number) => {
    const updated = pool.filter(p => p.id !== id);
    savePool(updated);
    setStatus('Item removed.');
  };

  const handleClear = () => {
    savePool([]);
    setStatus('Custom pool cleared. Default pool will be used.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-2">Admin Pool</h1>
        <p className="text-slate-400 mb-6">
          Add or remove items for AI analysis. If this list is empty, the default pool is used.
        </p>

        <div className="mb-6">
          <SearchBar onItemSelect={handleAdd} />
        </div>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-slate-400">Items in pool: {pool.length}</span>
          <button
            onClick={handleClear}
            className="px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 rounded"
          >
            Clear Custom Pool
          </button>
          {status && <span className="text-sm text-emerald-400">{status}</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {pool.map(item => (
            <div key={item.id} className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded px-4 py-3">
              <div>
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-slate-500">ID: {item.id}</div>
              </div>
              <button
                onClick={() => handleRemove(item.id)}
                className="text-sm text-red-300 hover:text-red-200"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
