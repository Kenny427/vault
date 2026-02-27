'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

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

type SortOption = 'score' | 'margin' | 'profit' | 'volume';

interface OpportunitiesCardProps {
  opportunities: Opportunity[];
  loading: boolean;
  onRefresh: () => void;
}

async function addToWatchlist(itemId: number, itemName: string): Promise<boolean> {
  const res = await fetch('/api/theses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item_id: itemId, item_name: itemName }),
  });
  return res.ok;
}

function ScoreBadge({ score }: { score: number }) {
  let color = '#6b7280';
  let label = 'Cold';
  
  if (score >= 80) {
    color = '#f5c518';
    label = 'Sizzler';
  } else if (score >= 60) {
    color = '#22c55e';
    label = 'Hot';
  } else if (score >= 40) {
    color = '#3b82f6';
    label = 'Warm';
  } else if (score >= 20) {
    color = '#8b5cf6';
    label = 'Cool';
  }

  return (
    <span
      style={{
        background: color,
        color: '#000',
        padding: '0.15rem 0.5rem',
        borderRadius: '4px',
        fontSize: '0.7rem',
        fontWeight: 700,
      }}
      title={`Score: ${score}`}
    >
      {label} {score}
    </span>
  );
}

export default function OpportunitiesCard({ opportunities, loading, onRefresh }: OpportunitiesCardProps) {
  const [adding, setAdding] = useState<Set<number>>(new Set());
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>('score');
  const [showHotOnly, setShowHotOnly] = useState(false);

  const filteredOpportunities = useMemo(() => {
    let filtered = opportunities;
    if (showHotOnly) {
      filtered = opportunities.filter(o => o.score >= 40);
    }
    const sorted = [...filtered];
    switch (sortBy) {
      case 'score':
        return sorted.sort((a, b) => b.score - a.score);
      case 'margin':
        return sorted.sort((a, b) => b.margin - a.margin);
      case 'profit':
        return sorted.sort((a, b) => b.est_profit - a.est_profit);
      case 'volume':
        return sorted.sort((a, b) => (b.volume_5m ?? b.volume_1h ?? 0) - (a.volume_5m ?? a.volume_1h ?? 0));
      default:
        return sorted;
    }
  }, [opportunities, sortBy, showHotOnly]);

  const handleAddToWatchlist = async (itemId: number, itemName: string) => {
    if (adding.has(itemId) || added.has(itemId)) return;
    setAdding((prev) => new Set(prev).add(itemId));
    const success = await addToWatchlist(itemId, itemName);
    setAdding((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
    if (success) {
      setAdded((prev) => new Set(prev).add(itemId));
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard failed
    }
  };

  return (
    <section className="grid" style={{ gap: '0.75rem' }}>
      {/* Summary Card */}
      <article className="card" style={{ background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}>
        <div className="row-between">
          <div>
            <p className="muted" style={{ fontSize: '0.8rem' }}>
              {showHotOnly ? 'Hot Opportunities' : 'Active Opportunities'}
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f5c518' }}>
              {showHotOnly ? filteredOpportunities.length : opportunities.length}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="muted" style={{ fontSize: '0.8rem' }}>Est. Profit Potential</p>
            <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#22c55e' }}>
              ~{filteredOpportunities.reduce((sum, o) => sum + o.est_profit, 0).toLocaleString()} gp
            </p>
          </div>
        </div>
      </article>

      {/* Opportunities List */}
      <article className="card">
        <div className="row-between" style={{ marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Flipping Opportunities</h2>
          <div className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
            <button
              className={`btn ${showHotOnly ? '' : 'btn-secondary'}`}
              onClick={() => setShowHotOnly(!showHotOnly)}
              style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', background: showHotOnly ? '#22c55e' : undefined }}
              title="Show only Warm+ opportunities"
            >
              🔥 Hot
            </button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', borderRadius: '4px' }}
            >
              <option value="score">Sort: Score</option>
              <option value="margin">Sort: Margin</option>
              <option value="profit">Sort: Profit</option>
              <option value="volume">Sort: Volume</option>
            </select>
            <button className="btn btn-secondary" onClick={onRefresh} disabled={loading}>
              Refresh
            </button>
          </div>
        </div>

        {filteredOpportunities.length === 0 ? (
          <p className="muted">{showHotOnly ? 'No hot opportunities found.' : 'No opportunities found. Add theses and refresh watchlists.'}</p>
        ) : (
          <ul className="list">
            {filteredOpportunities.map((opp) => (
              <li
                key={opp.item_id}
                className="card"
                style={{
                  padding: '0.75rem',
                  borderLeft: `3px solid ${opp.score >= 60 ? '#22c55e' : opp.score >= 40 ? '#3b82f6' : '#6b7280'}`,
                }}
              >
                <div className="row-between" style={{ marginBottom: '0.35rem' }}>
                  <div className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
                    {opp.icon_url && (
                      <img
                        src={opp.icon_url}
                        alt=""
                        style={{ width: 24, height: 24, imageRendering: 'pixelated', borderRadius: 4 }}
                      />
                    )}
                    <Link href={`/item/${opp.item_id}`} style={{ color: '#f5c518', textDecoration: 'none', fontWeight: 700 }}>
                      {opp.item_name}
                    </Link>
                    <ScoreBadge score={opp.score} />
                  </div>
                  <button
                    className="btn-small"
                    onClick={() =>
                      copyToClipboard(
                        `Buy ${opp.item_name} @ ${opp.buy_at.toLocaleString()} | Sell @ ${opp.sell_at.toLocaleString()} | Qty ${opp.suggested_qty.toLocaleString()} | Est ${opp.est_profit.toLocaleString()}gp`
                      )
                    }
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                  >
                    Copy
                  </button>
                  {added.has(opp.item_id) ? (
                    <span style={{ fontSize: '0.7rem', color: '#22c55e' }}>✓ Watching</span>
                  ) : (
                    <button
                      className="btn-small"
                      onClick={() => handleAddToWatchlist(opp.item_id, opp.item_name)}
                      disabled={adding.has(opp.item_id)}
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                    >
                      {adding.has(opp.item_id) ? '...' : '+ Watch'}
                    </button>
                  )}
                </div>

                <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div>
                    <p className="muted" style={{ fontSize: '0.7rem' }}>Buy</p>
                    <p style={{ fontWeight: 600 }}>{opp.buy_at.toLocaleString()} gp</p>
                  </div>
                  <div>
                    <p className="muted" style={{ fontSize: '0.7rem' }}>Sell</p>
                    <p style={{ fontWeight: 600 }}>{opp.sell_at.toLocaleString()} gp</p>
                  </div>
                  <div>
                    <p className="muted" style={{ fontSize: '0.7rem' }}>Margin</p>
                    <p style={{ fontWeight: 600, color: '#22c55e' }}>{opp.margin.toLocaleString()} gp</p>
                  </div>
                  <div>
                    <p className="muted" style={{ fontSize: '0.7rem' }}>Spread</p>
                    <p style={{ fontWeight: 600 }}>{opp.spread_pct.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="muted" style={{ fontSize: '0.7rem' }}>Qty</p>
                    <p style={{ fontWeight: 600 }}>{opp.suggested_qty.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="muted" style={{ fontSize: '0.7rem' }}>Est Profit</p>
                    <p style={{ fontWeight: 600, color: '#22c55e' }}>{opp.est_profit.toLocaleString()} gp</p>
                  </div>
                </div>

                {(opp.volume_5m || opp.volume_1h) && (
                  <div className="row-between" style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                    <span className="muted">
                      Vol:{' '}
                      {opp.volume_5m
                        ? `${(opp.volume_5m / 1000).toFixed(1)}k (5m)`
                        : ''}
                      {opp.volume_5m && opp.volume_1h ? ' · ' : ''}
                      {opp.volume_1h ? `${(opp.volume_1h / 1000).toFixed(1)}k (1h)` : ''}
                    </span>
                    <span
                      style={{
                        fontWeight: 600,
                        color:
                          (opp.volume_5m ?? 0) > 100000
                            ? '#f5c518'
                            : (opp.volume_5m ?? 0) > 50000
                            ? '#22c55e'
                            : '#6b7280',
                      }}
                    >
                      {(opp.volume_5m ?? 0) > 100000
                        ? '🔥 HOT'
                        : (opp.volume_5m ?? 0) > 50000
                        ? '⚡ Warm'
                        : '💧 Cold'}
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}
