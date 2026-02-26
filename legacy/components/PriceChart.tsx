'use client';

import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import { format } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';

interface ChartData {
  timestamp: number;
  price: number;
}

interface PriceChartProps {
  data: ChartData[];
  itemName: string;
  currentPrice: number;
  averagePrice: number;
  timeframeLabel?: string;
  showStats?: boolean;
  referenceLines?: {
    id?: string;
    value: number;
    label: string;
    color: string;
    dash?: string;
    defaultVisible?: boolean;
  }[];
  showLineToggles?: boolean;
  defaultLinesOn?: boolean;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload as { fullDate?: string; price?: number } | undefined;
  const price = typeof point?.price === 'number' ? point.price : (payload[0]?.value as number | undefined);

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/95 px-3 py-2 shadow-xl backdrop-blur">
      <div className="text-xs font-semibold text-slate-100">{point?.fullDate || label}</div>
      <div className="mt-1 text-sm text-slate-200">
        <span className="text-slate-400">Price:</span>{' '}
        <span className="font-semibold text-osrs-accent">
          {typeof price === 'number' ? `${price.toLocaleString()}gp` : '—'}
        </span>
      </div>
    </div>
  );
}

export default function PriceChart({
  data,
  itemName,
  currentPrice,
  averagePrice,
  timeframeLabel = '30 Day',
  showStats = true,
  referenceLines = [],
  showLineToggles = false,
  defaultLinesOn = true,
}: PriceChartProps) {
  const chartData = data.map(point => {
    const tsMs = point.timestamp * 1000;
    return {
      ...point,
      tsMs,
      // Keep preformatted labels for convenience
      date: format(new Date(tsMs), 'MMM dd'),
      fullDate: format(new Date(tsMs), 'MMM dd, HH:mm'),
    };
  });

  const prices = data.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min;

  // Calculate price changes
  const last7Days = data.slice(-168); // Approximately 7 days of hourly data
  const last30Days = data;

  const priceChange7d =
    last7Days.length > 1 ? ((currentPrice - last7Days[0].price) / last7Days[0].price) * 100 : 0;
  const priceChange30d =
    last30Days.length > 1 ? ((currentPrice - last30Days[0].price) / last30Days[0].price) * 100 : 0;

  const avg7d =
    last7Days.length > 0
      ? last7Days.reduce((sum, d) => sum + d.price, 0) / last7Days.length
      : currentPrice;

  // Volatility calculation
  const volatility = (range / averagePrice) * 100;

  // Volume indicator (based on price movement frequency)
  const priceChanges = prices.slice(1).map((price, i) => Math.abs(price - prices[i]));
  const avgChange = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
  const volumeIndicator = Math.min(100, (avgChange / averagePrice) * 1000);

  const extraLines = useMemo(() => {
    return referenceLines.map((line, index) => ({
      id: line.id || `${line.label}-${index}`,
      ...line,
      defaultVisible: line.defaultVisible ?? true,
    }));
  }, [referenceLines]);

  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>(() => ({
    current: defaultLinesOn,
    avg7d: defaultLinesOn,
    avg30d: defaultLinesOn,
    ...Object.fromEntries(extraLines.map((line) => [line.id, line.defaultVisible ?? defaultLinesOn])),
  }));

  useEffect(() => {
    setVisibleLines((prev) => {
      const next = { ...prev };
      let changed = false;
      extraLines.forEach((line) => {
        if (prev[line.id] === undefined) {
          next[line.id] = line.defaultVisible ?? defaultLinesOn;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraLines.length]);

  const toggleLine = (key: string) => {
    setVisibleLines((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="w-full space-y-4">
      {showStats && (
        <>
          {/* Price Overview Stats */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <div className="mb-1 text-xs font-medium text-slate-400">CURRENT PRICE</div>
              <div className="text-2xl font-bold text-osrs-accent">{currentPrice.toLocaleString()}gp</div>
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <div className="mb-1 text-xs font-medium text-slate-400">7D CHANGE</div>
              <div className={`text-2xl font-bold ${priceChange7d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {priceChange7d >= 0 ? '+' : ''}
                {priceChange7d.toFixed(1)}%
              </div>
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <div className="mb-1 text-xs font-medium text-slate-400">30D CHANGE</div>
              <div className={`text-2xl font-bold ${priceChange30d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {priceChange30d >= 0 ? '+' : ''}
                {priceChange30d.toFixed(1)}%
              </div>
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <div className="mb-1 text-xs font-medium text-slate-400">VOLATILITY</div>
              <div className="text-2xl font-bold text-blue-400">{volatility.toFixed(1)}%</div>
            </div>
          </div>

          {/* Detailed Price Stats */}
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-5">
              <div>
                <div className="mb-1 text-xs text-slate-400">{timeframeLabel} Average</div>
                <div className="font-semibold text-slate-100">{Math.round(averagePrice).toLocaleString()}gp</div>
              </div>
              <div>
                <div className="mb-1 text-xs text-slate-400">7D Average</div>
                <div className="font-semibold text-slate-100">{Math.round(avg7d).toLocaleString()}gp</div>
              </div>
              <div>
                <div className="mb-1 text-xs text-slate-400">{timeframeLabel} High</div>
                <div className="font-semibold text-green-400">{max.toLocaleString()}gp</div>
              </div>
              <div>
                <div className="mb-1 text-xs text-slate-400">{timeframeLabel} Low</div>
                <div className="font-semibold text-red-400">{min.toLocaleString()}gp</div>
              </div>
              <div>
                <div className="mb-1 text-xs text-slate-400">Trading Activity</div>
                <div className="font-semibold text-slate-100">
                  {volumeIndicator > 60 ? 'High' : volumeIndicator > 30 ? 'Medium' : 'Low'}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Chart */}
      <div className="rounded-lg border border-slate-700 bg-slate-900 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-100">
            {itemName} - {timeframeLabel} Price History
          </h3>
          {showLineToggles && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                onClick={() => toggleLine('current')}
                className={`rounded-full border px-2 py-1 transition-colors ${
                  visibleLines.current
                    ? 'border-slate-600 bg-slate-700 text-slate-100'
                    : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}
              >
                Current
              </button>
              <button
                onClick={() => toggleLine('avg7d')}
                className={`rounded-full border px-2 py-1 transition-colors ${
                  visibleLines.avg7d
                    ? 'border-slate-600 bg-slate-700 text-slate-100'
                    : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}
              >
                7D Avg
              </button>
              <button
                onClick={() => toggleLine('avg30d')}
                className={`rounded-full border px-2 py-1 transition-colors ${
                  visibleLines.avg30d
                    ? 'border-slate-600 bg-slate-700 text-slate-100'
                    : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}
              >
                30D Avg
              </button>
              {extraLines.map((line) => (
                <button
                  key={line.id}
                  onClick={() => toggleLine(line.id)}
                  className={`rounded-full border px-2 py-1 transition-colors ${
                    visibleLines[line.id]
                      ? 'border-slate-600 bg-slate-700 text-slate-100'
                      : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}
                >
                  {line.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="tsMs"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                stroke="#94a3b8"
                style={{ fontSize: '12px' }}
                tickFormatter={(ms: number) => format(new Date(ms), 'MMM dd')}
              />
              <YAxis
                stroke="#94a3b8"
                style={{ fontSize: '12px' }}
                domain={[min * 0.95, max * 1.05]}
                tickFormatter={(value) => `${value.toLocaleString()}gp`}
                width={84}
              />
              <Tooltip content={<ChartTooltip />} />
              {visibleLines.avg30d && (
                <ReferenceLine
                  y={averagePrice}
                  stroke="#d4a574"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{
                    value: `30D Avg: ${Math.round(averagePrice).toLocaleString()}gp`,
                    position: 'insideTopRight',
                    fill: '#d4a574',
                    fontSize: 13,
                    fontWeight: 'bold',
                  }}
                />
              )}
              {visibleLines.avg7d && (
                <ReferenceLine
                  y={avg7d}
                  stroke="#fbbf24"
                  strokeDasharray="3 3"
                  strokeWidth={2}
                  label={{
                    value: `7D Avg: ${Math.round(avg7d).toLocaleString()}gp`,
                    position: 'insideBottomRight',
                    fill: '#fbbf24',
                    fontSize: 13,
                    fontWeight: 'bold',
                  }}
                />
              )}
              {visibleLines.current && (
                <ReferenceLine
                  y={currentPrice}
                  stroke="#10b981"
                  strokeWidth={2}
                  label={{
                    value: `Current: ${currentPrice.toLocaleString()}gp`,
                    position: 'insideTopLeft',
                    fill: '#10b981',
                    fontSize: 13,
                    fontWeight: 'bold',
                  }}
                />
              )}
              {extraLines.map((line) =>
                visibleLines[line.id] ? (
                  <ReferenceLine
                    key={line.id}
                    y={line.value}
                    stroke={line.color}
                    strokeDasharray={line.dash || '4 4'}
                    strokeWidth={2}
                    label={{
                      value: line.label,
                      position: 'insideBottomLeft',
                      fill: line.color,
                      fontSize: 12,
                      fontWeight: 'bold',
                    }}
                  />
                ) : null
              )}
              <Area type="monotone" dataKey="price" fill="url(#priceGradient)" stroke="none" />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={false}
                isAnimationActive={true}
                animationDuration={800}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
