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
  recommendation?: 'hold' | 'exit' | 'sell';
  recommendation_reason?: string;
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
  onCreateProposal?: (data: {
    item_name: string;
    side: 'buy' | 'sell';
    quantity: number;
    price: number;
  }) => void;
}

export default function PortfolioView({ positions, loading, onCreateProposal }: PortfolioViewProps) {
  // Determine recommendation based on ROI
  const getRecommendation = (roi: number): { action: 'hold' | 'exit' | 'sell'; reason: string } => {
    if (roi > 20) return { action: 'hold', reason: 'Strong performer (+20% ROI)' };
    if (roi > 5) return { action: 'hold', reason: 'Positive momentum' };
    if (roi > -5) return { action: 'hold', reason: 'Near break-even, monitor' };
    if (roi > -15) return { action: 'exit', reason: 'Underperforming (-5-15% loss)' };
    return { action: 'sell', reason: 'Significant loss (-15%+), consider cutting' };
  };

  // Calculate recommendation for a position
  const calcRecommendation = (position: PortfolioPosition) => {
    const invested = position.avg_buy_price * position.quantity;
    if (invested <= 0) return { action: 'hold' as const, reason: 'No investment data' };
    const currentValue = (position.last_price ?? position.avg_buy_price) * position.quantity;
    const roi = ((currentValue - invested) / invested) * 100;
    return getRecommendation(roi);
  };
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

    // Calculate average ROI per position (simple average, not weighted)
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
        icon_url: p.icon_url,
      }));
  }, [positions, stats]);

  // Profit/loss breakdown
  const profitStats = useMemo(() => {
    if (positions.length === 0) return null;
    let inProfit = 0;
    let inLoss = 0;
    let atBreakEven = 0;
    
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
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
        <article className="card" style={{ background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}>
          <p className="muted" style={{ fontSize: '0.7rem' }}>Portfolio Value</p>
          <p style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f5c518' }}>
            {Math.round(stats?.totalValue ?? 0).toLocaleString()} gp
          </p>
          <p className="muted" style={{ fontSize: '0.65rem' }}>{positions.length} items</p>
        </article>
        <article className="card" style={{ background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}>
          <p className="muted" style={{ fontSize: '0.7rem' }}>Invested</p>
          <p style={{ fontSize: '1.25rem', fontWeight: 900 }}>
            {Math.round(stats?.totalInvested ?? 0).toLocaleString()} gp
          </p>
        </article>
        <article className="card" style={{ background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}>
          <p className="muted" style={{ fontSize: '0.7rem' }}>Total Profit</p>
          <p
            style={{
              fontSize: '1.25rem',
              fontWeight: 900,
              color: (stats?.profit ?? 0) >= 0 ? '#22c55e' : '#ef4444',
            }}
          >
            {(stats?.profit ?? 0) >= 0 ? '+' : ''}
            {Math.round(stats?.profit ?? 0).toLocaleString()} gp
          </p>
        </article>
        <article className="card" style={{ background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}>
          <p className="muted" style={{ fontSize: '0.7rem' }}>Portfolio ROI</p>
          <p
            style={{
              fontSize: '1.25rem',
              fontWeight: 900,
              color: (stats?.roi ?? 0) >= 0 ? '#22c55e' : '#ef4444',
            }}
          >
            {(stats?.roi ?? 0) >= 0 ? '+' : ''}
            {(stats?.roi ?? 0).toFixed(2)}%
          </p>
        </article>
        <article className="card" style={{ background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}>
          <p className="muted" style={{ fontSize: '0.7rem' }}>Avg Position ROI</p>
          <p
            style={{
              fontSize: '1.25rem',
              fontWeight: 900,
              color: (stats?.avgPositionRoi ?? 0) >= 0 ? '#22c55e' : '#ef4444',
            }}
          >
            {(stats?.avgPositionRoi ?? 0) >= 0 ? '+' : ''}
            {(stats?.avgPositionRoi ?? 0).toFixed(1)}%
          </p>
        </article>
      </div>

      {/* Action Panel - Recommendations Summary */}
      {positions.length > 0 && (
        <article className="card" style={{ 
          background: 'linear-gradient(135deg, #1e1b4b 0%, #172554 50%, #0f172a 100%)',
          border: '1px solid #6366f1',
          padding: '0.875rem',
        }}>
          <div className="row-between" style={{ marginBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#a5b4fc' }}>📋 Action Panel — Next Steps</h2>
          </div>
          
          {/* Recommendation buttons */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            {/* Hold positions */}
            {(() => {
              const holdPositions = positions.filter(p => {
                const rec = calcRecommendation(p);
                return rec.action === 'hold';
              }).slice(0, 3);
              return (
                <button
                  disabled={holdPositions.length === 0}
                  style={{
                    padding: '0.6rem 0.5rem',
                    borderRadius: 8,
                    background: holdPositions.length > 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(107, 114, 128, 0.1)',
                    border: `1px solid ${holdPositions.length > 0 ? '#22c55e40' : '#374151'}`,
                    cursor: holdPositions.length > 0 ? 'pointer' : 'default',
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (holdPositions.length > 0) {
                      e.currentTarget.style.background = 'rgba(34, 197, 94, 0.25)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = holdPositions.length > 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(107, 114, 128, 0.1)';
                  }}
                >
                  <p style={{ fontSize: '1rem', fontWeight: 900, color: holdPositions.length > 0 ? '#22c55e' : '#6b7280' }}>
                    {holdPositions.length}
                  </p>
                  <p style={{ fontSize: '0.65rem', color: holdPositions.length > 0 ? '#86efac' : '#6b7280', fontWeight: 600 }}>
                    HOLD
                  </p>
                </button>
              );
            })()}
            
            {/* Exit positions */}
            {(() => {
              const exitPositions = positions.filter(p => {
                const rec = calcRecommendation(p);
                return rec.action === 'exit';
              }).slice(0, 3);
              return (
                <button
                  disabled={exitPositions.length === 0}
                  style={{
                    padding: '0.6rem 0.5rem',
                    borderRadius: 8,
                    background: exitPositions.length > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(107, 114, 128, 0.1)',
                    border: `1px solid ${exitPositions.length > 0 ? '#f59e0b40' : '#374151'}`,
                    cursor: exitPositions.length > 0 ? 'pointer' : 'default',
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (exitPositions.length > 0) {
                      e.currentTarget.style.background = 'rgba(245, 158, 11, 0.25)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = exitPositions.length > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(107, 114, 128, 0.1)';
                  }}
                >
                  <p style={{ fontSize: '1rem', fontWeight: 900, color: exitPositions.length > 0 ? '#f59e0b' : '#6b7280' }}>
                    {exitPositions.length}
                  </p>
                  <p style={{ fontSize: '0.65rem', color: exitPositions.length > 0 ? '#fcd34d' : '#6b7280', fontWeight: 600 }}>
                    EXIT
                  </p>
                </button>
              );
            })()}
            
            {/* Sell positions */}
            {(() => {
              const sellPositions = positions.filter(p => {
                const rec = calcRecommendation(p);
                return rec.action === 'sell';
              }).slice(0, 3);
              return (
                <button
                  disabled={sellPositions.length === 0}
                  style={{
                    padding: '0.6rem 0.5rem',
                    borderRadius: 8,
                    background: sellPositions.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(107, 114, 128, 0.1)',
                    border: `1px solid ${sellPositions.length > 0 ? '#ef444440' : '#374151'}`,
                    cursor: sellPositions.length > 0 ? 'pointer' : 'default',
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (sellPositions.length > 0) {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = sellPositions.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(107, 114, 128, 0.1)';
                  }}
                >
                  <p style={{ fontSize: '1rem', fontWeight: 900, color: sellPositions.length > 0 ? '#ef4444' : '#6b7280' }}>
                    {sellPositions.length}
                  </p>
                  <p style={{ fontSize: '0.65rem', color: sellPositions.length > 0 ? '#fca5a5' : '#6b7280', fontWeight: 600 }}>
                    SELL
                  </p>
                </button>
              );
            })()}
          </div>

          {/* Quick sell prompt for worst performers */}
          {(() => {
            const worstPositions = positions
              .map(p => {
                const invested = p.avg_buy_price * p.quantity;
                if (invested <= 0) return { ...p, roi: 0 };
                const currentValue = (p.last_price ?? p.avg_buy_price) * p.quantity;
                return { ...p, roi: ((currentValue - invested) / invested) * 100 };
              })
              .filter(p => p.roi < 0)
              .sort((a, b) => a.roi - b.roi)
              .slice(0, 2);
            
            if (worstPositions.length === 0) return null;
            
            return (
              <div style={{ marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid #374151' }}>
                <p className="muted" style={{ fontSize: '0.7rem', marginBottom: '0.4rem' }}>
                  ⚠️ Consider selling losing positions:
                </p>
                <div className="grid" style={{ gap: '0.4rem' }}>
                  {worstPositions.map(p => (
                    <div key={p.item_id} className="row" style={{ gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div className="row" style={{ gap: '0.4rem', alignItems: 'center' }}>
                        {p.icon_url && (
                          <Image src={p.icon_url} alt="" width={18} height={18} style={{ imageRendering: 'pixelated', borderRadius: 3 }} unoptimized />
                        )}
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{p.item_name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{p.roi.toFixed(1)}%</span>
                      </div>
                      {typeof onCreateProposal === 'function' && (
                        <button
                          onClick={() => onCreateProposal({
                            item_name: p.item_name,
                            side: 'sell',
                            quantity: p.quantity,
                            price: p.last_price ?? p.avg_buy_price,
                          })}
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            background: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                          }}
                        >
                          SELL
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </article>
      )}

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
            <div className="row" style={{ gap: '0.6rem', alignItems: 'center' }}>
              {bestPerformer.icon_url && (
                <Image 
                  src={bestPerformer.icon_url} 
                  alt="" 
                  width={36}
                  height={36}
                  style={{ imageRendering: 'pixelated', borderRadius: 6 }}
                  unoptimized
                />
              )}
              <div>
                <p className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🏆 Best Performer</p>
                <Link href={`/item/${bestPerformer.item_id}`} style={{ color: '#f5c518', textDecoration: 'none', fontWeight: 800, fontSize: '1.2rem' }}>
                  {bestPerformer.item_name}
                </Link>
              </div>
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
            <div className="row" style={{ gap: '0.6rem', alignItems: 'center' }}>
              {worstPerformer.icon_url && (
                <Image 
                  src={worstPerformer.icon_url} 
                  alt="" 
                  width={36}
                  height={36}
                  style={{ imageRendering: 'pixelated', borderRadius: 6 }}
                  unoptimized
                />
              )}
              <div>
                <p className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📉 Worst Performer</p>
                <Link href={`/item/${worstPerformer.item_id}`} style={{ color: '#f5c518', textDecoration: 'none', fontWeight: 800, fontSize: '1.2rem' }}>
                  {worstPerformer.item_name}
                </Link>
              </div>
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

      {/* Positions at a glance */}
      {profitStats && positions.length > 0 && (
        <article className="card">
          <h2 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.6rem' }}>Positions at a glance</h2>
          <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', background: 'var(--surface-2)' }}>
            {profitStats.inProfit > 0 && (
              <div 
                style={{ 
                  width: `${(profitStats.inProfit / positions.length) * 100}%`, 
                  background: '#22c55e',
                  transition: 'width 0.3s ease',
                }} 
                title={`${profitStats.inProfit} in profit`}
              />
            )}
            {profitStats.atBreakEven > 0 && (
              <div 
                style={{ 
                  width: `${(profitStats.atBreakEven / positions.length) * 100}%`, 
                  background: '#6b7280',
                }}
                title={`${profitStats.atBreakEven} at break-even`}
              />
            )}
            {profitStats.inLoss > 0 && (
              <div 
                style={{ 
                  width: `${(profitStats.inLoss / positions.length) * 100}%`, 
                  background: '#ef4444',
                  transition: 'width 0.3s ease',
                }}
                title={`${profitStats.inLoss} in loss`}
              />
            )}
          </div>
          <div className="row" style={{ gap: '1rem', marginTop: '0.5rem', fontSize: '0.75rem' }}>
            <span style={{ color: '#22c55e' }}>● {profitStats.inProfit} profit</span>
            {profitStats.atBreakEven > 0 && <span style={{ color: '#6b7280' }}>● {profitStats.atBreakEven} even</span>}
            {profitStats.inLoss > 0 && <span style={{ color: '#ef4444' }}>● {profitStats.inLoss} loss</span>}
          </div>
        </article>
      )}

      {/* Allocation Bar */}
      {topHoldings.length > 0 && (
        <article className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.75rem' }}>Top Holdings</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {topHoldings.map((holding, idx) => (
              <div key={holding.name}>
                <div className="row" style={{ gap: '0.5rem', marginBottom: '0.2rem', alignItems: 'center' }}>
                  {holding.icon_url && (
                    <Image 
                      src={holding.icon_url} 
                      alt="" 
                      width={20}
                      height={20}
                      style={{ imageRendering: 'pixelated', borderRadius: 3 }}
                      unoptimized
                    />
                  )}
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{holding.name}</span>
                  <span className="muted" style={{ fontSize: '0.8rem', marginLeft: 'auto' }}>{holding.pct.toFixed(1)}%</span>
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
                <div className="row" style={{ gap: '0.6rem', marginBottom: '0.35rem', alignItems: 'center' }}>
                  {position.icon_url && (
                    <Image 
                      src={position.icon_url} 
                      alt="" 
                      width={28}
                      height={28}
                      style={{ imageRendering: 'pixelated', borderRadius: 4 }}
                      unoptimized
                    />
                  )}
                  <Link href={`/item/${position.item_id}`} style={{ color: '#f5c518', textDecoration: 'none', fontWeight: 700 }}>
                    {position.item_name}
                  </Link>
                  {/* Recommendation Badge */}
                  {(() => {
                    const rec = calcRecommendation(position);
                    const badgeColors = {
                      hold: { bg: 'rgba(34, 197, 94, 0.2)', border: '#22c55e', text: '#22c55e' },
                      exit: { bg: 'rgba(245, 158, 11, 0.2)', border: '#f59e0b', text: '#f59e0b' },
                      sell: { bg: 'rgba(239, 68, 68, 0.2)', border: '#ef4444', text: '#ef4444' },
                    };
                    const colors = badgeColors[rec.action];
                    return (
                      <span 
                        style={{ 
                          padding: '0.15rem 0.4rem', 
                          borderRadius: 4, 
                          fontSize: '0.65rem', 
                          fontWeight: 700,
                          background: colors.bg,
                          border: `1px solid ${colors.border}`,
                          color: colors.text,
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em',
                        }}
                        title={rec.reason}
                      >
                        {rec.action}
                      </span>
                    );
                  })()}
                  <span className="muted" style={{ marginLeft: 'auto' }}>{position.quantity.toLocaleString()} qty</span>
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

                {typeof onCreateProposal === 'function' && (
                  <button
                    onClick={() => onCreateProposal({
                      item_name: position.item_name,
                      side: 'sell',
                      quantity: position.quantity,
                      price: position.last_price ?? position.avg_buy_price,
                    })}
                    style={{ 
                      marginTop: '0.5rem', 
                      padding: '0.4rem 0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                      color: '#fff',
                      border: '1px solid #ef4444',
                      borderRadius: 6,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <span>💰</span>
                    <span>Sell Position</span>
                    {position.quantity > 1 && (
                      <span style={{ opacity: 0.8, fontSize: '0.7rem' }}>({position.quantity.toLocaleString()} qty)</span>
                    )}
                  </button>
                )}

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
