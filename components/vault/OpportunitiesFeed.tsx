'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { formatGp } from '@/lib/format';
import Image from 'next/image';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

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

interface OpportunitiesFeedProps {
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

async function fetchTimeseries(itemId: number): Promise<number[] | null> {
  try {
    const res = await fetch(`/api/market/timeseries?id=${itemId}&timestep=5m`);
    const data = await res.json();
    if (data.data?.prices && Array.isArray(data.data.prices)) {
      // Take last 12 points (1 hour of 5min intervals)
      return data.data.prices.slice(-12).map((p: { price: number }) => p.price);
    }
    return null;
  } catch {
    return null;
  }
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

function ScoreSlider({ value }: { value: number }) {
  const colors = ['#6b7280', '#8b5cf6', '#3b82f6', '#22c55e', '#f5c518'];
  const segments = [20, 40, 60, 80, 100];
  const activeIndex = segments.findIndex(s => value < s) || 4;
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
      <div style={{ 
        display: 'flex', 
        gap: 2, 
        background: 'rgba(255,255,255,0.05)', 
        padding: '2px 4px', 
        borderRadius: 4 
      }}>
        {segments.map((seg, i) => (
          <div 
            key={seg}
            style={{
              width: 16,
              height: 4,
              borderRadius: 2,
              background: i <= activeIndex ? colors[i] : 'rgba(255,255,255,0.1)',
              transition: 'background 0.2s',
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: colors[activeIndex] }}>{value}</span>
    </div>
  );
}

function MiniSparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  
  const chartData = data.map((price) => ({ value: price }));
  const isUp = data[data.length - 1] >= data[0];
  const lineColor = isUp ? '#22c55e' : '#ef4444';
  
  return (
    <div style={{ width: 60, height: 24 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <YAxis domain={['dataMin', 'dataMax']} hide />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={lineColor} 
            strokeWidth={1.5} 
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
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

const scoreFilters: { value: ScoreFilter; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: '#6b7280' },
  { value: 'sizzler', label: 'Sizzler', color: '#f5c518' },
  { value: 'hot', label: 'Hot', color: '#22c55e' },
  { value: 'warm', label: 'Warm', color: '#3b82f6' },
  { value: 'cool', label: 'Cool', color: '#8b5cf6' },
];

export default function OpportunitiesFeed({ opportunities, loading, onRefresh, lastUpdated, onRefreshPrices, onCreateProposal }: OpportunitiesFeedProps) {
  const [adding, setAdding] = useState<Set<number>>(new Set());
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>('score');
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [sparklineData, setSparklineData] = useState<Record<number, number[]>>({});
  const [loadingSparklines, setLoadingSparklines] = useState<Set<number>>(new Set());
  const [refreshingPrices, setRefreshingPrices] = useState(false);
  const [refreshResult, setRefreshResult] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [keyboardNavActive, setKeyboardNavActive] = useState(false);
  const sparklineLoadedRef = useRef<Set<number>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);

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
        return sorted.sort((a, b) => b.spread_pct - a.spread_pct);
      case 'profit':
        return sorted.sort((a, b) => b.est_profit - a.est_profit);
      case 'volume':
        return sorted.sort((a, b) => (b.volume_1h ?? 0) - (a.volume_1h ?? 0));
      default:
        return sorted;
    }
  }, [opportunities, sortBy, scoreFilter, searchQuery]);

  // Fetch sparkline data when row expands
  useEffect(() => {
    if (expandedRow === null) return;
    if (sparklineLoadedRef.current.has(expandedRow)) return;
    
    const fetchData = async () => {
      setLoadingSparklines(prev => new Set(prev).add(expandedRow));
      const data = await fetchTimeseries(expandedRow);
      if (data) {
        setSparklineData(prev => ({ ...prev, [expandedRow]: data }));
        sparklineLoadedRef.current.add(expandedRow);
      }
      setLoadingSparklines(prev => {
        const next = new Set(prev);
        next.delete(expandedRow);
        return next;
      });
    };
    
    fetchData();
  }, [expandedRow]);

  // Keyboard navigation (j/k to move, Enter to expand)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      if (isInput) return;
      if (sortedOpportunities.length === 0) return;

      if (e.key === 'j') {
        e.preventDefault();
        setKeyboardNavActive(true);
        setSelectedIndex(i => Math.min(i + 1, sortedOpportunities.length - 1));
      } else if (e.key === 'k') {
        e.preventDefault();
        setKeyboardNavActive(true);
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        const item = sortedOpportunities[selectedIndex];
        if (item) {
          setExpandedRow(curr => curr === item.item_id ? null : item.item_id);
        }
      } else if (e.key === 'Escape') {
        setSelectedIndex(-1);
        setExpandedRow(null);
        setKeyboardNavActive(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sortedOpportunities, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const rows = listRef.current.querySelectorAll('[data-opp-row]');
      const selected = rows[selectedIndex] as HTMLElement;
      if (selected) {
        selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

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

  const totalPotential = opportunities.reduce((sum, o) => sum + o.est_profit, 0);

  return (
    <section>
      {/* Summary Header */}
      <div className="row-between" style={{ marginBottom: '1rem' }}>
        <div className="row" style={{ gap: '1.5rem', alignItems: 'center' }}>
          <div>
            <p className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Opportunities</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f5c518', lineHeight: 1 }}>{opportunities.length}</p>
          </div>
          <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '1.5rem' }}>
            <p className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Potential</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#22c55e', lineHeight: 1.2 }}>
              ~{formatGp(totalPotential)}
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

      {/* Sticky Filter Bar */}
      <div 
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '0.75rem',
          marginBottom: '0.75rem',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="row-between" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          {/* Search */}
          <div className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSelectedIndex(-1)}
              style={{ 
                padding: '0.4rem 0.75rem', 
                fontSize: '0.8rem', 
                borderRadius: '6px',
                width: '150px',
                background: 'var(--input-bg)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            />
            {!searchQuery && (
              <kbd style={{ 
                fontSize: '0.6rem', 
                padding: '0.15rem 0.35rem', 
                background: 'var(--surface-2)', 
                border: '1px solid var(--border)', 
                borderRadius: '4px',
                color: 'var(--text-muted)',
              }}>/</kbd>
            )}
            {keyboardNavActive && (
              <span style={{
                fontSize: '0.65rem',
                padding: '0.2rem 0.4rem',
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '4px',
                color: '#60a5fa',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}>
                <kbd style={{ fontSize: '0.55rem', background: 'transparent', border: 'none', padding: 0 }}>j</kbd>
                <kbd style={{ fontSize: '0.55rem', background: 'transparent', border: 'none', padding: 0 }}>k</kbd>
                <span style={{ opacity: 0.7 }}>nav</span>
              </span>
            )}
          </div>

          {/* Score Filter Chips */}
          <div className="row" style={{ gap: '0.35rem', flexWrap: 'wrap' }}>
            {scoreFilters.map((filter) => {
              const count = filter.value === 'all' 
                ? opportunities.length 
                : opportunities.filter(o => {
                    const minScore: Record<'sizzler'|'hot'|'warm'|'cool', number> = { sizzler: 80, hot: 60, warm: 40, cool: 20 };
                    return o.score >= minScore[filter.value as 'sizzler'|'hot'|'warm'|'cool'];
                  }).length;
              return (
                <button
                  key={filter.value}
                  onClick={() => setScoreFilter(filter.value)}
                  style={{
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    borderRadius: '20px',
                    border: 'none',
                    cursor: 'pointer',
                    background: scoreFilter === filter.value ? filter.color : 'rgba(255,255,255,0.05)',
                    color: scoreFilter === filter.value ? '#000' : 'var(--text-muted)',
                    transition: 'all 0.15s ease',
                    boxShadow: scoreFilter === filter.value ? `0 0 12px ${filter.color}50` : 'none',
                  }}
                >
                  {filter.label} <span style={{ opacity: 0.7, fontSize: '0.65rem' }}>({count})</span>
                </button>
              );
            })}
          </div>

          {/* Sort & Actions */}
          <div className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              style={{ 
                padding: '0.35rem 0.5rem', 
                fontSize: '0.75rem', 
                borderRadius: '6px',
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
                style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }}
              >
                {refreshingPrices ? '...' : '↻ Prices'}
              </button>
            )}
            <button className="btn" onClick={onRefresh} disabled={loading} style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }}>
              {loading ? '...' : '↻ Sync'}
            </button>
            <div className="row" style={{ gap: '0.25rem', opacity: 0.6 }}>
              <kbd style={{ fontSize: '0.55rem', padding: '0.1rem 0.3rem', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '3px' }}>j</kbd>
              <kbd style={{ fontSize: '0.55rem', padding: '0.1rem 0.3rem', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '3px' }}>k</kbd>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>nav</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feed Container */}
      {sortedOpportunities.length === 0 ? (
        <div 
          style={{ 
            textAlign: 'center', 
            padding: '3rem 2rem',
            background: 'var(--surface)',
            border: '1px dashed var(--border)',
            borderRadius: '12px',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>No opportunities found</h3>
          <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '1.25rem', maxWidth: '300px', margin: '0 auto 1.25rem' }}>
            First time here? Seed a starter watchlist, then refresh prices to see potential flips.
          </p>
          <div className="row" style={{ gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }} ref={listRef}>
          {sortedOpportunities.map((opp, idx) => {
            const isExpanded = expandedRow === opp.item_id;
            const isSelected = selectedIndex === idx;
            const sparkline = sparklineData[opp.item_id];
            const isSparklineLoading = loadingSparklines.has(opp.item_id);
            
            return (
              <div
                key={opp.item_id}
                data-opp-row
                onClick={() => {
                  setSelectedIndex(idx);
                  setExpandedRow(isExpanded ? null : opp.item_id);
                }}
                style={{
                  background: isSelected ? 'rgba(212, 167, 83, 0.08)' : 'var(--surface)',
                  border: `1px solid ${isExpanded ? 'var(--accent)' : isSelected ? 'rgba(212, 167, 83, 0.4)' : 'var(--border)'}`,
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isExpanded ? 'var(--accent-glow)' : isSelected ? '0 0 12px rgba(212, 167, 83, 0.15)' : 'none',
                }}
              >
                {/* Main Row */}
                <div className="row-between">
                  {/* Left: Item info */}
                  <div className="row" style={{ gap: '0.75rem', alignItems: 'center', minWidth: 0, flex: 1 }}>
                    {opp.icon_url && (
                      <Image
                        src={opp.icon_url}
                        alt=""
                        width={28}
                        height={28}
                        style={{ imageRendering: 'pixelated', borderRadius: 4, flexShrink: 0 }}
                        unoptimized
                      />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <Link 
                        href={`/item/${opp.item_id}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ 
                          color: '#f5c518', 
                          textDecoration: 'none', 
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'block',
                        }}
                      >
                        {opp.item_name}
                      </Link>
                      <div className="row" style={{ gap: '0.4rem', marginTop: '0.15rem' }}>
                        <ScoreBadge score={opp.score} />
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {opp.spread_pct.toFixed(1)}% spread
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Center: Metrics */}
                  <div className="row" style={{ gap: '1.5rem', alignItems: 'center', margin: '0 1rem' }}>
                    <div style={{ textAlign: 'center' }}>
                      <p className="muted" style={{ fontSize: '0.6rem', textTransform: 'uppercase', marginBottom: '0.1rem' }}>Score</p>
                      <ScoreSlider value={opp.score} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p className="muted" style={{ fontSize: '0.6rem', textTransform: 'uppercase', marginBottom: '0.1rem' }}>Volume</p>
                      <p style={{ fontWeight: 600, fontSize: '0.85rem', color: (opp.volume_1h ?? 0) > 50000 ? '#22c55e' : 'inherit' }}>
                        {formatVolume(opp.volume_1h)}
                      </p>
                      {/* Mini volume heat bar */}
                      <div style={{ display: 'flex', gap: '1px', justifyContent: 'center', marginTop: '2px' }}>
                        {[...Array(4)].map((_, i) => {
                          const vol = opp.volume_1h ?? 0;
                          const threshold = (i + 1) * 25000;
                          const active = vol >= threshold;
                          return (
                            <div
                              key={i}
                              style={{
                                width: '3px',
                                height: active ? `${3 + i * 2}px` : '2px',
                                borderRadius: '1px',
                                background: active
                                  ? vol > 100000
                                    ? '#ef4444'
                                    : vol > 50000
                                    ? '#f59e0b'
                                    : '#22c55e'
                                  : 'var(--border)',
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p className="muted" style={{ fontSize: '0.6rem', textTransform: 'uppercase', marginBottom: '0.1rem' }}>Est. Profit</p>
                      <p style={{ fontWeight: 700, fontSize: '0.85rem', color: '#22c55e' }}>
                        {formatGp(opp.est_profit)}
                      </p>
                    </div>
                  </div>

                  {/* Right: Sparkline + Actions */}
                  <div className="row" style={{ gap: '0.75rem', alignItems: 'center' }}>
                    {isSparklineLoading ? (
                      <div 
                        style={{ 
                          width: 60, 
                          height: 24, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          gap: 3 
                        }}
                      >
                        {[0, 1, 2].map(i => (
                          <div 
                            key={i}
                            style={{
                              width: 4,
                              height: 16,
                              borderRadius: 2,
                              background: 'var(--accent)',
                              opacity: 0.3,
                              animation: `pulse 1s ease-in-out infinite`,
                              animationDelay: `${i * 0.15}s`,
                            }}
                          />
                        ))}
                      </div>
                    ) : sparkline ? (
                      <MiniSparkline data={sparkline} />
                    ) : null}
                    
                    <div className="row" style={{ gap: '0.25rem' }}>
                      {typeof onCreateProposal === 'function' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCreateProposal(opp);
                          }}
                          style={{
                            padding: '0.3rem 0.6rem',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            background: '#22c55e',
                            color: '#000',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          Buy
                        </button>
                      )}
                      {added.has(opp.item_id) ? (
                        <span style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: 600, padding: '0.3rem 0.5rem' }}>✓ Tracked</span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToWatchlist(opp.item_id, opp.item_name);
                          }}
                          disabled={adding.has(opp.item_id)}
                          style={{
                            padding: '0.3rem 0.6rem',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            background: 'var(--surface-2)',
                            color: 'var(--text)',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          {adding.has(opp.item_id) ? '...' : 'Track'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div 
                    style={{ 
                      marginTop: '1rem', 
                      paddingTop: '1rem', 
                      borderTop: '1px solid var(--border)',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '1rem',
                    }}
                  >
                    <div>
                      <p className="muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>Buy At</p>
                      <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{formatGp(opp.buy_at)}</p>
                    </div>
                    <div>
                      <p className="muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>Sell At</p>
                      <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{formatGp(opp.sell_at)}</p>
                    </div>
                    <div>
                      <p className="muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>Suggested Qty</p>
                      <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{opp.suggested_qty.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>Buy Limit</p>
                      <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{opp.buy_limit ? opp.buy_limit.toLocaleString() : '—'}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Stats */}
      {sortedOpportunities.length > 0 && (
        <div className="row-between" style={{ marginTop: '0.75rem', padding: '0 0.25rem' }}>
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
