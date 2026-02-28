'use client';

import { useMemo, useState } from 'react';
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
  onCreateProposal?: (data: { item_name: string; side: 'buy' | 'sell'; quantity: number; price: number }) => void;
}

function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  useMemo(() => {
    const duration = 600;
    const steps = 20;
    const stepValue = value / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += stepValue;
      if (current >= value) { setDisplayValue(value); clearInterval(interval); }
      else { setDisplayValue(current); }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [value]);
  return <span>{prefix}{Math.round(displayValue).toLocaleString()}{suffix}</span>;
}

export default function PortfolioView({ positions, loading, onCreateProposal }: PortfolioViewProps) {
  const getRecommendation = (roi: number) => {
    if (roi > 20) return { action: 'hold' as const, reason: 'Strong performer (+20% ROI)' };
    if (roi > 5) return { action: 'hold' as const, reason: 'Positive momentum' };
    if (roi > -5) return { action: 'hold' as const, reason: 'Near break-even, monitor' };
    if (roi > -15) return { action: 'exit' as const, reason: 'Underperforming (-5-15% loss)' };
    return { action: 'sell' as const, reason: 'Significant loss (-15%+), consider cutting' };
  };

  const calcRecommendation = (position: PortfolioPosition) => {
    const invested = position.avg_buy_price * position.quantity;
    if (invested <= 0) return { action: 'hold' as const, reason: 'No investment data' };
    const currentValue = (position.last_price ?? position.avg_buy_price) * position.quantity;
    const roi = ((currentValue - invested) / invested) * 100;
    return getRecommendation(roi);
  };

  const stats = useMemo(() => {
    if (positions.length === 0) return null;
    let totalInvested = 0, totalValue = 0, totalRealized = 0, totalUnrealized = 0;
    for (const p of positions) {
      const invested = p.avg_buy_price * p.quantity;
      const value = (p.last_price ?? p.avg_buy_price) * p.quantity;
      totalInvested += invested; totalValue += value;
      totalRealized += Number(p.realized_profit ?? 0);
      totalUnrealized += Number(p.unrealized_profit ?? 0);
    }
    const profit = totalValue - totalInvested + totalRealized;
    const roi = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
    let avgPositionRoi = 0, positionCount = 0;
    for (const p of positions) {
      const invested = p.avg_buy_price * p.quantity;
      if (invested > 0) {
        const currentValue = (p.last_price ?? p.avg_buy_price) * p.quantity;
        avgPositionRoi += ((currentValue - invested) / invested) * 100;
        positionCount++;
      }
    }
    return { totalInvested, totalValue, totalRealized, totalUnrealized, profit, roi, avgPositionRoi: positionCount > 0 ? avgPositionRoi / positionCount : 0 };
  }, [positions]);

  const allocations = useMemo(() => {
    if (!stats || positions.length === 0) return [];
    return positions.map(p => ({ ...p, currentValue: (p.last_price ?? p.avg_buy_price) * p.quantity }))
      .sort((a, b) => b.currentValue - a.currentValue)
      .map(p => ({ ...p, pct: (p.currentValue / stats.totalValue) * 100 }));
  }, [positions, stats]);

  const topHoldings = allocations.slice(0, 5);

  const profitStats = useMemo(() => {
    if (positions.length === 0) return null;
    let inProfit = 0, inLoss = 0, atBreakEven = 0;
    for (const p of positions) {
      const invested = p.avg_buy_price * p.quantity;
      if (invested <= 0) continue;
      const currentValue = (p.last_price ?? p.avg_buy_price) * p.quantity;
      const roi = ((currentValue - invested) / invested) * 100;
      if (roi > 0) inProfit++; else if (roi < 0) inLoss++; else atBreakEven++;
    }
    return { inProfit, inLoss, atBreakEven };
  }, [positions]);

  const bestPerformer = useMemo(() => {
    if (positions.length === 0) return null;
    let best: PortfolioPosition | null = null, bestRoi = -Infinity;
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

  const worstPerformer = useMemo(() => {
    if (positions.length === 0) return null;
    let worst: PortfolioPosition | null = null, worstRoi = Infinity;
    for (const p of positions) {
      const invested = p.avg_buy_price * p.quantity;
      if (invested <= 0) continue;
      const currentValue = (p.last_price ?? p.avg_buy_price) * p.quantity;
      const roi = ((currentValue - invested) / invested) * 100;
      if (roi < worstRoi) { worstRoi = roi; worst = p; }
    }
    if (!worst) return null;
    const invested = worst.avg_buy_price * worst.quantity;
    const currentValue = (worst.last_price ?? worst.avg_buy_price) * worst.quantity;
    return { ...worst, roi: worstRoi, profit: currentValue - invested };
  }, [positions]);

  const [expandedPositions, setExpandedPositions] = useState<Set<number>>(new Set());
  const togglePosition = (itemId: number) => {
    setExpandedPositions(prev => { const next = new Set(prev); next.has(itemId) ? next.delete(itemId) : next.add(itemId); return next; });
  };

  const recColors: Record<string, { bg: string; border: string; text: string }> = { 
    hold: { bg: 'rgba(34, 197, 94, 0.15)', border: '#22c55e', text: '#22c55e' }, 
    exit: { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', text: '#f59e0b' }, 
    sell: { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: '#ef4444' } 
  };

  if (loading) return <div className="cp-loading"><div className="spinner"></div><p>Loading portfolio data...</p></div>;

  if (positions.length === 0) return (
    <section className="cp">
      <div className="cp-empty"><div className="cp-empty-icon">📊</div><h2>No Positions</h2><p>Your portfolio is empty. Trades made through DINK will appear here.</p></div>
    </section>
  );

  return (
    <section className="cp">
      {/* COMMAND CENTER HEADER */}
      <header className="cp-header">
        <div className="cp-header-left"><div className="cp-status"></div><h1>Portfolio Command</h1></div>
        <div className="cp-header-stats"><span className="cp-pill">{positions.length} positions</span><span className="cp-pill">active</span></div>
      </header>

      {/* METRICS DASHBOARD */}
      <div className="cp-metrics">
        <div className="cp-metric cp-metric-primary">
          <div className="cp-metric-label">Total Value</div>
          <div className="cp-metric-value cp-metric-value-primary"><span className="cp-gp">⏣</span><AnimatedNumber value={stats?.totalValue ?? 0} /></div>
          <div className="cp-metric-sub">{positions.length} assets</div>
        </div>
        <div className="cp-metric">
          <div className="cp-metric-label">Invested</div>
          <div className="cp-metric-value"><AnimatedNumber value={stats?.totalInvested ?? 0} /><span className="cp-gp"> gp</span></div>
          <div className="cp-metric-bar"><div className="cp-metric-bar-fill" style={{width: `${stats && stats.totalValue > 0 ? (stats.totalInvested / stats.totalValue) * 100 : 0}%`}} /></div>
        </div>
        <div className="cp-metric">
          <div className="cp-metric-label">Total P/L</div>
          <div className={`cp-metric-value ${(stats?.profit ?? 0) >= 0 ? 'cp-profit' : 'cp-loss'}`}>{(stats?.profit ?? 0) >= 0 ? '+' : ''}<AnimatedNumber value={stats?.profit ?? 0} /><span className="cp-gp"> gp</span></div>
          <div className={`cp-metric-change ${stats && stats.profit >= 0 ? 'cp-profit' : 'cp-loss'}`}>{stats && stats.profit >= 0 ? '↑' : '↓'} {Math.abs(stats?.roi ?? 0).toFixed(1)}% ROI</div>
        </div>
        <div className="cp-metric">
          <div className="cp-metric-label">Portfolio ROI</div>
          <div className={`cp-metric-value cp-metric-value-large ${(stats?.roi ?? 0) >= 0 ? 'cp-profit' : 'cp-loss'}`}>{(stats?.roi ?? 0) >= 0 ? '+' : ''}{(stats?.roi ?? 0).toFixed(1)}%</div>
          <div className="cp-metric-sub">Avg: {(stats?.avgPositionRoi ?? 0) >= 0 ? '+' : ''}{(stats?.avgPositionRoi ?? 0).toFixed(1)}%</div>
        </div>
      </div>

      {/* ALLOCATION VISUALIZATION */}
      <div className="cp-allocation">
        <div className="cp-section-header"><h2>Allocation Breakdown</h2><span>{stats?.totalValue.toLocaleString()} gp total</span></div>
        <div className="cp-allocation-container">
          <div className="cp-donut">
            <svg viewBox="0 0 100 100">
              {allocations.map((holding, idx) => {
                const colors = ['#f5c518', '#27c267', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4', '#84cc16'];
                const prevPct = allocations.slice(0, idx).reduce((sum, h) => sum + h.pct, 0);
                return <circle key={holding.item_id} cx="50" cy="50" r="40" fill="transparent" stroke={colors[idx % colors.length]} strokeWidth="12" strokeDasharray={`${holding.pct * 2.51} ${251.2 - holding.pct * 2.51}`} strokeDashoffset={-prevPct * 2.51} />;
              })}
            </svg>
            <div className="cp-donut-center"><span>100%</span><small>Allocated</small></div>
          </div>
          <div className="cp-allocation-list">
            {topHoldings.map((holding, idx) => {
              const colors = ['#f5c518', '#27c267', '#3b82f6', '#8b5cf6', '#ec4899'];
              return (
                <div key={holding.item_id} className="cp-allocation-item">
                  <div className="cp-allocation-info"><div className="cp-allocation-dot" style={{background: colors[idx % colors.length]}} />{holding.icon_url && <Image src={holding.icon_url} alt="" width={20} height={20} style={{imageRendering:'pixelated',borderRadius:3}} unoptimized />}<Link href={`/item/${holding.item_id}`}>{holding.item_name}</Link></div>
                  <div className="cp-allocation-values"><span>{holding.pct.toFixed(1)}%</span><small>{holding.currentValue.toLocaleString()} gp</small></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* PERFORMANCE INDICATORS */}
      <div className="cp-performers">
        {bestPerformer && (
          <div className="cp-performer cp-performer-best">
            <div className="cp-performer-header"><span className="cp-performer-badge">↑ Best</span><span className="cp-performer-roi cp-profit">+{bestPerformer.roi.toFixed(1)}%</span></div>
            <div className="cp-performer-content">{bestPerformer.icon_url && <Image src={bestPerformer.icon_url} alt="" width={32} height={32} style={{imageRendering:'pixelated',borderRadius:6}} unoptimized />}<div><Link href={`/item/${bestPerformer.item_id}`}>{bestPerformer.item_name}</Link><span className="cp-profit">+{Math.round(bestPerformer.profit).toLocaleString()} gp</span></div></div>
          </div>
        )}
        {worstPerformer && worstPerformer.roi < 0 && (
          <div className="cp-performer cp-performer-worst">
            <div className="cp-performer-header"><span className="cp-performer-badge">↓ Worst</span><span className="cp-performer-roi cp-loss">{worstPerformer.roi.toFixed(1)}%</span></div>
            <div className="cp-performer-content">{worstPerformer.icon_url && <Image src={worstPerformer.icon_url} alt="" width={32} height={32} style={{imageRendering:'pixelated',borderRadius:6}} unoptimized />}<div><Link href={`/item/${worstPerformer.item_id}`}>{worstPerformer.item_name}</Link><span className="cp-loss">{Math.round(worstPerformer.profit).toLocaleString()} gp</span></div></div>
          </div>
        )}
        {profitStats && (
          <div className="cp-distribution">
            <div className="cp-distribution-header"><span>Position Health</span></div>
            <div className="cp-distribution-bars">
              <div className="cp-distribution-bar"><span className="cp-bar-label"><span className="cp-dot cp-dot-profit"></span>Profit</span><div className="cp-bar-track"><div className="cp-bar-fill cp-bar-fill-profit" style={{width: `${(profitStats.inProfit / positions.length) * 100}%`}} /></div><span>{profitStats.inProfit}</span></div>
              <div className="cp-distribution-bar"><span className="cp-bar-label"><span className="cp-dot cp-dot-loss"></span>Loss</span><div className="cp-bar-track"><div className="cp-bar-fill cp-bar-fill-loss" style={{width: `${(profitStats.inLoss / positions.length) * 100}%`}} /></div><span>{profitStats.inLoss}</span></div>
              {profitStats.atBreakEven > 0 && <div className="cp-distribution-bar"><span className="cp-bar-label"><span className="cp-dot cp-dot-even"></span>Even</span><div className="cp-bar-track"><div className="cp-bar-fill cp-bar-fill-even" style={{width: `${(profitStats.atBreakEven / positions.length) * 100}%`}} /></div><span>{profitStats.atBreakEven}</span></div>}
            </div>
          </div>
        )}
      </div>

      {/* POSITIONS LIST */}
      <div className="cp-positions">
        <div className="cp-section-header"><h2>Holdings <span>({positions.length})</span></h2></div>
        <div className="cp-positions-list">
          {positions.map((position) => {
            const invested = position.avg_buy_price * position.quantity;
            const currentValue = (position.last_price ?? position.avg_buy_price) * position.quantity;
            const unrealized = Number(position.unrealized_profit ?? 0);
            const roi = invested > 0 ? ((currentValue - invested) / invested) * 100 : 0;
            const isExpanded = expandedPositions.has(position.item_id);
            const rec = calcRecommendation(position);
            const colors = recColors[rec.action];

            return (
              <div key={position.item_id} className={`cp-position ${isExpanded ? 'cp-position-expanded' : ''}`} style={{borderLeftColor: colors.border}}>
                <div className="cp-position-header" onClick={() => togglePosition(position.item_id)}>
                  <div className="cp-position-main">{position.icon_url && <Image src={position.icon_url} alt="" width={28} height={28} style={{imageRendering:'pixelated',borderRadius:4}} unoptimized />}<Link href={`/item/${position.item_id}`}>{position.item_name}</Link><span>{position.quantity.toLocaleString()} qty</span></div>
                  <div className="cp-position-summary">
                    <div><small>Value</small><span>{currentValue.toLocaleString()} gp</span></div>
                    <div className={roi >= 0 ? 'cp-profit' : 'cp-loss'}><small>ROI</small><span>{roi >= 0 ? '+' : ''}{roi.toFixed(1)}%</span></div>
                  </div>
                  <span className="cp-position-expand">{isExpanded ? '▼' : '▶'}</span>
                </div>
                {isExpanded && (
                  <div className="cp-position-details">
                    <div className="cp-position-grid">
                      <div><small>Avg Buy</small><span>{position.avg_buy_price.toLocaleString()} gp</span></div>
                      <div><small>Last Price</small><span>{position.last_price ? `${position.last_price.toLocaleString()} gp` : '-'}</span></div>
                      <div><small>Invested</small><span>{invested.toLocaleString()} gp</span></div>
                      <div className={unrealized >= 0 ? 'cp-profit' : 'cp-loss'}><small>Unrealized</small><span>{unrealized >= 0 ? '+' : ''}{unrealized.toLocaleString()} gp</span></div>
                    </div>
                    <div className="cp-rec-badge" style={{background: colors.bg, borderColor: colors.border, color: colors.text}}><strong>{rec.action.toUpperCase()}</strong><span>{rec.reason}</span></div>
                    {typeof onCreateProposal === 'function' && <button className="cp-sell-btn" onClick={(e) => { e.preventDefault(); onCreateProposal({ item_name: position.item_name, side: 'sell', quantity: position.quantity, price: position.last_price ?? position.avg_buy_price }); }}>💰 Sell Position</button>}
                    {position.realized_profit && position.realized_profit !== 0 && <p className="cp-realized">Realized: <span style={{color: position.realized_profit >= 0 ? '#22c55e' : '#ef4444'}}>{position.realized_profit >= 0 ? '+' : ''}{position.realized_profit.toLocaleString()} gp</span></p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
