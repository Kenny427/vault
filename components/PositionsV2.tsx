'use client';

import { useEffect, useMemo, useState } from 'react';

type PositionRow = {
  rsn: string;
  item_id: number;
  item_name: string;
  net_qty: number;
  avg_buy_price: number;
  realized_pnl_gp: number;
  last_event_time: string;
};

export default function PositionsV2() {
  const [positions, setPositions] = useState<PositionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPositions = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/positions');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load positions');
        }

        setPositions(Array.isArray(data.positions) ? data.positions : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load positions');
      } finally {
        setLoading(false);
      }
    };

    loadPositions();
  }, []);

  const totalRealizedPnl = useMemo(
    () => positions.reduce((sum, position) => sum + position.realized_pnl_gp, 0),
    [positions]
  );

  if (loading) {
    return <div className="text-slate-300">Loading positions...</div>;
  }

  if (error) {
    return <div className="text-red-300">Failed to load positions: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-100">Positions v2</h2>
        <div className={`text-sm font-medium ${totalRealizedPnl >= 0 ? 'text-green-300' : 'text-red-300'}`}>
          Realized PnL: {Math.round(totalRealizedPnl).toLocaleString()} gp
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900">
            <tr className="text-left text-slate-300">
              <th className="px-4 py-3 font-semibold">RSN</th>
              <th className="px-4 py-3 font-semibold">Item</th>
              <th className="px-4 py-3 font-semibold">Item ID</th>
              <th className="px-4 py-3 font-semibold">Net Qty</th>
              <th className="px-4 py-3 font-semibold">Avg Buy</th>
              <th className="px-4 py-3 font-semibold">Realized PnL</th>
              <th className="px-4 py-3 font-semibold">Last Event</th>
            </tr>
          </thead>
          <tbody>
            {positions.length === 0 && (
              <tr className="border-t border-slate-800">
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  No open positions.
                </td>
              </tr>
            )}
            {positions.map((position) => (
              <tr key={`${position.rsn}-${position.item_id}`} className="border-t border-slate-800 text-slate-200">
                <td className="px-4 py-3">{position.rsn}</td>
                <td className="px-4 py-3">{position.item_name}</td>
                <td className="px-4 py-3">{position.item_id}</td>
                <td className="px-4 py-3">{position.net_qty.toLocaleString()}</td>
                <td className="px-4 py-3">{Math.round(position.avg_buy_price).toLocaleString()} gp</td>
                <td className={`px-4 py-3 ${position.realized_pnl_gp >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                  {Math.round(position.realized_pnl_gp).toLocaleString()} gp
                </td>
                <td className="px-4 py-3 text-slate-400">{new Date(position.last_event_time).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
