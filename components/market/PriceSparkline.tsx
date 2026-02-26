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
}) {
  const width = props.width ?? 240;
  const height = props.height ?? 64;
  const stroke = props.stroke ?? 'var(--accent)';
  const showArea = props.showArea ?? true;
  const showLastDot = props.showLastDot ?? true;
  const showGrid = props.showGrid ?? true;

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
