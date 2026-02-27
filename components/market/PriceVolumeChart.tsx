'use client';

import React, { useId, useMemo } from 'react';

type TimeSeriesPoint = {
  timestamp: number;
  avgHighPrice?: number | null;
  avgLowPrice?: number | null;
  highPriceVolume?: number | null;
  lowPriceVolume?: number | null;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

interface PriceVolumeChartProps {
  data: TimeSeriesPoint[];
  width?: number;
  height?: number;
  timestep?: '5m' | '1h' | '6h' | '24h';
  priceColor?: string;
  volumeColor?: string;
}

export default function PriceVolumeChart(props: PriceVolumeChartProps) {
  const width = props.width ?? 700;
  const height = props.height ?? 320;
  const timestep = props.timestep ?? '1h';
  const priceColor = props.priceColor ?? 'var(--accent)';
  const volumeColor = props.volumeColor ?? 'rgba(39, 194, 103, 0.25)';

  const gradientId = useId();

  // Process data
  const { priceSeries, volumeSeries, priceMin, priceMax, volumeMax, timeLabels } = useMemo(() => {
    const validPoints = props.data.filter(
      (p) => typeof p.avgHighPrice === 'number' && Number.isFinite(p.avgHighPrice)
    );

    if (validPoints.length < 2) {
      return {
        priceSeries: [],
        volumeSeries: [],
        priceMin: 0,
        priceMax: 0,
        volumeMax: 0,
        timeLabels: { start: '', middle: '', end: '' },
      };
    }

    // Calculate prices
    const prices = validPoints.map((p) => p.avgHighPrice ?? 0);
    const pMin = Math.min(...prices);
    const pMax = Math.max(...prices);

    // Calculate volumes (combine high and low)
    const volumes = validPoints.map(
      (p) => (p.highPriceVolume ?? 0) + (p.lowPriceVolume ?? 0)
    );
    const vMax = Math.max(...volumes, 1);

    // Generate time labels based on timestep
    const now = new Date();
    let startLabel = '';
    let middleLabel = '';
    let endLabel = '';

    if (timestep === '5m') {
      const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const twoMinAgo = new Date(now.getTime() - 2 * 60 * 1000);
      startLabel = `${fiveMinAgo.getHours()}:${String(fiveMinAgo.getMinutes()).padStart(2, '0')}`;
      middleLabel = `${twoMinAgo.getHours()}:${String(twoMinAgo.getMinutes()).padStart(2, '0')}`;
      endLabel = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    } else if (timestep === '1h') {
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
      startLabel = `${oneHourAgo.getHours()}:${String(oneHourAgo.getMinutes()).padStart(2, '0')}`;
      middleLabel = `${thirtyMinAgo.getHours()}:${String(thirtyMinAgo.getMinutes()).padStart(2, '0')}`;
      endLabel = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    } else if (timestep === '6h') {
      const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      startLabel = `${sixHoursAgo.getHours()}:00`;
      middleLabel = `${threeHoursAgo.getHours()}:00`;
      endLabel = `${now.getHours()}:00`;
    } else {
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
      startLabel = `${oneDayAgo.getHours()}:00`;
      middleLabel = `${twelveHoursAgo.getHours()}:00`;
      endLabel = `${now.getHours()}:00`;
    }

    return {
      priceSeries: prices,
      volumeSeries: volumes,
      priceMin: pMin,
      priceMax: pMax,
      volumeMax: vMax,
      timeLabels: { start: startLabel, middle: middleLabel, end: endLabel },
    };
  }, [props.data, timestep]);

  if (priceSeries.length < 2) {
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
        <span className="muted" style={{ fontSize: '0.8rem' }}>No chart data available</span>
      </div>
    );
  }

  // Chart layout calculations
  const priceChartHeight = height * 0.7;
  const volumeHeight = height * 0.2;
  const volumeTop = height - volumeHeight - 10;
  const paddingLeft = 55;
  const paddingRight = 15;
  const paddingTop = 15;
  const chartWidth = width - paddingLeft - paddingRight;

  // Calculate price coordinates
  const priceStepX = chartWidth / (priceSeries.length - 1);
  const priceCoords = priceSeries.map((v, i) => {
    const x = paddingLeft + i * priceStepX;
    const y = paddingTop + priceChartHeight - ((v - priceMin) / (priceMax - priceMin)) * priceChartHeight;
    return { x: clamp(x, paddingLeft, width - paddingRight), y: clamp(y, paddingTop, paddingTop + priceChartHeight), v };
  });

  // Calculate volume coordinates (bar chart style)
  const volumeStepX = chartWidth / volumeSeries.length;
  const volumeCoords = volumeSeries.map((v, i) => {
    const x = paddingLeft + i * volumeStepX;
    const barWidth = volumeStepX * 0.7;
    const barHeight = (v / volumeMax) * volumeHeight;
    const y = volumeTop + volumeHeight - barHeight;
    return { x, y, width: barWidth, height: barHeight, v };
  });

  const firstPrice = priceSeries[0];
  const lastPrice = priceSeries[priceSeries.length - 1];
  const isUp = lastPrice >= firstPrice;

  const stroke = isUp ? priceColor : 'var(--danger)';
  const pricePoints = priceCoords.map((p) => `${p.x},${p.y}`).join(' ');
  const priceAreaPoints = `${pricePoints} ${width - paddingRight},${paddingTop + priceChartHeight} ${paddingLeft},${paddingTop + priceChartHeight}`;

  // Format price labels
  const formatPrice = (v: number) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(2)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return Math.round(v).toString();
  };

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
      aria-label={`Price and volume chart. Price range ${formatPrice(priceMin)} to ${formatPrice(priceMax)}.`}
      role="img"
    >
      <defs>
        <linearGradient id={`pvc-price-stroke-${gradientId}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.6} />
          <stop offset="55%" stopColor={stroke} stopOpacity={1} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0.8} />
        </linearGradient>
        <linearGradient id={`pvc-price-area-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.25} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      <g stroke="var(--border)" strokeOpacity={0.4}>
        <line x1={paddingLeft} y1={paddingTop + priceChartHeight * 0.25} x2={width - paddingRight} y2={paddingTop + priceChartHeight * 0.25} />
        <line x1={paddingLeft} y1={paddingTop + priceChartHeight * 0.5} x2={width - paddingRight} y2={paddingTop + priceChartHeight * 0.5} />
        <line x1={paddingLeft} y1={paddingTop + priceChartHeight * 0.75} x2={width - paddingRight} y2={paddingTop + priceChartHeight * 0.75} />
      </g>

      {/* Y-axis price labels */}
      <g fill="var(--muted)" fontSize="9" fontWeight={500}>
        <text x={paddingLeft - 5} y={paddingTop + 3} textAnchor="end" opacity={0.8}>
          {formatPrice(priceMax)}
        </text>
        <text x={paddingLeft - 5} y={paddingTop + priceChartHeight * 0.5 + 3} textAnchor="end" opacity={0.5}>
          {formatPrice((priceMax + priceMin) / 2)}
        </text>
        <text x={paddingLeft - 5} y={paddingTop + priceChartHeight - 3} textAnchor="end" opacity={0.8}>
          {formatPrice(priceMin)}
        </text>
      </g>

      {/* Volume bars */}
      <g fill={volumeColor}>
        {volumeCoords.map((bar, i) => (
          <rect
            key={i}
            x={bar.x + (volumeStepX - bar.width) / 2}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            rx={2}
          />
        ))}
      </g>

      {/* Volume axis label */}
      <text
        x={paddingLeft - 5}
        y={volumeTop + volumeHeight / 2 + 3}
        textAnchor="end"
        fill="var(--muted)"
        fontSize="8"
        fontWeight={500}
        opacity={0.6}
      >
        Vol
      </text>

      {/* Price area fill */}
      <polygon points={priceAreaPoints} fill={`url(#pvc-price-area-${gradientId})`} />

      {/* Price line */}
      <polyline
        fill="none"
        stroke={`url(#pvc-price-stroke-${gradientId})}`}
        strokeWidth={2.25}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={pricePoints}
      />

      {/* Last price dot */}
      {priceCoords[priceCoords.length - 1] && (
        <g>
          <circle
            cx={priceCoords[priceCoords.length - 1].x}
            cy={priceCoords[priceCoords.length - 1].y}
            r={5}
            fill={stroke}
            fillOpacity={0.2}
          />
          <circle
            cx={priceCoords[priceCoords.length - 1].x}
            cy={priceCoords[priceCoords.length - 1].y}
            r={2.5}
            fill={stroke}
          />
        </g>
      )}

      {/* Time axis labels */}
      <g fill="var(--muted)" fontSize="9" fontWeight={500}>
        <text x={paddingLeft} y={height - 4} opacity={0.7}>{timeLabels.start}</text>
        <text x={paddingLeft + chartWidth / 2} y={height - 4} textAnchor="middle" opacity={0.5}>{timeLabels.middle}</text>
        <text x={width - paddingRight} y={height - 4} textAnchor="end" opacity={0.7}>{timeLabels.end}</text>
      </g>
    </svg>
  );
}
