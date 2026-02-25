'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

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

type OpportunitiesResponse = {
  opportunities: TradingDeskOpportunity[];
};

function estimateCheckbackMinutes(volume1h: number): number {
  if (volume1h >= 250_000) return 4;
  if (volume1h >= 120_000) return 6;
  if (volume1h >= 60_000) return 8;
  if (volume1h >= 25_000) return 12;
  if (volume1h >= 10_000) return 18;
  return 25;
}

function buildWhy(opportunity: TradingDeskOpportunity): string[] {
  const bullets: string[] = [];

  if (opportunity.volume1h >= 80_000) {
    bullets.push('High 1h volume supports faster fills.');
  } else if (opportunity.volume1h >= 20_000) {
    bullets.push('Healthy 1h volume with acceptable execution risk.');
  } else {
    bullets.push('Lower 1h volume can slow order completion.');
  }

  if (opportunity.spreadPct <= 0.03) {
    bullets.push('Tight spread % lowers slippage risk.');
  } else if (opportunity.spreadPct <= 0.08) {
    bullets.push('Moderate spread leaves room for net capture.');
  } else {
    bullets.push('Wide spread % can increase execution variance.');
  }

  if (opportunity.recencyMinutes == null || opportunity.recencyMinutes > 15) {
    bullets.push('Stale prints warning: latest trade update is older than 15m.');
  } else {
    bullets.push(`Recent prints: last trade update ~${opportunity.recencyMinutes}m ago.`);
  }

  return bullets.slice(0, 3);
}

async function fetchOpportunities(strategy: 'liquidity' | 'mean-reversion'): Promise<TradingDeskOpportunity[]> {
  const params = new URLSearchParams({
    budgetGp: '10000000000',
    slots: '8',
    limit: '25',
    risk: 'med',
    strategy,
  });

  const response = await fetch(`/api/trading-desk/opportunities?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch opportunities (${response.status})`);
  }
  const json: OpportunitiesResponse = await response.json();
  return json.opportunities || [];
}

export default function AlphaFeedV2() {
  const [strategy, setStrategy] = useState<'liquidity' | 'mean-reversion'>('liquidity');
  const [ignoredItems, setIgnoredItems] = useState<Set<number>>(new Set());
  const [sessionItems, setSessionItems] = useState<Set<number>>(new Set());

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['alpha-feed-v2', strategy, 10_000_000_000, 8, 25, 'med'],
    queryFn: () => fetchOpportunities(strategy),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const visibleItems = useMemo(() => {
    const opportunities = data || [];
    return opportunities.filter((item) => !ignoredItems.has(item.itemId));
  }, [data, ignoredItems]);

  return (
    <div className="space-y-4">
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Alpha Feed v2</h2>
          <p className="text-xs text-slate-400">Trading Desk opportunities (budget 10b, 8 slots, med risk).</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Strategy</label>
          <select
            value={strategy}
            onChange={(e) => {
              const v = e.target.value;
              const next: 'liquidity' | 'mean-reversion' = v === 'mean-reversion' ? 'mean-reversion' : 'liquidity';
              setStrategy(next);
              // Different strategies change the universe; clear ignores.
              setIgnoredItems(new Set());
            }}
            className="text-sm bg-slate-950/70 border border-slate-700 text-slate-200 rounded px-2 py-2"
          >
            <option value="liquidity">Liquidity-first</option>
            <option value="mean-reversion">Mean-reversion</option>
          </select>

          <button
            onClick={() => refetch()}
            className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-6 text-slate-400">
          Loading opportunities...
        </div>
      )}

      {isError && (
        <div className="bg-red-900/20 border border-red-700/40 rounded-lg p-4 text-red-200 text-sm">
          {(error as Error)?.message || 'Failed to load Alpha Feed v2.'}
        </div>
      )}

      {!isLoading && !isError && visibleItems.length === 0 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-6 text-slate-400">
          No opportunities available right now.
        </div>
      )}

      {!isLoading && !isError && visibleItems.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visibleItems.map((o) => {
            const why = buildWhy(o);
            const checkbackMinutes = estimateCheckbackMinutes(o.volume1h);
            const inSession = sessionItems.has(o.itemId);

            return (
              <div
                key={o.itemId}
                className="bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800 rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {o.icon ? (
                      <img src={`https://prices.runescape.wiki${o.icon}`} alt="" className="w-8 h-8" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-slate-800" />
                    )}
                    <div className="min-w-0">
                      <div className="text-slate-100 font-semibold truncate">{o.name}</div>
                      <div className="text-xs text-slate-500">#{o.itemId}{o.members ? ' · mem' : ''}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Check back</div>
                    <div className="text-sm text-yellow-300 font-medium">~{checkbackMinutes}m</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                  <div className="bg-slate-950/70 rounded p-2">
                    <div className="text-[11px] text-slate-500">Buy Price</div>
                    <div className="text-sm text-slate-200">{o.buyPrice.toLocaleString()}</div>
                  </div>
                  <div className="bg-slate-950/70 rounded p-2">
                    <div className="text-[11px] text-slate-500">Sell Price</div>
                    <div className="text-sm text-slate-200">{o.sellPrice.toLocaleString()}</div>
                  </div>
                  <div className="bg-slate-950/70 rounded p-2">
                    <div className="text-[11px] text-slate-500">Recommended Qty</div>
                    <div className="text-sm text-slate-200">{o.recommendedQty.toLocaleString()}</div>
                  </div>
                  <div className="bg-slate-950/70 rounded p-2">
                    <div className="text-[11px] text-slate-500">Buy Limit</div>
                    <div className="text-sm text-slate-200">{o.buyLimit?.toLocaleString() ?? '-'}</div>
                  </div>
                  <div className="bg-slate-950/70 rounded p-2">
                    <div className="text-[11px] text-slate-500">Volume 1h</div>
                    <div className="text-sm text-slate-200">{o.volume1h.toLocaleString()}</div>
                  </div>
                  <div className="bg-slate-950/70 rounded p-2">
                    <div className="text-[11px] text-slate-500">GP/hr Proxy</div>
                    <div className="text-sm text-green-300">{o.gpPerHourProxy.toLocaleString()}</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-xs px-2 py-1 rounded bg-blue-900/50 text-blue-200 border border-blue-700/30">
                    Spread: {o.spreadGp.toLocaleString()} gp
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-indigo-900/50 text-indigo-200 border border-indigo-700/30">
                    {(o.spreadPct * 100).toFixed(2)}%
                  </span>
                  {o.flags.slice(0, 4).map((flag) => (
                    <span key={flag} className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300">
                      {flag}
                    </span>
                  ))}
                </div>

                <div className="mb-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Why</div>
                  <ul className="text-sm text-slate-300 space-y-1">
                    {why.map((reason) => (
                      <li key={reason}>• {reason}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() =>
                      setSessionItems((prev) => {
                        const next = new Set(prev);
                        next.add(o.itemId);
                        return next;
                      })
                    }
                    className={`px-3 py-2 text-sm rounded transition-colors ${
                      inSession ? 'bg-green-700 text-green-100' : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {inSession ? 'Added to Session' : 'Add to Session'}
                  </button>
                  <button
                    onClick={() =>
                      setIgnoredItems((prev) => {
                        const next = new Set(prev);
                        next.add(o.itemId);
                        return next;
                      })
                    }
                    className="px-3 py-2 text-sm rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                  >
                    Ignore
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
