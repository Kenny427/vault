'use client';

import { useMemo } from 'react';
import Link from 'next/link';

type PortfolioPosition = {
  item_id: number;
  item_name: string;
  quantity: number;
  avg_buy_price: number;
  last_price: number | null;
  realized_profit: number | null;
  unrealized_profit: number | null;
  updated_at: string | null;
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

    return {
      totalInvested,
      totalValue,
      totalRealized,
      totalUnrealized,
      profit,
      roi,
    };
  }, [positions]);

  // Calculate allocation percentages for top holdings
  const topHoldings = useMemo(() => {
    if (!stats || positions.length === 0) return [];
    
    const withValue = positions.map(p => ({
      ...p,
      currentValue: (p.last_price ?? p.avg_buy_price) * p.quantity,
    }));
    
    return withValue
      .sort((a, b) => b.currentValue - a.currentValue)
      .slice(0, 5)
      .map(p => ({
        name: p.item_name,
        value: p.currentValue,
        pct: (p.currentValue / stats.totalValue) * 100,
      }));
  }, [positions, stats]);

  // Best performer (highest ROI)
  const bestPerformer = useMemo(() => {
    if (positions.length === 0) return null;
    let best: PortfolioPosition | null = null;
    let bestRoi = -Infinity;
    
    for (const p of positions) {
      const invested = p.avg_buy_price * p.quantity;
      if (invested <= 0) continue;
      const currentValue = (p.last_price ?? p.avg_buy_price) * p.quantity;
      const roi = ((currentValue - invested) / invested) * 100;
      if (roi > bestRoi) {
        bestRoi = roi;
        best = p;
      }
    }
    
    if (!best) return null;
    const invested = best.avg_buy_price * best.quantity;
    const currentValue = (best.last_price ?? best.avg_buy_price) * best.quantity;
    return {
      ...best,
      roi: bestRoi,
      profit: currentValue - invested,
    };
  }, [positions]);

  // Worst performer (lowest ROI)
  const worstPerformer = useMemo(() => {
    if (positions.length === 0) return null;
    let worst: PortfolioPosition | null = null;
    let worstRoi = Infinity;
    
    for (const p of positions) {
      const invested = p.avg_buy_price * p.quantity;
      if (invested <= 0) continue;
      const currentValue = (p.last_price ?? p.avg_buy_price) * p.quantity;
      const roi = ((currentValue - invested) / invested) * 100;
      if (roi < worstRoi) {
        worstRoi = roi;
        worst = p;
      }
    }
    
    if (!worst) return null;
    const invested = worst.avg_buy_price * worst.quantity;
    const currentValue = (worst.last_price ?? worst.avg_buy_price) * worst.quantity;
    return {
      ...worst,
      roi: worstRoi,
      profit: currentValue - invested,
    };
  }, [positions]);

  if (loading) {
    return (
      <div className="card">
        <p className="muted">Loading portfolio...</p>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <section className="grid" style={{ gap: '0.75rem' }}>
        <article className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>No Positions</h2>
          <p className="muted">Your portfolio is empty. Trades made through DINK will appear here.</p>
        </article>
      </section>
    );
  }

  return (
    <section className="grid" style={{ gap: '0.75rem' }}>
      {/* Summary Cards */}
      <div className="grid grid-2" style={{ gap: '0.5rem' }}>
        <article className="card" style={{ background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}>
          <p className="muted" style={{ fontSize: '0.75rem' }}>Portfolio Value</p>
          <p style={{ fontSize: '1.3rem', fontWeight: 900, color: '#f5c518' }}>
            {Math.round(stats?.totalValue ?? 0).toLocaleString()} gp
          </p>
        </article>
        <article className="card" style={{ background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}>
          <p className="muted" style={{ fontSize: '0.75rem' }}>Total Invested</p>
          <p style={{ fontSize: '1.3rem', fontWeight: 900 }}>
            {Math.round(stats?.totalInvested ?? 0).toLocaleString()} gp
          </p>
        </article>
        <article className="card" style={{ background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}>
          <p className="muted" style={{ fontSize: '0.75rem' }}>Total Profit</p>
          <p
            style={{
              fontSize: '1.3rem',
              fontWeight: 900,
              color: (stats?.profit ?? 0) >= 0 ? '#22c55e' : '#ef4444',
            }}
          >
            {(stats?.profit ?? 0) >= 0 ? '+' : ''}
            {Math.round(stats?.profit ?? 0).toLocaleString()} gp
          </p>
        </article>
        <article className="card" style={{ background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}>
          <p className="muted" style={{ fontSize: '0.75rem' }}>ROI</p>
          <p
            style={{
              fontSize: '1.3rem',
              fontWeight: 900,
              color: (stats?.roi ?? 0) >= 0 ? '#22c55e' : '#ef4444',
            }}
          >
            {(stats?.roi ?? 0) >= 0 ? '+' : ''}
            {(stats?.roi ?? 0).toFixed(2)}%
          </p>
        </article>
      </div>

      {/* Best Performer */}
      {bestPerformer && (
        <article className="card" style={{ 
          background: 'linear-gradient(135deg, #166534 0%, #14532d 50%, #0f172a 100%)',
          border: '1px solid #22c55e',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.01)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(34,197,94,0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = 'none';
        }}
        >
          <div className="row-between">
            <div>
              <p className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🏆 Best Performer</p>
              <Link href={`/item/${bestPerformer.item_id}`} style={{ color: '#f5c518', textDecoration: 'none', fontWeight: 800, fontSize: '1.2rem' }}>
                {bestPerformer.item_name}
              </Link>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '1.4rem', fontWeight: 900, color: '#22c55e' }}>
                +{bestPerformer.roi.toFixed(1)}%
              </p>
              <p className="muted" style={{ fontSize: '0.75rem' }}>
                +{Math.round(bestPerformer.profit).toLocaleString()} gp
              </p>
            </div>
          </div>
        </article>
      )}

      {/* Worst Performer */}
      {worstPerformer && worstPerformer.roi < 0 && (
        <article className="card" style={{ 
          background: 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 50%, #0f172a 100%)',
          border: '1px solid #ef4444',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.01)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(239,68,68,0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = 'none';
        }}
        >
          <div className="row-between">
            <div>
              <p className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📉 Worst Performer</p>
              <Link href={`/item/${worstPerformer.item_id}`} style={{ color: '#f5c518', textDecoration: 'none', fontWeight: 800, fontSize: '1.2rem' }}>
                {worstPerformer.item_name}
              </Link>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ef4444' }}>
                {worstPerformer.roi.toFixed(1)}%
              </p>
              <p className="muted" style={{ fontSize: '0.75rem' }}>
                {Math.round(worstPerformer.profit).toLocaleString()} gp
              </p>
            </div>
          </div>
        </article>
      )}

      {/* Profit Breakdown */}
      <div className="grid grid-2" style={{ gap: '0.5rem' }}>
        <article className="card">
          <p className="muted" style={{ fontSize: '0.75rem' }}>Realized Profit</p>
          <p
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: (stats?.totalRealized ?? 0) >= 0 ? '#22c55e' : '#ef4444',
            }}
          >
            {(stats?.totalRealized ?? 0) >= 0 ? '+' : ''}
            {Math.round(stats?.totalRealized ?? 0).toLocaleString()} gp
          </p>
        </article>
        <article className="card">
          <p className="muted" style={{ fontSize: '0.75rem' }}>Unrealized Profit</p>
          <p
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: (stats?.totalUnrealized ?? 0) >= 0 ? '#22c55e' : '#ef4444',
            }}
          >
            {(stats?.totalUnrealized ?? 0) >= 0 ? '+' : ''}
            {Math.round(stats?.totalUnrealized ?? 0).toLocaleString()} gp
          </p>
        </article>
      </div>

      {/* Allocation Bar */}
      {topHoldings.length > 0 && (
        <article className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.75rem' }}>Top Holdings</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {topHoldings.map((holding, idx) => (
              <div key={holding.name}>
                <div className="row-between" style={{ marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{holding.name}</span>
                  <span className="muted" style={{ fontSize: '0.8rem' }}>{holding.pct.toFixed(1)}%</span>
                </div>
                <div style={{ 
                  height: 8, 
                  background: 'var(--surface-2)', 
                  borderRadius: 4, 
                  overflow: 'hidden',
                  display: 'flex',
                }}>
                  <div 
                    style={{ 
                      width: `${holding.pct}%`, 
                      background: idx === 0 ? '#f5c518' : idx === 1 ? '#22c55e' : idx === 2 ? '#3b82f6' : '#8b5cf6',
                      borderRadius: 4,
                      transition: 'width 0.3s ease',
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </article>
      )}

      {/* Positions List */}
      <article className="card">
        <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.75rem' }}>
          Holdings ({positions.length})
        </h2>
        <ul className="list">
          {positions.map((position) => {
            const invested = position.avg_buy_price * position.quantity;
            const currentValue = (position.last_price ?? position.avg_buy_price) * position.quantity;
            const unrealized = Number(position.unrealized_profit ?? 0);
            const roi = invested > 0 ? ((currentValue - invested) / invested) * 100 : 0;

            return (
              <li
                key={position.item_id}
                className="card"
                style={{
                  padding: '0.75rem',
                  borderLeft: `3px solid ${roi >= 0 ? '#22c55e' : '#ef4444'}`,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(4px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                  e.currentTarget.style.borderColor = roi >= 0 ? '#22c55e' : '#ef4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div className="row-between" style={{ marginBottom: '0.35rem' }}>
                  <Link href={`/item/${position.item_id}`} style={{ color: '#f5c518', textDecoration: 'none', fontWeight: 700 }}>
                    {position.item_name}
                  </Link>
                  <span className="muted">{position.quantity.toLocaleString()} qty</span>
                </div>

                <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.8rem' }}>
                  <div>
                    <p className="muted" style={{ fontSize: '0.65rem' }}>Avg Buy</p>
                    <p style={{ fontWeight: 600 }}>{position.avg_buy_price.toLocaleString()} gp</p>
                  </div>
                  <div>
                    <p className="muted" style={{ fontSize: '0.65rem' }}>Last Price</p>
                    <p style={{ fontWeight: 600 }}>
                      {position.last_price ? `${position.last_price.toLocaleString()} gp` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="muted" style={{ fontSize: '0.65rem' }}>Invested</p>
                    <p style={{ fontWeight: 600 }}>{invested.toLocaleString()} gp</p>
                  </div>
                  <div>
                    <p className="muted" style={{ fontSize: '0.65rem' }}>Current Value</p>
                    <p style={{ fontWeight: 600 }}>{currentValue.toLocaleString()} gp</p>
                  </div>
                  <div>
                    <p className="muted" style={{ fontSize: '0.65rem' }}>Unrealized</p>
                    <p
                      style={{
                        fontWeight: 600,
                        color: unrealized >= 0 ? '#22c55e' : '#ef4444',
                      }}
                    >
                      {unrealized >= 0 ? '+' : ''}
                      {unrealized.toLocaleString()} gp
                    </p>
                  </div>
                  <div>
                    <p className="muted" style={{ fontSize: '0.65rem' }}>ROI</p>
                    <p
                      style={{
                        fontWeight: 700,
                        color: roi >= 0 ? '#22c55e' : '#ef4444',
                      }}
                    >
                      {roi >= 0 ? '+' : ''}
                      {roi.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {position.realized_profit && position.realized_profit !== 0 && (
                  <p className="muted" style={{ fontSize: '0.75rem', marginTop: '0.35rem' }}>
                    Realized:{' '}
                    <span style={{ color: position.realized_profit >= 0 ? '#22c55e' : '#ef4444' }}>
                      {position.realized_profit >= 0 ? '+' : ''}
                      {position.realized_profit.toLocaleString()} gp
                    </span>
                  </p>
                )}

                {position.updated_at && (
                  <p className="muted" style={{ fontSize: '0.65rem', marginTop: '0.35rem' }}>
                    Updated: {new Date(position.updated_at).toLocaleDateString()}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </article>
    </section>
  );
}
