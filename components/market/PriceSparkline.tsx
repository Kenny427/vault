'use client';

import React, { useId } from 'react';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function PriceSparkline(props: {
  values: Array<number | null | undefined>;
  width?: number;
  height?: number;
  stroke?: string;
  showArea?: boolean;
  showLastDot?: boolean;
  showGrid?: boolean;
  timestep?: '5m' | '1h' | '6h' | '24h';
}) {
  const width = props.width ?? 240;
  const height = props.height ?? 140;
  const showArea = props.showArea ?? true;
  const showLastDot = props.showLastDot ?? true;
  const showGrid = props.showGrid ?? true;
  const timestep = props.timestep ?? '5m';

  const gradientId = useId();

  const series = props.values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));

  if (series.length < 2) {
    return (
      <div
        style={{
          width,
          height,
          borderRadius: 12,
          border: '1px solid var(--border)',
          background: 'var(--surface-2)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <span className="muted" style={{ fontSize: '0.8rem' }}>
          No chart data
        </span>
      </div>
    );
  }

  const minV = Math.min(...series);
  const maxV = Math.max(...series);
  const range = maxV - minV || 1;

  const stepX = width / (series.length - 1);

  const coords = series.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - minV) / range) * height;
    return { x: clamp(x, 0, width), y: clamp(y, 0, height), v };
  });

  const firstVal = series[0];
  const lastVal = series[series.length - 1];
  const isUp = lastVal >= firstVal;

  const stroke = props.stroke ?? (isUp ? 'var(--accent)' : 'var(--danger)');

  const points = coords.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPoints = showArea ? `${points} ${width},${height} 0,${height}` : '';
  const last = coords[coords.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        borderRadius: 12,
        border: '1px solid var(--border)',
        background: 'var(--surface-2)',
      }}
      aria-label={`Price sparkline. Min ${Math.round(minV).toLocaleString()}, max ${Math.round(maxV).toLocaleString()}, last ${Math.round(last?.v ?? 0).toLocaleString()}.`}
      role="img"
    >
      <defs>
        <linearGradient id={`spark-stroke-${gradientId}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.65} />
          <stop offset="55%" stopColor={stroke} stopOpacity={1} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0.85} />
        </linearGradient>
        <linearGradient id={`spark-area-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>

      {showGrid ? (
        <g stroke="var(--border)" strokeOpacity={0.55}>
          <line x1={0} y1={Math.round(height * 0.25)} x2={width} y2={Math.round(height * 0.25)} />
          <line x1={0} y1={Math.round(height * 0.5)} x2={width} y2={Math.round(height * 0.5)} />
          <line x1={0} y1={Math.round(height * 0.75)} x2={width} y2={Math.round(height * 0.75)} />
        </g>
      ) : null}

      {/* Y-axis price labels */}
      <g fill="var(--muted)" fontSize="8" fontWeight={500}>
        <text x={4} y={10} opacity={0.7}>
          {maxV >= 1000 ? `${(maxV / 1000).toFixed(1)}k` : Math.round(maxV)}
        </text>
        <text x={4} y={height / 2 + 3} opacity={0.5}>
          {range >= 1000 ? `${((maxV + minV) / 2 / 1000).toFixed(1)}k` : Math.round((maxV + minV) / 2)}
        </text>
        <text x={4} y={height - 4} opacity={0.7}>
          {minV >= 1000 ? `${(minV / 1000).toFixed(1)}k` : Math.round(minV)}
        </text>
      </g>

      {/* Time axis labels */}
      <g fill="var(--muted)" fontSize="9" fontWeight={500}>
        <text x={4} y={height - 4} opacity={0.7}>now</text>
        <text x={width / 2} y={height - 4} textAnchor="middle" opacity={0.5}>
          {timestep === '5m' ? '2.5m' : timestep === '1h' ? '30m' : timestep === '6h' ? '3h' : '12h'}
        </text>
        <text x={width - 4} y={height - 4} textAnchor="end" opacity={0.7}>
          {timestep === '5m' ? '5m ago' : timestep === '1h' ? '1h ago' : timestep === '6h' ? '6h ago' : '24h ago'}
        </text>
      </g>

      {showArea ? <polygon points={areaPoints} fill={`url(#spark-area-${gradientId})`} /> : null}

      <polyline
        fill="none"
        stroke={`url(#spark-stroke-${gradientId})`}
        strokeWidth={2.25}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />

      {showLastDot && last ? (
        <g>
          <circle cx={last.x} cy={last.y} r={4.5} fill={stroke} fillOpacity={0.25} />
          <circle cx={last.x} cy={last.y} r={2.25} fill={stroke} />
        </g>
      ) : null}
    </svg>
  );
}
