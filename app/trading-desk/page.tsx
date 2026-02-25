'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';

type DeskRisk = 'low' | 'med' | 'high';

type TradingDeskOpportunity = {
  itemId: number;
  name: string;
  icon: string;
  members: boolean;
  mid: number;
  buyPrice: number;
  sellPrice: number;
  spreadGp: number;
  spreadPct: number;
  volume1h: number;
  buyLimit: number | null;
  recencyMinutes: number | null;
  recommendedQty: number;
  targetStakeGp: number;
  score: number;
  gpPerHourProxy: number;
  flags: string[];
};

export default function TradingDeskPage() {
  const { session, loading } = useAuth();

  const [budgetGp, setBudgetGp] = useState(10_000_000_000);
  const [slots, setSlots] = useState(8);
  const [limit, setLimit] = useState(40);
  const [risk, setRisk] = useState<DeskRisk>('med');

  const [data, setData] = useState<TradingDeskOpportunity[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set('budgetGp', String(budgetGp));
    p.set('slots', String(slots));
    p.set('limit', String(limit));
    p.set('risk', risk);
    return p.toString();
  }, [budgetGp, slots, limit, risk]);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;
    setFetching(true);
    setErr(null);

    fetch(`/api/trading-desk/opportunities?${qs}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;
        setData(json.opportunities || []);
      })
      .catch((e) => {
        if (cancelled) return;
        setErr(e?.message || 'Error');
      })
      .finally(() => {
        if (cancelled) return;
        setFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [qs, session]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Please log in on the home page.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Trading Desk</h1>
            <p className="text-slate-400 text-sm mt-1">
              Balanced mode: høy sannsynlighet for fills, mindre babysitting.
            </p>
          </div>
          <Link href="/" className="text-sm text-yellow-300 hover:text-yellow-200">← Til dashboard</Link>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="text-xs text-slate-400">Budget (gp)</label>
              <input
                className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100"
                value={budgetGp}
                onChange={(e) => setBudgetGp(Number(e.target.value) || 0)}
                type="number"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Slots</label>
              <input
                className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100"
                value={slots}
                onChange={(e) => setSlots(Number(e.target.value) || 0)}
                type="number"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Liste-lengde</label>
              <input
                className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value) || 0)}
                type="number"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Risk</label>
              <select
                className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100"
                value={risk}
                onChange={(e) => setRisk(e.target.value as DeskRisk)}
              >
                <option value="low">Low</option>
                <option value="med">Med</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="flex items-end">
              <div className="text-xs text-slate-500">
                {fetching ? 'Henter…' : `Funnet ${data.length} picks`}
              </div>
            </div>
          </div>

          {err && <div className="mt-3 text-sm text-red-300">{err}</div>}
        </div>

        <div className="overflow-x-auto bg-slate-900/40 border border-slate-800 rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="text-slate-400">
              <tr className="border-b border-slate-800">
                <th className="text-left p-3">Item</th>
                <th className="text-right p-3">Score</th>
                <th className="text-right p-3">Spread</th>
                <th className="text-right p-3">Vol 1h</th>
                <th className="text-right p-3">Limit</th>
                <th className="text-right p-3">Qty</th>
                <th className="text-right p-3">Buy</th>
                <th className="text-right p-3">Sell</th>
                <th className="text-right p-3">GP/hr*</th>
                <th className="text-left p-3">Flags</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {data.map((o) => (
                <tr key={o.itemId} className="border-b border-slate-800/60 hover:bg-slate-900/60">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {o.icon ? (
                        // icon is a path on wiki; render absolute
                        <img
                          src={`https://prices.runescape.wiki${o.icon}`}
                          alt=""
                          className="w-6 h-6"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded bg-slate-800" />
                      )}
                      <div>
                        <div className="font-medium">{o.name}</div>
                        <div className="text-xs text-slate-500">#{o.itemId}{o.members ? ' · mem' : ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-right">{o.score.toFixed(3)}</td>
                  <td className="p-3 text-right">
                    {o.spreadGp.toLocaleString()} ({(o.spreadPct * 100).toFixed(2)}%)
                  </td>
                  <td className="p-3 text-right">{o.volume1h.toLocaleString()}</td>
                  <td className="p-3 text-right">{o.buyLimit ?? '-'}</td>
                  <td className="p-3 text-right">{o.recommendedQty.toLocaleString()}</td>
                  <td className="p-3 text-right">{o.buyPrice.toLocaleString()}</td>
                  <td className="p-3 text-right">{o.sellPrice.toLocaleString()}</td>
                  <td className="p-3 text-right">{o.gpPerHourProxy.toLocaleString()}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {o.flags.slice(0, 3).map((f) => (
                        <span key={f} className="text-[10px] px-2 py-1 rounded-full bg-slate-800 text-slate-300">
                          {f}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-slate-500">
          * GP/hr er en proxy basert på spread, volume og anbefalt qty. Ikke garantert – brukes for rangering.
        </div>
      </div>
    </div>
  );
}
