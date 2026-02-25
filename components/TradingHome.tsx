'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

type DeskOpportunity = {
  itemId: number;
  name: string;
  icon: string;
  members: boolean;
  buyLimit: number | null;
  mid: number;
  buyPrice: number;
  sellPrice: number;
  spreadGp: number;
  spreadPct: number;
  volume1h: number;
  recencyMinutes: number | null;
  recommendedQty: number;
  targetStakeGp: number;
  score: number;
  gpPerHourProxy: number;
  flags: string[];
};

type DeskResponse = {
  params: { budgetGp: number; slots: number; limit: number; risk: 'low' | 'med' | 'high' };
  opportunities: DeskOpportunity[];
};

function formatGp(n: number) {
  if (!Number.isFinite(n)) return '-';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}b`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

function pct(n: number) {
  return `${(n * 100).toFixed(2)}%`;
}

export default function TradingHome() {
  const [risk, setRisk] = useState<'low' | 'med' | 'high'>('med');
  const [slots, setSlots] = useState(8);
  const [budgetGp, setBudgetGp] = useState(10_000_000_000);

  const deskQueryKey = useMemo(() => ['desk-opps', { risk, slots, budgetGp }], [risk, slots, budgetGp]);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: deskQueryKey,
    queryFn: async (): Promise<DeskResponse> => {
      const url = new URL('/api/trading-desk/opportunities', window.location.origin);
      url.searchParams.set('risk', risk);
      url.searchParams.set('slots', String(slots));
      url.searchParams.set('budgetGp', String(budgetGp));
      url.searchParams.set('limit', '25');
      url.searchParams.set('t', String(Date.now())); // bypass caches
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const top = data?.opportunities?.[0] ?? null;
  const rest = (data?.opportunities ?? []).slice(1, 8);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-400">Pulse / Vault</div>
            <h1 className="text-3xl font-semibold mt-1">Trading Home</h1>
            <p className="text-slate-400 mt-2 max-w-2xl">
              Trading-app stil: én tydelig &quot;beste neste handling&quot; + et lite shortlist. (Ingen botting – bare beslutningsstøtte.)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/dashboard"
              className="px-3 py-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 text-sm border border-slate-800"
            >
              Åpne gammel Dashboard
            </a>
            <button
              onClick={() => refetch()}
              className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:bg-slate-700"
              disabled={isFetching}
            >
              {isFetching ? 'Oppdaterer…' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs text-slate-400">Next Best Action (Desk – liquidity-first)</div>
                <div className="text-lg font-semibold mt-1">{top ? top.name : (isLoading ? 'Laster…' : 'Ingen kandidater akkurat nå')}</div>
              </div>
              {top && (
                <div className="text-right">
                  <div className="text-xs text-slate-400">Est. stake/slot</div>
                  <div className="font-semibold">{formatGp(top.targetStakeGp)} gp</div>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-3 text-sm text-red-300 bg-red-950/40 border border-red-900 rounded p-3">
                Kunne ikke hente opportunities: {String((error as any)?.message || error)}
              </div>
            )}

            {!top ? null : (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg bg-slate-950/40 border border-slate-800 p-3">
                  <div className="text-xs text-slate-400">Buy</div>
                  <div className="font-semibold">{formatGp(top.buyPrice)}</div>
                </div>
                <div className="rounded-lg bg-slate-950/40 border border-slate-800 p-3">
                  <div className="text-xs text-slate-400">Sell</div>
                  <div className="font-semibold">{formatGp(top.sellPrice)}</div>
                </div>
                <div className="rounded-lg bg-slate-950/40 border border-slate-800 p-3">
                  <div className="text-xs text-slate-400">Spread</div>
                  <div className="font-semibold">{formatGp(top.spreadGp)} ({pct(top.spreadPct)})</div>
                </div>
                <div className="rounded-lg bg-slate-950/40 border border-slate-800 p-3">
                  <div className="text-xs text-slate-400">Vol (1h)</div>
                  <div className="font-semibold">{formatGp(top.volume1h)}</div>
                </div>
              </div>
            )}

            {!top ? null : (
              <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/30 p-4">
                <div className="text-xs uppercase tracking-wider text-slate-400">Plan</div>
                <ul className="mt-2 text-sm text-slate-200 space-y-1">
                  <li>• Legg inn buy @ <span className="font-semibold">{formatGp(top.buyPrice)}</span>, qty ~ <span className="font-semibold">{formatGp(top.recommendedQty)}</span></li>
                  <li>• Når filled: sell @ <span className="font-semibold">{formatGp(top.sellPrice)}</span></li>
                  <li>• Abort hvis spread faller under 30gp / prints blir stale / du ikke får fills innen rimelig tid</li>
                </ul>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="text-xs text-slate-400">Controls</div>

            <label className="block mt-3 text-sm">
              Risk
              <select
                className="mt-1 w-full bg-slate-950/50 border border-slate-800 rounded px-3 py-2"
                value={risk}
                onChange={(e) => setRisk(e.target.value as any)}
              >
                <option value="low">Low</option>
                <option value="med">Med</option>
                <option value="high">High</option>
              </select>
            </label>

            <label className="block mt-3 text-sm">
              Slots
              <input
                className="mt-1 w-full bg-slate-950/50 border border-slate-800 rounded px-3 py-2"
                type="number"
                min={1}
                max={24}
                value={slots}
                onChange={(e) => setSlots(Math.max(1, Math.min(24, Number(e.target.value) || 8)))}
              />
            </label>

            <label className="block mt-3 text-sm">
              Budget (gp)
              <input
                className="mt-1 w-full bg-slate-950/50 border border-slate-800 rounded px-3 py-2"
                type="number"
                min={1_000_000}
                step={1_000_000}
                value={budgetGp}
                onChange={(e) => setBudgetGp(Math.max(1_000_000, Number(e.target.value) || 10_000_000_000))}
              />
            </label>

            <div className="mt-4 text-xs text-slate-400">
              Mean reversion / swing strategies kommer som egne strategier i denne samme flaten, men de skal ikke auto-kjøre fordi de kan bruke AI-credits.
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs text-slate-400">Shortlist (Desk)</div>
              <div className="text-lg font-semibold mt-1">Flere kandidater</div>
            </div>
            <div className="text-xs text-slate-400">Viser top {rest.length} etter “Next Best Action”</div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {rest.map((o) => (
              <div key={o.itemId} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
                <div className="font-semibold">{o.name}</div>
                <div className="mt-2 text-xs text-slate-400 grid grid-cols-2 gap-2">
                  <div>Spread: <span className="text-slate-200">{formatGp(o.spreadGp)}</span></div>
                  <div>Vol 1h: <span className="text-slate-200">{formatGp(o.volume1h)}</span></div>
                  <div>Buy: <span className="text-slate-200">{formatGp(o.buyPrice)}</span></div>
                  <div>Sell: <span className="text-slate-200">{formatGp(o.sellPrice)}</span></div>
                </div>
              </div>
            ))}
            {(!isLoading && rest.length === 0) && (
              <div className="text-slate-400 text-sm">Ingen shortlist akkurat nå (filtrene er strenge – det er med vilje).</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
