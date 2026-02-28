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
        setRefreshResult(`✓ Synced ${result.refreshed} prices`);
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
      {/* Futuristic Summary Header */}
      <div 
        className="row-between" 
        style={{ 
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, rgba(39, 194, 103, 0.08) 0%, rgba(39, 194, 103, 0.02) 100%)',
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          border: '1px solid rgba(39, 194, 103, 0.15)',
        }}
      >
        <div className="row" style={{ gap: '2rem', alignItems: 'center' }}>
          <div>
            <div className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
              <p className="muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Opportunities</p>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#27c267', boxShadow: '0 0 8px #27c267' }} />
            </div>
            <p style={{ 
              fontSize: '2rem', 
              fontWeight: 900, 
              color: '#f5c518', 
              lineHeight: 1,
              textShadow: '0 0 20px rgba(245, 197, 24, 0.3)',
            }}>
              {opportunities.length}
            </p>
          </div>
          <div style={{ borderLeft: '1px solid rgba(39, 194, 103, 0.2)', paddingLeft: '2rem' }}>
            <p className="muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Potential</p>
            <p style={{ 
              fontSize: '1.35rem', 
              fontWeight: 700, 
              color: '#22c55e', 
              lineHeight: 1.2,
              textShadow: '0 0 15px rgba(34, 197, 94, 0.3)',
            }}>
              ~{formatGp(totalPotential)}
            </p>
          </div>
        </div>
        <div className="row" style={{ gap: '0.75rem', alignItems: 'center' }}>
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

      {/* Futuristic Sticky Filter Bar */}
      <div 
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'linear-gradient(180deg, var(--surface) 0%, rgba(13, 21, 19, 0.95) 100%)',
          border: '1px solid rgba(39, 194, 103, 0.15)',
          borderRadius: '12px',
          padding: '0.85rem 1rem',
          marginBottom: '0.85rem',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div className="row-between" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Futuristic Search */}
          <div className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSelectedIndex(-1)}
                style={{ 
                  padding: '0.45rem 0.85rem 0.45rem 2rem', 
                  fontSize: '0.8rem', 
                  borderRadius: '8px',
                  width: '160px',
                  background: 'rgba(0,0,0,0.25)',
                  border: '1px solid rgba(39, 194, 103, 0.2)',
                  color: 'var(--text)',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
              <span style={{
                position: 'absolute',
                left: '0.6rem',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '0.8rem',
                color: 'var(--muted)',
              }}>⌘</span>
            </div>
            {keyboardNavActive && (
              <span style={{
                fontSize: '0.65rem',
                padding: '0.2rem 0.5rem',
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '4px',
                color: '#60a5fa',
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem',
                fontWeight: 600,
              }}>
                <kbd style={{ fontSize: '0.55rem', background: 'transparent', border: 'none', padding: 0 }}>J</kbd>
                <kbd style={{ fontSize: '0.55rem', background: 'transparent', border: 'none', padding: 0 }}>K</kbd>
              </span>
            )}
          </div>

          {/* Modern Chip Filters */}
          <div className="row" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
            {scoreFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setScoreFilter(filter.value)}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  borderRadius: '20px',
                  border: 'none',
                  cursor: 'pointer',
                  background: scoreFilter === filter.value 
                    ? `linear-gradient(135deg, ${filter.color} 0%, ${filter.color}cc 100%)`
                    : 'rgba(255,255,255,0.05)',
                  color: scoreFilter === filter.value ? '#000' : 'var(--text-muted)',
                  transition: 'all 0.2s ease',
                  boxShadow: scoreFilter === filter.value 
                    ? `0 0 16px ${filter.color}60, inset 0 1px 0 rgba(255,255,255,0.2)` 
                    : 'none',
                  letterSpacing: '0.03em',
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Futuristic Sort & Actions */}
          <div className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              style={{ 
                padding: '0.4rem 0.6rem', 
                fontSize: '0.75rem', 
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(39, 194, 103, 0.2)',
                color: 'var(--text)',
                fontWeight: 600,
              }}
            >
              <option value="score">Score</option>
              <option value="margin">Margin</option>
              <option value="profit">Profit</option>
              <option value="volume">Volume</option>
            </select>
            
            {refreshResult && (
              <span style={{ 
                fontSize: '0.75rem', 
                color: refreshResult.startsWith('✓') ? '#22c55e' : '#ef4444',
                fontWeight: 600,
                textShadow: refreshResult.startsWith('✓') ? '0 0 8px rgba(34, 197, 94, 0.3)' : 'none',
              }}>
                {refreshResult}
              </span>
            )}
            {typeof onRefreshPrices === 'function' && (
              <button 
                onClick={handleRefreshPrices} 
                disabled={refreshingPrices}
                style={{
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                  border: '1px solid rgba(39, 194, 103, 0.3)',
                  background: refreshingPrices ? 'rgba(39, 194, 103, 0.1)' : 'rgba(39, 194, 103, 0.15)',
                  color: '#27c267',
                  cursor: refreshingPrices ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {refreshingPrices ? '⟳' : '⟳ Sync'}
              </button>
            )}
            <button onClick={onRefresh} disabled={loading} style={{
                padding: '0.4rem 0.8rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}>
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

      {/* Futuristic Empty State */}
      {sortedOpportunities.length === 0 ? (
        <div 
          style={{ 
            position: 'relative',
            textAlign: 'center', 
            padding: '4rem 2rem',
            background: 'linear-gradient(180deg, rgba(39, 194, 103, 0.03) 0%, transparent 100%)',
            border: '1px solid rgba(39, 194, 103, 0.15)',
            borderRadius: '16px',
            overflow: 'hidden',
          }}
        >
          {/* Animated grid background */}
          <div 
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `
                linear-gradient(rgba(39, 194, 103, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(39, 194, 103, 0.03) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
            }}
          />
          {/* Scanning line effect */}
          <div 
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, transparent, #27c267, transparent)',
            }}
          />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '4rem', marginBottom: '1.5rem', filter: 'drop-shadow(0 0 20px rgba(39, 194, 103, 0.5))' }}>🎯</div>
            <h3 style={{ 
              margin: '0 0 0.75rem', 
              fontSize: '1.5rem', 
              fontWeight: 800,
              background: 'linear-gradient(135deg, #27c267 0%, #9ff0c4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              No Opportunities Detected
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '2rem', maxWidth: '380px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
              Initialize your scanner with a starter watchlist, then sync price feeds to discover profitable flips.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              <button
                onClick={async () => {
                  try {
                    const seedRes = await fetch('/api/theses/seed', { method: 'POST' });
                    const seedData = await seedRes.json().catch(() => ({}));
                    if (!seedRes.ok) {
                      setRefreshResult(seedData?.error ?? 'Failed to initialize scanner');
                      return;
                    }
                    setRefreshResult(`✓ Initialized ${seedData?.inserted ?? 0} items`);
                    await handleRefreshPrices();
                  } catch {
                    setRefreshResult('Failed to initialize scanner');
                  }
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                  border: '1px solid rgba(39, 194, 103, 0.4)',
                  background: 'rgba(39, 194, 103, 0.1)',
                  color: '#27c267',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Initialize Scanner
              </button>
              {typeof onRefreshPrices === 'function' && (
                <button 
                  onClick={handleRefreshPrices} 
                  disabled={refreshingPrices}
                  style={{
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    cursor: refreshingPrices ? 'not-allowed' : 'pointer',
                    opacity: refreshingPrices ? 0.6 : 1,
                  }}
                >
                  {refreshingPrices ? 'Scanning...' : 'Scan Now'}
                </button>
              )}
            </div>
            {/* Status indicators */}
            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#27c267', boxShadow: '0 0 8px #27c267' }} />
                <span>API Connected</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 8px #3b82f6' }} />
                <span>Ready to Scan</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }} ref={listRef}>
          {sortedOpportunities.map((opp, idx) => {
            const isExpanded = expandedRow === opp.item_id;
            const isSelected = selectedIndex === idx;
            const sparkline = sparklineData[opp.item_id];
            const isSparklineLoading = loadingSparklines.has(opp.item_id);
            const isHighPriority = opp.score >= 60;
            
            return (
              <div
                key={opp.item_id}
                data-opp-row
                onClick={() => {
                  setSelectedIndex(idx);
                  setExpandedRow(isExpanded ? null : opp.item_id);
                }}
                style={{
                  background: isSelected 
                    ? 'linear-gradient(135deg, rgba(245, 197, 24, 0.08) 0%, rgba(39, 194, 103, 0.04) 100%)'
                    : isHighPriority
                      ? 'linear-gradient(135deg, rgba(39, 194, 103, 0.06) 0%, transparent 100%)'
                      : 'var(--surface)',
                  border: `1px solid ${isExpanded 
                    ? 'rgba(39, 194, 103, 0.5)' 
                    : isSelected 
                      ? 'rgba(245, 197, 24, 0.4)' 
                      : isHighPriority
                        ? 'rgba(39, 194, 103, 0.15)'
                        : 'var(--border)'}`,
                  borderRadius: '12px',
                  padding: '0.9rem 1.1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isExpanded 
                    ? '0 0 20px rgba(39, 194, 103, 0.2)' 
                    : isSelected 
                      ? '0 0 15px rgba(245, 197, 24, 0.15)'
                      : isHighPriority
                        ? '0 0 10px rgba(39, 194, 103, 0.1)'
                        : 'none',
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
