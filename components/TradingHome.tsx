'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

type Strategy = 'swing' | 'desk';

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

type MeanRevOpportunity = {
  itemId: number;
  itemName: string;
  currentPrice: number;
  targetSellPrice?: number;
  exitPriceBase?: number;
  reversionPotential: number; // %
  confidenceScore: number; // 0-100
  expectedRecoveryWeeks?: number;
  liquidityScore?: number;
  structuralRepricingRisk?: string;
  logic?: {
    thesis?: string;
    vulnerability?: string;
    trigger?: string;
  };
};

type MeanRevResponse = {
  success: boolean;
  opportunities: MeanRevOpportunity[];
  summary?: Record<string, unknown>;
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

async function createThesis(payload: {
  item_id: number;
  horizon: 'hours' | 'days' | 'weeks';
  catalyst: string;
  confidence: number;
  entry_plan?: unknown;
  exit_plan?: unknown;
  invalidation?: unknown;
}) {
  const res = await fetch('/api/theses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function TradingHome() {
  // Default: low babysitting => swing first
  const [strategy, setStrategy] = useState<Strategy>('swing');

  // Shared portfolio controls
  const [budgetGp, setBudgetGp] = useState(10_000_000_000);
  const [slots, setSlots] = useState(8);

  // Desk controls
  const [risk, setRisk] = useState<'low' | 'med' | 'high'>('med');

  // Swing controls (keep strict by default)
  const [minConfidence, setMinConfidence] = useState(70);
  const [minPotential, setMinPotential] = useState(20);

  const deskQueryKey = useMemo(() => ['desk-opps', { risk, slots, budgetGp }], [risk, slots, budgetGp]);

  const deskQuery = useQuery({
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
    enabled: strategy === 'desk',
  });

  const swingQueryKey = useMemo(
    () => ['swing-opps', { minConfidence, minPotential }],
    [minConfidence, minPotential]
  );

  const swingQuery = useQuery({
    queryKey: swingQueryKey,
    queryFn: async (): Promise<MeanRevResponse> => {
      const url = new URL('/api/mean-reversion-opportunities', window.location.origin);
      url.searchParams.set('minConfidence', String(minConfidence));
      url.searchParams.set('minPotential', String(minPotential));
      url.searchParams.set('t', String(Date.now()));
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
    enabled: false, // on-demand (credits)
  });

  const deskTop = deskQuery.data?.opportunities?.[0] ?? null;
  const deskRest = (deskQuery.data?.opportunities ?? []).slice(1, 8);

  const swingTop = swingQuery.data?.opportunities?.[0] ?? null;
  const swingRest = (swingQuery.data?.opportunities ?? []).slice(1, 8);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-400">Vault</div>
            <h1 className="text-3xl font-semibold mt-1">Trading Home</h1>
            <p className="text-slate-400 mt-2 max-w-2xl">
              Trading-app stil: én tydelig &quot;beste neste handling&quot; + et lite shortlist. Default er lav babysitting.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/dashboard"
              className="px-3 py-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 text-sm border border-slate-800"
            >
              /dashboard
            </a>
          </div>
        </div>

        {/* Strategy switch */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setStrategy('swing')}
              className={`px-3 py-2 rounded text-sm border ${strategy === 'swing'
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-900'
                }`}
            >
              Swing (Mean Reversion)
            </button>
            <button
              onClick={() => setStrategy('desk')}
              className={`px-3 py-2 rounded text-sm border ${strategy === 'desk'
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-900'
                }`}
            >
              Desk (Active)
            </button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-xs text-slate-400">Budget/slots påvirker sizing</div>
            <div className="flex items-center gap-2">
              <input
                className="w-36 bg-slate-950/50 border border-slate-800 rounded px-3 py-2 text-sm"
                type="number"
                min={1_000_000}
                step={1_000_000}
                value={budgetGp}
                onChange={(e) => setBudgetGp(Math.max(1_000_000, Number(e.target.value) || 10_000_000_000))}
              />
              <input
                className="w-20 bg-slate-950/50 border border-slate-800 rounded px-3 py-2 text-sm"
                type="number"
                min={1}
                max={24}
                value={slots}
                onChange={(e) => setSlots(Math.max(1, Math.min(24, Number(e.target.value) || 8)))}
              />
            </div>
          </div>
        </div>

        {/* Main panels */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            {strategy === 'desk' ? (
              <>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-xs text-slate-400">Next Best Action (Desk – liquidity-first)</div>
                    <div className="text-lg font-semibold mt-1">{deskTop ? deskTop.name : (deskQuery.isLoading ? 'Laster…' : 'Ingen kandidater akkurat nå')}</div>
                  </div>
                  {deskTop && (
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Est. stake/slot</div>
                      <div className="font-semibold">{formatGp(deskTop.targetStakeGp)} gp</div>
                    </div>
                  )}
                </div>

                {deskQuery.error && (
                  <div className="mt-3 text-sm text-red-300 bg-red-950/40 border border-red-900 rounded p-3">
                    Kunne ikke hente opportunities: {String((deskQuery.error as any)?.message || deskQuery.error)}
                  </div>
                )}

                {!deskTop ? null : (
                  <>
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="rounded-lg bg-slate-950/40 border border-slate-800 p-3">
                        <div className="text-xs text-slate-400">Buy</div>
                        <div className="font-semibold">{formatGp(deskTop.buyPrice)}</div>
                      </div>
                      <div className="rounded-lg bg-slate-950/40 border border-slate-800 p-3">
                        <div className="text-xs text-slate-400">Sell</div>
                        <div className="font-semibold">{formatGp(deskTop.sellPrice)}</div>
                      </div>
                      <div className="rounded-lg bg-slate-950/40 border border-slate-800 p-3">
                        <div className="text-xs text-slate-400">Spread</div>
                        <div className="font-semibold">{formatGp(deskTop.spreadGp)} ({pct(deskTop.spreadPct)})</div>
                      </div>
                      <div className="rounded-lg bg-slate-950/40 border border-slate-800 p-3">
                        <div className="text-xs text-slate-400">Vol (1h)</div>
                        <div className="font-semibold">{formatGp(deskTop.volume1h)}</div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/30 p-4">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-xs uppercase tracking-wider text-slate-400">Plan</div>
                        <button
                          onClick={async () => {
                            try {
                              await createThesis({
                                item_id: deskTop.itemId,
                                horizon: 'hours',
                                catalyst: 'desk_spread_balanced',
                                confidence: Math.round(deskTop.score * 100),
                                entry_plan: { buy: deskTop.buyPrice, qty: deskTop.recommendedQty },
                                exit_plan: { sell: deskTop.sellPrice },
                                invalidation: { rules: ['spread<30gp', 'stale_prints', 'no_fills_time_stop'] },
                              });
                              alert('Thesis laget (watching).');
                            } catch (e: any) {
                              alert(`Kunne ikke lage thesis: ${e?.message || String(e)}`);
                            }
                          }}
                          className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm"
                        >
                          Lag thesis
                        </button>
                      </div>
                      <ul className="mt-2 text-sm text-slate-200 space-y-1">
                        <li>• Legg inn buy @ <span className="font-semibold">{formatGp(deskTop.buyPrice)}</span>, qty ~ <span className="font-semibold">{formatGp(deskTop.recommendedQty)}</span></li>
                        <li>• Når filled: sell @ <span className="font-semibold">{formatGp(deskTop.sellPrice)}</span></li>
                        <li>• Abort hvis du ikke får fills i praksis (time-stop) eller spread kollapser</li>
                      </ul>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-xs text-slate-400">Next Best Action (Swing – Mean Reversion)</div>
                    <div className="text-lg font-semibold mt-1">{swingTop ? swingTop.itemName : 'Kjør scan for å få forslag'}</div>
                  </div>

                  <button
                    onClick={async () => {
                      const ok = window.confirm(
                        'Dette kjører swing-scan og kan bruke credits. Vil du kjøre nå?'
                      );
                      if (!ok) return;
                      await swingQuery.refetch();
                    }}
                    className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:bg-slate-700"
                    disabled={swingQuery.isFetching}
                  >
                    {swingQuery.isFetching ? 'Scanner…' : 'Run Swing Scan (credits)'}
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-slate-950/40 border border-slate-800 p-3">
                    <div className="text-xs text-slate-400">Min confidence</div>
                    <input
                      className="mt-1 w-full bg-slate-950/50 border border-slate-800 rounded px-2 py-1 text-sm"
                      type="number"
                      min={0}
                      max={100}
                      value={minConfidence}
                      onChange={(e) => setMinConfidence(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                    />
                  </div>
                  <div className="rounded-lg bg-slate-950/40 border border-slate-800 p-3">
                    <div className="text-xs text-slate-400">Min potential</div>
                    <input
                      className="mt-1 w-full bg-slate-950/50 border border-slate-800 rounded px-2 py-1 text-sm"
                      type="number"
                      min={0}
                      max={200}
                      value={minPotential}
                      onChange={(e) => setMinPotential(Math.max(0, Math.min(200, Number(e.target.value) || 0)))}
                    />
                  </div>
                  <div className="rounded-lg bg-slate-950/40 border border-slate-800 p-3">
                    <div className="text-xs text-slate-400">Mode</div>
                    <div className="mt-2 text-sm text-slate-200">Low babysitting</div>
                  </div>
                  <div className="rounded-lg bg-slate-950/40 border border-slate-800 p-3">
                    <div className="text-xs text-slate-400">Note</div>
                    <div className="mt-2 text-xs text-slate-400">On-demand for å spare credits</div>
                  </div>
                </div>

                {swingQuery.error && (
                  <div className="mt-3 text-sm text-red-300 bg-red-950/40 border border-red-900 rounded p-3">
                    Kunne ikke kjøre swing-scan: {String((swingQuery.error as any)?.message || swingQuery.error)}
                  </div>
                )}

                {!swingTop ? null : (
                  <>
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="rounded-lg bg-slate-950/40 border border-slate-800 p-3">
                        <div className="text-xs text-slate-400">Entry (now)</div>
                        <div className="font-semibold">{formatGp(swingTop.currentPrice)}</div>
                      </div>
                      <div className="rounded-lg bg-slate-950/40 border border-slate-800 p-3">
                        <div className="text-xs text-slate-400">Exit base</div>
                        <div className="font-semibold">{formatGp(swingTop.targetSellPrice ?? swingTop.exitPriceBase ?? 0)}</div>
                      </div>
                      <div className="rounded-lg bg-slate-950/40 border border-slate-800 p-3">
                        <div className="text-xs text-slate-400">Potential</div>
                        <div className="font-semibold">{swingTop.reversionPotential.toFixed(1)}%</div>
                      </div>
                      <div className="rounded-lg bg-slate-950/40 border border-slate-800 p-3">
                        <div className="text-xs text-slate-400">Confidence</div>
                        <div className="font-semibold">{Math.round(swingTop.confidenceScore)}/100</div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/30 p-4">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-xs uppercase tracking-wider text-slate-400">Plan</div>
                        <button
                          onClick={async () => {
                            try {
                              await createThesis({
                                item_id: swingTop.itemId,
                                horizon: 'weeks',
                                catalyst: 'meanrev_botdump_v1',
                                confidence: Math.round(swingTop.confidenceScore),
                                entry_plan: { buy: swingTop.currentPrice },
                                exit_plan: { sell: (swingTop.targetSellPrice ?? swingTop.exitPriceBase ?? null) },
                                invalidation: { trigger: swingTop.logic?.trigger ?? null, risk: swingTop.structuralRepricingRisk ?? null },
                              });
                              alert('Thesis laget (watching).');
                            } catch (e: any) {
                              alert(`Kunne ikke lage thesis: ${e?.message || String(e)}`);
                            }
                          }}
                          className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm"
                        >
                          Lag thesis
                        </button>
                      </div>
                      <ul className="mt-2 text-sm text-slate-200 space-y-1">
                        <li>• Buy (ladder) rundt <span className="font-semibold">{formatGp(swingTop.currentPrice)}</span></li>
                        <li>• Target exit: <span className="font-semibold">{formatGp(swingTop.targetSellPrice ?? swingTop.exitPriceBase ?? 0)}</span></li>
                        <li>• Time-stop: typisk 2–6 uker (vi finjusterer senere)</li>
                      </ul>
                      {swingTop.logic?.thesis && (
                        <div className="mt-3 text-xs text-slate-300">
                          <span className="text-slate-400">Why:</span> {swingTop.logic.thesis}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Right panel controls */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="text-xs text-slate-400">Controls</div>

            {strategy === 'desk' ? (
              <>
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

                <button
                  onClick={() => deskQuery.refetch()}
                  className="mt-4 w-full px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:bg-slate-700"
                  disabled={deskQuery.isFetching}
                >
                  {deskQuery.isFetching ? 'Oppdaterer…' : 'Refresh desk'}
                </button>

                <div className="mt-4 text-xs text-slate-400">
                  Desk er mer aktivt. Hvis du vil ha lav babysitting, bruk Swing som default.
                </div>
              </>
            ) : (
              <>
                <div className="mt-3 text-xs text-amber-300 bg-amber-950/30 border border-amber-900 rounded p-3">
                  Swing-scan kan bruke credits. Derfor kjører den bare når du klikker.
                </div>

                <div className="mt-4 text-xs text-slate-400">
                  Protip: Start med minConfidence 70 og minPotential 20. Stram opp hvis du får for mye støy.
                </div>
              </>
            )}
          </div>
        </div>

        {/* Shortlist */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs text-slate-400">Shortlist ({strategy === 'desk' ? 'Desk' : 'Swing'})</div>
              <div className="text-lg font-semibold mt-1">Flere kandidater</div>
            </div>
            <div className="text-xs text-slate-400">Viser top 7 etter “Next Best Action”</div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {strategy === 'desk' && deskRest.map((o) => (
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

            {strategy === 'swing' && swingRest.map((o) => (
              <div key={o.itemId} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
                <div className="font-semibold">{o.itemName}</div>
                <div className="mt-2 text-xs text-slate-400 grid grid-cols-2 gap-2">
                  <div>Entry: <span className="text-slate-200">{formatGp(o.currentPrice)}</span></div>
                  <div>Exit: <span className="text-slate-200">{formatGp(o.targetSellPrice ?? o.exitPriceBase ?? 0)}</span></div>
                  <div>Pot: <span className="text-slate-200">{o.reversionPotential.toFixed(1)}%</span></div>
                  <div>Conf: <span className="text-slate-200">{Math.round(o.confidenceScore)}</span></div>
                </div>
              </div>
            ))}

            {strategy === 'desk' && !deskQuery.isLoading && deskRest.length === 0 && (
              <div className="text-slate-400 text-sm">Ingen shortlist akkurat nå (filtrene er strenge – det er med vilje).</div>
            )}

            {strategy === 'swing' && !swingQuery.isFetching && swingQuery.data && swingRest.length === 0 && (
              <div className="text-slate-400 text-sm">Ingen shortlist akkurat nå. Stram ned/opp minConfidence/minPotential.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
