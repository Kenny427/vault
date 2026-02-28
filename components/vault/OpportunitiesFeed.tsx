'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ResponsiveContainer, LineChart, Line, YAxis } from 'recharts';
import { formatGp } from '@/lib/format';

type Opportunity = {
  item_id: number;
  item_name: string;
  last_price: number;
  margin: number;
  spread_pct: number;
  buy_at: number;
  sell_at: number;
  buy_limit: number | null;
  suggested_qty: number;
  est_profit: number;
  score: number;
  volume_5m: number | null;
  volume_1h: number | null;
  icon_url: string | null;
};

type AIBrief = {
  regime: string;
  summary: string;
  focusItems: Array<{ item_name: string; reason: string }>;
  riskFlags: string[];
};

type SortOption = 'score' | 'margin' | 'profit' | 'volume';
type ScoreFilter = 'all' | 'sizzler' | 'hot' | 'warm' | 'cool';

interface OpportunitiesFeedProps {
  opportunities: Opportunity[];
  loading: boolean;
  onRefresh: () => void;
  lastUpdated?: string | null;
  onRefreshPrices?: () => Promise<{ refreshed?: number; error?: string }>;
  onCreateProposal?: (opp: Opportunity) => void;
}

const scoreFilters: Array<{ value: ScoreFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'sizzler', label: 'Sizzler' },
  { value: 'hot', label: 'Hot' },
  { value: 'warm', label: 'Warm' },
  { value: 'cool', label: 'Cool' },
];

function formatVolume(vol: number | null): string {
  if (!vol) return '—';
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(1)}K`;
  return String(vol);
}

function getScoreTier(score: number): { label: string; className: string } {
  if (score >= 80) return { label: 'Sizzler', className: 'score-sizzler' };
  if (score >= 60) return { label: 'Hot', className: 'score-hot' };
  if (score >= 40) return { label: 'Warm', className: 'score-warm' };
  if (score >= 20) return { label: 'Cool', className: 'score-cool' };
  return { label: 'Cold', className: 'score-cold' };
}

function getFreshnessText(lastUpdated?: string | null) {
  if (!lastUpdated) return 'No recent price snapshots';
  const diff = Date.now() - new Date(lastUpdated).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'Fresh snapshots · just now';
  if (mins < 60) return `Fresh snapshots · ${mins}m ago`;
  return `Stale snapshots · ${Math.floor(mins / 60)}h ago`;
}

async function addToWatchlist(itemId: number, itemName: string): Promise<boolean> {
  const res = await fetch('/api/theses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item_id: itemId, item_name: itemName }),
  });
  return res.ok;
}

async function fetchTimeseries(itemId: number): Promise<number[] | null> {
  try {
    const res = await fetch(`/api/market/timeseries?id=${itemId}&timestep=5m`);
    const data = await res.json();
    if (Array.isArray(data.data?.prices)) {
      return data.data.prices.slice(-24).map((p: { price: number }) => p.price);
    }
  } catch {
    return null;
  }
  return null;
}

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) {
    return <span className="muted" style={{ fontSize: '0.76rem' }}>No trend data</span>;
  }
  const points = values.map((value) => ({ value }));
  const up = values[values.length - 1] >= values[0];
  return (
    <div style={{ width: 120, height: 34 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points}>
          <YAxis domain={['dataMin', 'dataMax']} hide />
          <Line type="monotone" dataKey="value" stroke={up ? '#1df2a1' : '#ff5f8a'} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function OpportunitiesFeed({ opportunities, loading, onRefresh, lastUpdated, onRefreshPrices, onCreateProposal }: OpportunitiesFeedProps) {
  const [sortBy, setSortBy] = useState<SortOption>('score');
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshResult, setRefreshResult] = useState<string | null>(null);
  const [refreshingPrices, setRefreshingPrices] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [adding, setAdding] = useState<Set<number>>(new Set());
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [sparklineData, setSparklineData] = useState<Record<number, number[]>>({});
  const [aiBrief, setAiBrief] = useState<AIBrief | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const loadedSparkline = useRef<Set<number>>(new Set());

  const rows = useMemo(() => {
    let list = opportunities.filter((o) => o.item_name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (scoreFilter !== 'all') {
      const thresholds: Record<Exclude<ScoreFilter, 'all'>, number> = {
        sizzler: 80,
        hot: 60,
        warm: 40,
        cool: 20,
      };
      list = list.filter((o) => o.score >= thresholds[scoreFilter]);
    }

    const sorted = [...list];
    if (sortBy === 'score') sorted.sort((a, b) => b.score - a.score);
    if (sortBy === 'margin') sorted.sort((a, b) => b.spread_pct - a.spread_pct);
    if (sortBy === 'profit') sorted.sort((a, b) => b.est_profit - a.est_profit);
    if (sortBy === 'volume') sorted.sort((a, b) => (b.volume_1h ?? 0) - (a.volume_1h ?? 0));
    return sorted;
  }, [opportunities, scoreFilter, searchQuery, sortBy]);

  useEffect(() => {
    if (!expanded || loadedSparkline.current.has(expanded)) return;
    (async () => {
      const values = await fetchTimeseries(expanded);
      if (values) {
        setSparklineData((prev) => ({ ...prev, [expanded]: values }));
        loadedSparkline.current.add(expanded);
      }
    })();
  }, [expanded]);

  const totalPotential = opportunities.reduce((sum, o) => sum + o.est_profit, 0);
  const freshness = getFreshnessText(lastUpdated);

  const handleGenerateAIBrief = async () => {
    setAiError(null);
    setAiLoading(true);
    try {
      const res = await fetch('/api/opportunities/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunities: rows.slice(0, 20) }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? 'Failed to generate brief');
      setAiBrief(payload.brief as AIBrief);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI brief failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleRefreshPrices = async () => {
    if (!onRefreshPrices) return;
    setRefreshingPrices(true);
    setRefreshResult(null);
    try {
      const result = await onRefreshPrices();
      if (result.error) setRefreshResult(result.error);
      else {
        setRefreshResult(`Updated ${result.refreshed ?? 0} prices`);
        onRefresh();
      }
    } finally {
      setRefreshingPrices(false);
    }
  };

  const handleTrack = async (opp: Opportunity) => {
    if (adding.has(opp.item_id) || added.has(opp.item_id)) return;
    setAdding((prev) => new Set(prev).add(opp.item_id));
    const success = await addToWatchlist(opp.item_id, opp.item_name);
    setAdding((prev) => {
      const next = new Set(prev);
      next.delete(opp.item_id);
      return next;
    });
    if (success) setAdded((prev) => new Set(prev).add(opp.item_id));
  };

  return (
    <section className="opportunities-shell">
      <div className="opps-header-panel">
        <div>
          <p className="hud-label">Live opportunities</p>
          <h2>{rows.length} candidates</h2>
          <p className="muted">Potential cycle profit: {formatGp(totalPotential)}</p>
        </div>
        <div className="opps-header-actions">
          <span className="freshness-pill">{freshness}</span>
          <button className="btn btn-secondary" onClick={onRefresh} disabled={loading}>{loading ? 'Syncing…' : 'Sync snapshots'}</button>
          {typeof onRefreshPrices === 'function' && (
            <button className="btn" onClick={handleRefreshPrices} disabled={refreshingPrices}>{refreshingPrices ? 'Refreshing…' : 'Refresh GE prices'}</button>
          )}
        </div>
      </div>

      <div className="opps-toolbar card">
        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search an item (e.g. Dragon claws)" />
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}>
          <option value="score">Sort: AI score</option>
          <option value="margin">Sort: Spread %</option>
          <option value="profit">Sort: Estimated profit</option>
          <option value="volume">Sort: Volume</option>
        </select>
        <div className="filter-chip-wrap">
          {scoreFilters.map((filter) => (
            <button
              key={filter.value}
              className={`filter-chip ${scoreFilter === filter.value ? 'active' : ''}`}
              onClick={() => setScoreFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ai-brief card">
        <div className="row-between">
          <div>
            <p className="hud-label">OpenRouter assistant</p>
            <h3>Market regime + 1-8 week hold thesis</h3>
          </div>
          <button className="btn" onClick={() => void handleGenerateAIBrief()} disabled={aiLoading || rows.length === 0}>
            {aiLoading ? 'Analyzing…' : 'Generate AI brief'}
          </button>
        </div>
        {aiError && <p style={{ color: '#ff5f8a' }}>{aiError}</p>}
        {refreshResult && <p className="muted">{refreshResult}</p>}
        {!aiBrief ? (
          <p className="muted">Get fast AI context on bot-dump candidates, mean reversion setups, and risk flags before you allocate capital.</p>
        ) : (
          <div className="grid" style={{ marginTop: '0.5rem' }}>
            <p><strong>Regime:</strong> {aiBrief.regime}</p>
            <p>{aiBrief.summary}</p>
            <div className="brief-grid">
              <div>
                <p className="hud-label">Focus items</p>
                <ul>
                  {aiBrief.focusItems.map((item) => (
                    <li key={`${item.item_name}-${item.reason.slice(0, 8)}`}><strong>{item.item_name}:</strong> {item.reason}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="hud-label">Risk flags</p>
                <ul>
                  {aiBrief.riskFlags.map((flag) => (
                    <li key={flag}>{flag}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="opps-grid">
        {rows.map((opp) => {
          const score = getScoreTier(opp.score);
          const isExpanded = expanded === opp.item_id;
          const trend = sparklineData[opp.item_id] ?? [];

          return (
            <article key={opp.item_id} className={`opportunity-card ${isExpanded ? 'expanded' : ''}`} onClick={() => setExpanded(isExpanded ? null : opp.item_id)}>
              <header>
                <div className="row" style={{ gap: '0.7rem' }}>
                  {opp.icon_url ? (
                    <Image src={opp.icon_url} alt={opp.item_name} width={42} height={42} unoptimized style={{ imageRendering: 'pixelated' }} />
                  ) : (
                    <div className="icon-placeholder">?</div>
                  )}
                  <div>
                    <Link href={`/item/${opp.item_id}`} className="item-link" onClick={(e) => e.stopPropagation()}>{opp.item_name}</Link>
                    <p className="muted" style={{ fontSize: '0.75rem' }}>Last: {formatGp(opp.last_price)} · Margin: {formatGp(opp.margin)}</p>
                  </div>
                </div>
                <span className={`score-pill ${score.className}`}>{score.label} · {opp.score}</span>
              </header>

              <div className="metrics-row">
                <div><p className="hud-label">Spread</p><p>{opp.spread_pct.toFixed(2)}%</p></div>
                <div><p className="hud-label">Volume 1h</p><p>{formatVolume(opp.volume_1h)}</p></div>
                <div><p className="hud-label">Est. profit</p><p className="metric-profit">{formatGp(opp.est_profit)}</p></div>
                <Spark values={trend} />
              </div>

              {isExpanded && (
                <div className="expand-row">
                  <div><p className="hud-label">Buy at</p><p>{formatGp(opp.buy_at)}</p></div>
                  <div><p className="hud-label">Sell at</p><p>{formatGp(opp.sell_at)}</p></div>
                  <div><p className="hud-label">Suggested qty</p><p>{opp.suggested_qty.toLocaleString()}</p></div>
                  <div><p className="hud-label">Buy limit</p><p>{opp.buy_limit?.toLocaleString() ?? '—'}</p></div>
                </div>
              )}

              <footer>
                {typeof onCreateProposal === 'function' && (
                  <button className="btn" onClick={(e) => { e.stopPropagation(); onCreateProposal(opp); }}>Create buy proposal</button>
                )}
                {added.has(opp.item_id) ? (
                  <span className="tracked-pill">Tracked</span>
                ) : (
                  <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); void handleTrack(opp); }} disabled={adding.has(opp.item_id)}>
                    {adding.has(opp.item_id) ? 'Tracking…' : 'Add to watchlist'}
                  </button>
                )}
              </footer>
            </article>
          );
        })}
      </div>

      {rows.length === 0 && (
        <div className="card" style={{ textAlign: 'center' }}>
          <h3>No opportunities match the current filters</h3>
          <p className="muted">Try removing filters or refresh the market snapshots.</p>
        </div>
      )}
    </section>
  );
}
