'use client';

import React from 'react';

type SignalTag = {
  label: string;
  value: string | number;
  variant: 'high' | 'medium' | 'low' | 'neutral';
  tooltip?: string;
};

type SignalsPanelProps = {
  spreadPct: number | null;
  spreadGp: number | null;
  volume5m: number | null;
  volume1h: number | null;
  volatility?: number | null;
  price: number | null;
  className?: string;
};

function SignalTag({ tag }: { tag: SignalTag }) {
  const variantStyles = {
    high: {
      bg: 'rgba(39, 194, 103, 0.18)',
      color: 'var(--accent)',
      border: 'rgba(39, 194, 103, 0.3)',
    },
    medium: {
      bg: 'rgba(245, 158, 11, 0.16)',
      color: '#fbbf24',
      border: 'rgba(245, 158, 11, 0.3)',
    },
    low: {
      bg: 'rgba(148, 163, 184, 0.15)',
      color: 'var(--muted)',
      border: 'rgba(148, 163, 184, 0.3)',
    },
    neutral: {
      bg: 'rgba(99, 102, 241, 0.15)',
      color: '#818cf8',
      border: 'rgba(99, 102, 241, 0.3)',
    },
  };

  const style = variantStyles[tag.variant];

  return (
    <span
      title={tag.tooltip}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.25rem 0.55rem',
        borderRadius: 6,
        fontSize: '0.75rem',
        fontWeight: 600,
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        cursor: tag.tooltip ? 'help' : 'default',
      }}
    >
      <span style={{ opacity: 0.7 }}>{tag.label}:</span>
      <span>{typeof tag.value === 'number' ? tag.value.toLocaleString() : tag.value}</span>
    </span>
  );
}

function calculateVolatility(prices: number[]): number | null {
  if (prices.length < 2) return null;
  
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  if (mean === 0) return null;
  
  const squaredDiffs = prices.map(p => Math.pow(p - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / prices.length;
  const stdDev = Math.sqrt(variance);
  
  return (stdDev / mean) * 100;
}

export default function SignalsPanel(props: SignalsPanelProps) {
  const { spreadPct, spreadGp, volume5m, volume1h, volatility, price, className } = props;

  const displayVolatility = volatility;

  const getSpreadVariant = (pct: number): 'high' | 'medium' | 'low' => {
    if (pct >= 5) return 'high';
    if (pct >= 2) return 'medium';
    return 'low';
  };

  const getVolumeVariant = (vol: number | null): 'high' | 'medium' | 'low' => {
    if (vol === null) return 'low';
    if (vol >= 10000) return 'high';
    if (vol >= 1000) return 'medium';
    return 'low';
  };

  const getVolatilityVariant = (vol: number | null): 'high' | 'medium' | 'low' => {
    if (vol === null) return 'low';
    if (vol >= 10) return 'high';
    if (vol >= 5) return 'medium';
    return 'low';
  };

  const formatVolume = (vol: number | null): string => {
    if (vol === null) return 'N/A';
    if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(1)}k`;
    return vol.toString();
  };

  const tags: SignalTag[] = [];

  // Spread tag
  if (spreadPct !== null && spreadGp !== null) {
    tags.push({
      label: 'Spread',
      value: `${spreadPct.toFixed(1)}%`,
      variant: getSpreadVariant(spreadPct),
      tooltip: `${spreadGp.toLocaleString()} gp spread`,
    });
  }

  // Volume tags
  if (volume5m !== null) {
    tags.push({
      label: 'Vol 5m',
      value: formatVolume(volume5m),
      variant: getVolumeVariant(volume5m),
      tooltip: 'Volume in last 5 minutes',
    });
  }

  if (volume1h !== null) {
    tags.push({
      label: 'Vol 1h',
      value: formatVolume(volume1h),
      variant: getVolumeVariant(volume1h),
      tooltip: 'Volume in last hour',
    });
  }

  // Volatility tag
  if (displayVolatility != null) {
    tags.push({
      label: 'Volatility',
      value: `${displayVolatility.toFixed(1)}%`,
      variant: getVolatilityVariant(displayVolatility),
      tooltip: 'Price volatility (coefficient of variation)',
    });
  }

  // Price stability indicator
  if (price !== null && displayVolatility != null) {
    const stabilityScore = displayVolatility < 3 ? 'Stable' : displayVolatility < 7 ? 'Moderate' : 'Volatile';
    tags.push({
      label: 'Stability',
      value: stabilityScore,
      variant: displayVolatility < 3 ? 'high' : displayVolatility < 7 ? 'medium' : 'low',
      tooltip: 'Price stability based on volatility',
    });
  }

  if (tags.length === 0) {
    return null;
  }

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        alignItems: 'center',
      }}
    >
      {tags.map((tag, i) => (
        <SignalTag key={i} tag={tag} />
      ))}
    </div>
  );
}

export function useVolatilityCalculator(prices: number[]) {
  return React.useMemo(() => calculateVolatility(prices), [prices]);
}
