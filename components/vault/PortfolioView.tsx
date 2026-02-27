'use client';

import { useMemo } from 'react';

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
                }}
              >
                <div className="row-between" style={{ marginBottom: '0.35rem' }}>
                  <strong>{position.item_name}</strong>
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
