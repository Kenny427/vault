'use client';

import React from 'react';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function PriceSparkline(props: {
  values: Array<number | null | undefined>;
  width?: number;
  height?: number;
  stroke?: string;
}) {
  const width = props.width ?? 240;
  const height = props.height ?? 64;
  const stroke = props.stroke ?? 'var(--accent)';

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

  const points = series
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - minV) / range) * height;
      return `${clamp(x, 0, width)},${clamp(y, 0, height)}`;
    })
    .join(' ');

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
      aria-label="Price sparkline"
      role="img"
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}
