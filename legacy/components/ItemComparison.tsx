'use client';

import { useState, useEffect } from 'react';

interface ItemComparisonProps {
  itemNames: string[];
}

export default function ItemComparison({ itemNames }: ItemComparisonProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadItems = async () => {
      setLoading(true);
      // Items will be passed as objects with prices already fetched
      setItems([]);
      setLoading(false);
    };
    loadItems();
  }, [itemNames]);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-osrs-accent mx-auto mb-3"></div>
        <p className="text-slate-400">Loading comparison...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-8 text-center">
        <p className="text-slate-400">No items to compare</p>
      </div>
    );
  }

  const metrics = [
    { key: 'high', label: 'Current Price', format: (v: number) => `${v.toLocaleString()}gp` },
    { key: 'highTime', label: 'Last Updated', format: (v: number) => new Date(v * 1000).toLocaleTimeString() },
  ];

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-800/50 border-b border-slate-700">
            <tr>
              <th className="text-left px-6 py-4 text-slate-300 font-semibold">Metric</th>
              {items.map((item, idx) => (
                <th key={idx} className="text-right px-6 py-4 text-slate-300 font-semibold">
                  {item.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {metrics.map((metric) => (
              <tr key={metric.key} className="hover:bg-slate-800/30">
                <td className="px-6 py-4 text-slate-400">{metric.label}</td>
                {items.map((item, idx) => (
                  <td key={idx} className="text-right px-6 py-4 text-slate-100">
                    {metric.format((item as any)[metric.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
