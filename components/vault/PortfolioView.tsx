'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type PortfolioPosition = {
  item_id: number;
  item_name: string;
  quantity: number;
  avg_buy_price: number;
  last_price: number | null;
  realized_profit: number | null;
  unrealized_profit: number | null;
  updated_at: string | null;
  icon_url: string | null;
};

type PortfolioSummary = {
  total_value: number;
  total_invested: number;
  total_realized_profit: number;
  total_unrealized_profit: number;
  total_profit: number;
  position_count: number;
};

interface PortfolioViewProps {
  positions: PortfolioPosition[];
  summary: PortfolioSummary | null;
  loading: boolean;
}

export default function PortfolioView({ positions, loading }: PortfolioViewProps) {
  // Calculate portfolio stats
  const stats = useMemo(() => {
    if (positions.length === 0) return null;

    let totalInvested = 0;
    let totalValue = 0;
    let totalRealized = 0;
    let totalUnrealized = 0;

    for (const p of positions) {
      const invested = p.avg_buy_price * p.quantity;
      const value = (p.last_price ?? p.avg_buy_price) * p.quantity;
      totalInvested += invested;
      totalValue += value;
      totalRealized += Number(p.realized_profit ?? 0);
      totalUnrealized += Number(p.unrealized_profit ?? 0);
    }

    const profit = totalValue - totalInvested + totalRealized;
    const roi = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

    // Calculate average ROI per position
    let avgPositionRoi = 0;
    let positionCount = 0;
    for (const p of positions) {
      const invested = p.avg_buy_price * p.quantity;
      if (invested > 0) {
        const currentValue = (p.last_price ?? p.avg_buy_price) * p.quantity;
        const positionRoi = ((currentValue - invested) / invested) * 100;
        avgPositionRoi += positionRoi;
        positionCount++;
      }
    }
    avgPositionRoi = positionCount > 0 ? avgPositionRoi / positionCount : 0;

    return {
      totalInvested,
      totalValue,
      totalRealized,
      totalUnrealized,
      profit,
      roi,
      avgPositionRoi,
    };
  }, [positions]);

  // Sort by value
  const sortedByValue = useMemo(() => {
    if (!stats || positions.length === 0) return [];
    return positions
      .map(p => ({ ...p, currentValue: (p.last_price ?? p.avg_buy_price) * p.quantity }))
      .sort((a, b) => b.currentValue - a.currentValue);
  }, [positions, stats]);

  // Top 10 holdings
  const topHoldings = useMemo(() => {
    if (!stats || sortedByValue.length === 0) return [];
    return sortedByValue.slice(0, 10).map(p => ({
      item_id: p.item_id,
      name: p.item_name,
      value: p.currentValue,
      pct: (p.currentValue / stats.totalValue) * 100,
      icon_url: p.icon_url,
    }));
  }, [sortedByValue, stats]);

  // Profit/loss breakdown
  const profitStats = useMemo(() => {
    if (positions.length === 0) return null;
    let inProfit = 0, inLoss = 0, atBreakEven = 0;
    for (const p of positions) {
      const invested = p.avg_buy_price * p.quantity;
      if (invested <= 0) continue;
      const currentValue = (p.last_price ?? p.avg_buy_price) * p.quantity;
      const roi = ((currentValue - invested) / invested) * 100;
      if (roi > 0) inProfit++;
      else if (roi < 0) inLoss++;
      else atBreakEven++;
    }
    return { inProfit, inLoss, atBreakEven };
  }, [positions]);

  // Best performer
  const bestPerformer = useMemo(() => {
    if (positions.length === 0) return null;
    let best: PortfolioPosition | null = null;
    let bestRoi = -Infinity;
    for (const p of positions) {
      const invested = p.avg_buy_price * p.quantity;
      if (invested <= 0) continue;
      const currentValue = (p.last_price ?? p.avg_buy_price) * p.quantity;
      const roi = ((currentValue - invested) / invested) * 100;
      if (roi > bestRoi) { bestRoi = roi; best = p; }
    }
    if (!best) return null;
    const invested = best.avg_buy_price * best.quantity;
    const currentValue = (best.last_price ?? best.avg_buy_price) * best.quantity;
    return { ...best, roi: bestRoi, profit: currentValue - invested };
  }, [positions]);

  const barColors = ['#f5c518', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4', '#84cc16', '#eab308', '#6366f1'];

  if (loading) {
    return <div className="card"><p className="muted">Loading portfolio...</p></div>;
  }

  if (positions.length === 0) {
    return (
      <section className="grid" style={{ gap: 'var(--space-sm)' }}>
        <article className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-extrabold)', marginBottom: 'var(--space-2)' }}>No Positions</h2>
          <p className="muted">Your portfolio is empty.</p>
        </article>
      </section>
    );
  }

  return (
    <section className="grid" style={{ gap: 'var(--space-sm)' }}>
      {/* Summary Cards */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-2)' }}>
        <article className="card" style={{ padding: 'var(--space-3)', background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}>
          <p className="muted" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-1)' }}>Portfolio Value</p>
          <p style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-black)', color: '#f5c518' }}>{Math.round(stats?.totalValue ?? 0).toLocaleString()}</p>
          <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>{positions.length} items</p>
        </article>
        <article className="card" style={{ padding: 'var(--space-3)', background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}>
          <p className="muted" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-1)' }}>Invested</p>
          <p style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-black)' }}>{Math.round(stats?.totalInvested ?? 0).toLocaleString()}</p>
        </article>
        <article className="card" style={{ padding: 'var(--space-3)', background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}>
          <p className="muted" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-1)' }}>Total Profit</p>
          <p style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-black)', color: (stats?.profit ?? 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{(stats?.profit ?? 0) >= 0 ? '+' : ''}{Math.round(stats?.profit ?? 0).toLocaleString()}</p>
        </article>
        <article className="card" style={{ padding: 'var(--space-3)', background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}>
          <p className="muted" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-1)' }}>Portfolio ROI</p>
          <p style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-black)', color: (stats?.roi ?? 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{(stats?.roi ?? 0) >= 0 ? '+' : ''}{(stats?.roi ?? 0).toFixed(1)}%</p>
        </article>
        <article className="card" style={{ padding: 'var(--space-3)', background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}>
          <p className="muted" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-1)' }}>Avg ROI</p>
          <p style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-black)', color: (stats?.avgPositionRoi ?? 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{(stats?.avgPositionRoi ?? 0) >= 0 ? '+' : ''}{(stats?.avgPositionRoi ?? 0).toFixed(1)}%</p>
        </article>
      </div>

      {/* Allocation Bar - Top 10 */}
      {topHoldings.length > 0 && (
        <article className="card" style={{ padding: 'var(--space-3)' }}>
          <div className="row-between" style={{ marginBottom: 'var(--space-3)' }}>
            <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', color: 'var(--color-text-muted)' }}>ALLOCATION — TOP 10</h2>
            <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>{topHoldings.length} holdings</span>
          </div>
          <div style={{ height: 16, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', overflow: 'hidden', display: 'flex', marginBottom: 'var(--space-3)' }}>
            {topHoldings.map((h, i) => (
              <div key={h.item_id} style={{ width: `${h.pct}%`, background: barColors[i % barColors.length], minWidth: h.pct > 3 ? 'auto' : 2 }} title={`${h.name}: ${h.pct.toFixed(1)}%`} />
            ))}
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-2)' }}>
            {topHoldings.slice(0, 5).map((h, i) => (
              <div key={h.item_id} className="row" style={{ gap: 'var(--space-2)', alignItems: 'center' }}>
                <div style={{ width: 10, height: 10, borderRadius: 'var(--radius-sm)', background: barColors[i], flexShrink: 0 }} />
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</span>
                <span className="muted" style={{ fontSize: 'var(--text-xs)', marginLeft: 'auto' }}>{h.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </article>
      )}

      {/* Holdings Table */}
      <article className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--color-border-subtle)' }} className="row-between">
          <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', color: 'var(--color-text-muted)' }}>HOLDINGS ({positions.length})</h2>
          <div className="row" style={{ gap: 'var(--space-4)', fontSize: 'var(--text-xs)' }}>
            <span className="muted">Allocation</span>
            <span className="muted">Value</span>
            <span className="muted">P/L</span>
            <span className="muted">ROI</span>
          </div>
        </div>
        <div style={{ maxHeight: 500, overflowY: 'auto' }}>
          {sortedByValue.map((position, idx) => {
            const invested = position.avg_buy_price * position.quantity;
            const currentValue = (position.last_price ?? position.avg_buy_price) * position.quantity;
            const unrealized = Number(position.unrealized_profit ?? 0);
            const roi = invested > 0 ? ((currentValue - invested) / invested) * 100 : 0;
            const allocation = stats ? (currentValue / stats.totalValue) * 100 : 0;

            return (
              <div key={position.item_id} className="row" style={{ padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--color-border-subtle)', background: idx % 2 === 0 ? 'transparent' : 'var(--color-surface-2)', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div className="row" style={{ gap: 'var(--space-2)', alignItems: 'center', minWidth: 180, flex: '0 0 auto' }}>
                  {position.icon_url && <Image src={position.icon_url} alt="" width={22} height={22} style={{ imageRendering: 'pixelated', borderRadius: 'var(--radius-sm)', flexShrink: 0 }} unoptimized />}
                  <div style={{ minWidth: 0 }}>
                    <Link href={`/item/${position.item_id}`} style={{ color: '#f5c518', textDecoration: 'none', fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{position.item_name}</Link>
                    <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>{position.quantity.toLocaleString()} qty</span>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 80, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <div style={{ flex: 1, height: 6, background: 'var(--color-surface-3)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(allocation, 100)}%`, height: '100%', background: allocation > 10 ? '#f5c518' : 'var(--color-accent)', borderRadius: 'var(--radius-full)' }} />
                  </div>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)', color: 'var(--color-text-muted)', minWidth: 36 }}>{allocation.toFixed(1)}%</span>
                </div>
                <div style={{ minWidth: 70, textAlign: 'right' }}><p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>{currentValue.toLocaleString()}</p></div>
                <div style={{ minWidth: 70, textAlign: 'right' }}><p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: unrealized >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{unrealized >= 0 ? '+' : ''}{unrealized.toLocaleString()}</p></div>
                <div style={{ minWidth: 55, textAlign: 'right' }}><p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', color: roi >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{roi >= 0 ? '+' : ''}{roi.toFixed(1)}%</p></div>
              </div>
            );
          })}
        </div>
      </article>

      {/* P/L Distribution Bar */}
      {profitStats && (
        <article className="card" style={{ padding: 'var(--space-3)' }}>
          <div className="row-between" style={{ marginBottom: 'var(--space-2)' }}>
            <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', color: 'var(--color-text-muted)' }}>P/L DISTRIBUTION</h2>
            <div className="row" style={{ gap: 'var(--space-3)', fontSize: 'var(--text-xs)' }}>
              <span style={{ color: 'var(--color-success)' }}>● {profitStats.inProfit} profit</span>
              {profitStats.atBreakEven > 0 && <span style={{ color: '#6b7280' }}>● {profitStats.atBreakEven} even</span>}
              {profitStats.inLoss > 0 && <span style={{ color: 'var(--color-danger)' }}>● {profitStats.inLoss} loss</span>}
            </div>
          </div>
          <div style={{ display: 'flex', height: 10, borderRadius: 'var(--radius-full)', overflow: 'hidden', background: 'var(--color-surface-2)' }}>
            {profitStats.inProfit > 0 && <div style={{ width: `${(profitStats.inProfit / positions.length) * 100}%`, background: 'var(--color-success)' }} />}
            {profitStats.atBreakEven > 0 && <div style={{ width: `${(profitStats.atBreakEven / positions.length) * 100}%`, background: '#6b7280' }} />}
            {profitStats.inLoss > 0 && <div style={{ width: `${(profitStats.inLoss / positions.length) * 100}%`, background: 'var(--color-danger)' }} />}
          </div>
        </article>
      )}

      {/* Best Performer + Realized/Unrealized */}
      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr 1fr', gap: 'var(--space-2)' }}>
        {bestPerformer && (
          <article className="card" style={{ background: 'linear-gradient(135deg, #166534 0%, #14532d 50%, #0f172a 100%)', border: '1px solid var(--color-success)', padding: 'var(--space-3)' }}>
            <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'center' }}>
              {bestPerformer.icon_url && <Image src={bestPerformer.icon_url} alt="" width={32} height={32} style={{ imageRendering: 'pixelated', borderRadius: 'var(--radius-md)' }} unoptimized />}
              <div style={{ minWidth: 0 }}>
                <p className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)' }}>🏆 Best</p>
                <Link href={`/item/${bestPerformer.item_id}`} style={{ color: '#f5c518', textDecoration: 'none', fontWeight: 'var(--font-bold)', fontSize: 'var(--text-sm)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bestPerformer.item_name}</Link>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}><p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-black)', color: 'var(--color-success)' }}>+{bestPerformer.roi.toFixed(1)}%</p></div>
            </div>
          </article>
        )}
        <article className="card" style={{ padding: 'var(--space-3)' }}><p className="muted" style={{ fontSize: 'var(--text-xs)' }}>Realized</p><p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', color: (stats?.totalRealized ?? 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{(stats?.totalRealized ?? 0) >= 0 ? '+' : ''}{Math.round(stats?.totalRealized ?? 0).toLocaleString()}</p></article>
        <article className="card" style={{ padding: 'var(--space-3)' }}><p className="muted" style={{ fontSize: 'var(--text-xs)' }}>Unrealized</p><p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', color: (stats?.totalUnrealized ?? 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{(stats?.totalUnrealized ?? 0) >= 0 ? '+' : ''}{Math.round(stats?.totalUnrealized ?? 0).toLocaleString()}</p></article>
      </div>
    </section>
  );
}
