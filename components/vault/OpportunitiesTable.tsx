'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { formatGp } from '@/lib/format';
import Image from 'next/image';

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
type ScoreFilter = 'all' | 'sizzler' | 'hot' | 'warm' | 'cool';

interface OpportunitiesTableProps {
  opportunities: Opportunity[];
  loading: boolean;
  onRefresh: () => void;
  lastUpdated?: string | null;
  onRefreshPrices?: () => Promise<{ refreshed?: number; error?: string }>;
  onCreateProposal?: (opp: Opportunity) => void;
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
        padding: '0.12rem 0.4rem',
        borderRadius: '3px',
        fontSize: '0.65rem',
        fontWeight: 700,
        textTransform: 'uppercase',
      }}
      title={`Score: ${score}`}
    >
      {label}
    </span>
  );
}

function formatVolume(vol: number | null): string {
  if (!vol) return '—';
  if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
  if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
  return vol.toString();
}

function formatFreshness(iso: string | null | undefined): { text: string; color: string } {
  if (!iso) return { text: '—', color: '#6b7280' };
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 5) return { text: 'Just now', color: '#22c55e' };
  if (diffMins < 15) return { text: `${diffMins}m`, color: '#22c55e' };
  if (diffMins < 60) return { text: `${diffMins}m`, color: '#f59e0b' };
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return { text: `${diffHours}h`, color: '#ef4444' };
  return { text: `${diffHours}h`, color: '#ef4444' };
}

export default function OpportunitiesTable({ opportunities, loading, onRefresh, lastUpdated, onRefreshPrices, onCreateProposal }: OpportunitiesTableProps) {
  const [adding, setAdding] = useState<Set<number>>(new Set());
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>('score');
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [refreshingPrices, setRefreshingPrices] = useState(false);
  const [refreshResult, setRefreshResult] = useState<string | null>(null);

  const hasActiveFilters = searchQuery.trim() || scoreFilter !== 'all';

  const sortedOpportunities = useMemo(() => {
    let filtered = [...opportunities];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((o) => o.item_name.toLowerCase().includes(query));
    }

    if (scoreFilter !== 'all') {
      const minScore = {
        sizzler: 80,
        hot: 60,
        warm: 40,
        cool: 20,
      }[scoreFilter];
      filtered = filtered.filter(o => o.score >= minScore);
    }
    
    const sorted = filtered;
    switch (sortBy) {
      case 'score':
        return sorted.sort((a, b) => b.score - a.score);
      case 'margin':
        return sorted.sort((a, b) => b.margin - a.margin);
      case 'profit':
        return sorted.sort((a, b) => b.est_profit - a.est_profit);
      case 'volume':
        return sorted.sort((a, b) => (b.volume_1h ?? 0) - (a.volume_1h ?? 0));
      default:
        return sorted;
    }
  }, [opportunities, sortBy, scoreFilter, searchQuery]);

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

  const handleRefreshPrices = async () => {
    if (!onRefreshPrices) return;
    setRefreshingPrices(true);
    setRefreshResult(null);
    try {
      const result = await onRefreshPrices();
      if (result.error) {
        setRefreshResult(result.error);
      } else {
        setRefreshResult(`✓ Updated ${result.refreshed} prices`);
        onRefresh();
      }
    } catch {
      setRefreshResult('Failed to refresh');
    } finally {
      setRefreshingPrices(false);
    }
  };

  const freshness = formatFreshness(lastUpdated);

  return (
    <section>
      {/* Summary Header */}
      <div className="row-between" style={{ marginBottom: '0.75rem' }}>
        <div className="row" style={{ gap: '1.5rem', alignItems: 'center' }}>
          <div>
            <p className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Opportunities</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f5c518', lineHeight: 1 }}>{opportunities.length}</p>
          </div>
          <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '1.5rem' }}>
            <p className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Potential</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#22c55e', lineHeight: 1.2 }}>
              ~{formatGp(opportunities.reduce((sum, o) => sum + o.est_profit, 0))}
            </p>
          </div>
        </div>
        <div className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.35rem',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${freshness.color}40`,
            }}
          >
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: freshness.color }} />
            <span style={{ fontSize: '0.7rem', color: freshness.color, fontWeight: 600 }}>{freshness.text}</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="row-between" style={{ marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              padding: '0.35rem 0.6rem', 
              fontSize: '0.8rem', 
              borderRadius: '4px',
              width: '130px',
              background: 'var(--input-bg)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          />
          <select
            value={scoreFilter}
            onChange={(e) => setScoreFilter(e.target.value as ScoreFilter)}
            style={{ 
              padding: '0.35rem 0.5rem', 
              fontSize: '0.75rem', 
              borderRadius: '4px',
              background: 'var(--input-bg)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          >
            <option value="all">All Scores</option>
            <option value="sizzler">Sizzler 80+</option>
            <option value="hot">Hot 60+</option>
            <option value="warm">Warm 40+</option>
            <option value="cool">Cool 20+</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            style={{ 
              padding: '0.35rem 0.5rem', 
              fontSize: '0.75rem', 
              borderRadius: '4px',
              background: 'var(--input-bg)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          >
            <option value="score">Score</option>
            <option value="margin">Margin</option>
            <option value="profit">Profit</option>
            <option value="volume">Volume</option>
          </select>
          {hasActiveFilters && (
            <button
              onClick={() => { setSearchQuery(''); setScoreFilter('all'); }}
              style={{
                padding: '0.2rem 0.4rem',
                fontSize: '0.65rem',
                background: 'transparent',
                border: 'none',
                color: 'var(--accent)',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Clear
            </button>
          )}
        </div>
        <div className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
          {refreshResult && (
            <span style={{ fontSize: '0.75rem', color: refreshResult.startsWith('✓') ? '#22c55e' : '#ef4444' }}>
              {refreshResult}
            </span>
          )}
          {typeof onRefreshPrices === 'function' && (
            <button 
              className="btn btn-secondary" 
              onClick={handleRefreshPrices} 
              disabled={refreshingPrices}
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
            >
              {refreshingPrices ? 'Refreshing...' : 'Refresh'}
            </button>
          )}
          <button className="btn" onClick={onRefresh} disabled={loading} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
            {loading ? '...' : 'Sync'}
          </button>
        </div>
      </div>

      {/* Table Header */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 70px 70px 80px 60px 100px',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          fontSize: '0.65rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text-muted)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span>Item</span>
        <span style={{ textAlign: 'center' }}>Score</span>
        <span style={{ textAlign: 'right' }}>Spread</span>
        <span style={{ textAlign: 'right' }}>Vol(1h)</span>
        <span style={{ textAlign: 'right' }}>Fresh</span>
        <span style={{ textAlign: 'right' }}>Actions</span>
      </div>

      {/* Table Body */}
      {sortedOpportunities.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p className="muted" style={{ marginBottom: '0.5rem' }}>No opportunities found</p>
          <p className="muted" style={{ fontSize: '0.75rem', marginBottom: '0.75rem' }}>
            First time here? Seed a starter watchlist, then refresh prices.
          </p>
          <div className="row" style={{ gap: '0.5rem', justifyContent: 'center' }}>
            <button
              className="btn btn-secondary"
              onClick={async () => {
                try {
                  const seedRes = await fetch('/api/theses/seed', { method: 'POST' });
                  const seedData = await seedRes.json().catch(() => ({}));
                  if (!seedRes.ok) {
                    setRefreshResult(seedData?.error ?? 'Failed to seed demo watchlist');
                    return;
                  }
                  setRefreshResult(`✓ Seeded ${seedData?.inserted ?? 0} items`);
                  await handleRefreshPrices();
                } catch {
                  setRefreshResult('Failed to seed demo watchlist');
                }
              }}
            >
              Seed starter list
            </button>
            {typeof onRefreshPrices === 'function' && (
              <button className="btn" onClick={handleRefreshPrices} disabled={refreshingPrices}>
                {refreshingPrices ? 'Refreshing...' : 'Refresh prices'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--surface-2)', borderRadius: '6px', overflow: 'hidden' }}>
          {sortedOpportunities.map((opp) => {
            const isHovered = hoveredRow === opp.item_id;
            return (
              <div
                key={opp.item_id}
                onMouseEnter={() => setHoveredRow(opp.item_id)}
                onMouseLeave={() => setHoveredRow(null)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 70px 70px 80px 60px 100px',
                  gap: '0.5rem',
                  padding: '0.6rem 0.75rem',
                  alignItems: 'center',
                  fontSize: '0.8rem',
                  borderBottom: '1px solid var(--border)',
                  background: isHovered ? 'rgba(245, 197, 24, 0.08)' : 'transparent',
                  transition: 'background 0.1s ease',
                }}
              >
                {/* Item Column */}
                <div className="row" style={{ gap: '0.5rem', alignItems: 'center', minWidth: 0 }}>
                  {opp.icon_url && (
                    <Image
                      src={opp.icon_url}
                      alt=""
                      width={20}
                      height={20}
                      style={{ imageRendering: 'pixelated', borderRadius: 3, flexShrink: 0 }}
                      unoptimized
                    />
                  )}
                  <Link 
                    href={`/item/${opp.item_id}`} 
                    style={{ 
                      color: '#f5c518', 
                      textDecoration: 'none', 
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {opp.item_name}
                  </Link>
                  <ScoreBadge score={opp.score} />
                </div>

                {/* Score Column */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{ 
                    fontWeight: 700, 
                    color: opp.score >= 60 ? '#22c55e' : opp.score >= 40 ? '#3b82f6' : '#6b7280' 
                  }}>
                    {opp.score}
                  </span>
                </div>

                {/* Spread Column */}
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: 600 }}>{opp.spread_pct.toFixed(1)}%</span>
                </div>

                {/* Volume Column */}
                <div style={{ textAlign: 'right' }}>
                  <span style={{ 
                    fontWeight: 600,
                    color: (opp.volume_1h ?? 0) > 100000 ? '#f5c518' : (opp.volume_1h ?? 0) > 50000 ? '#22c55e' : 'inherit'
                  }}>
                    {formatVolume(opp.volume_1h)}
                  </span>
                </div>

                {/* Freshness Column */}
                <div style={{ textAlign: 'right' }}>
                  <span style={{ 
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: (opp.volume_1h ?? 0) > 0 ? '#22c55e' : '#6b7280'
                  }}>
                    {(opp.volume_1h ?? 0) > 0 ? '● Live' : '—'}
                  </span>
                </div>

                {/* Actions Column */}
                <div className="row" style={{ gap: '0.25rem', justifyContent: 'flex-end' }}>
                  {isHovered && (
                    <>
                      {typeof onCreateProposal === 'function' && (
                        <button
                          onClick={() => onCreateProposal(opp)}
                          style={{
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            background: '#22c55e',
                            color: '#000',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                          }}
                        >
                          Buy
                        </button>
                      )}
                      {added.has(opp.item_id) ? (
                        <span style={{ fontSize: '0.65rem', color: '#22c55e', fontWeight: 600 }}>✓</span>
                      ) : (
                        <button
                          onClick={() => handleAddToWatchlist(opp.item_id, opp.item_name)}
                          disabled={adding.has(opp.item_id)}
                          style={{
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            background: 'var(--surface)',
                            color: 'var(--text)',
                            border: '1px solid var(--border)',
                            borderRadius: '3px',
                            cursor: 'pointer',
                          }}
                        >
                          {adding.has(opp.item_id) ? '...' : 'Track'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Stats */}
      {sortedOpportunities.length > 0 && (
        <div className="row-between" style={{ marginTop: '0.5rem', padding: '0 0.25rem' }}>
          <span className="muted" style={{ fontSize: '0.7rem' }}>
            Showing {sortedOpportunities.length} of {opportunities.length} opportunities
          </span>
          <span className="muted" style={{ fontSize: '0.7rem' }}>
            Total margin: {formatGp(opportunities.reduce((sum, o) => sum + o.margin, 0))}
          </span>
        </div>
      )}
    </section>
  );
}
