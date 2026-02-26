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
  referenceLines?: { id?: string; value: number; label: string; color: string; dash?: string; defaultVisible?: boolean }[];
  showLineToggles?: boolean;
  defaultLinesOn?: boolean;
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
  const formatCompact = (value: number) => {
    const abs = Math.abs(value);
    if (abs < 100_000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
    if (abs < 1_000_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    if (abs < 1_000_000_000) return `${(value / 1_000_000).toFixed(2).replace(/\.00$/, '').replace(/\.0$/, '')}M`;
    return `${(value / 1_000_000_000).toFixed(2).replace(/\.00$/, '').replace(/\.0$/, '')}B`;
  };

  const formatGp = (value: number) => `${formatCompact(Math.round(value))}gp`;

  const chartData = data.map((point) => {
    const tsMs = point.timestamp * 1000;
    return {
      ...point,
      tsMs,
      date: format(new Date(tsMs), 'MMM dd'),
      fullDate: format(new Date(tsMs), 'MMM dd, HH:mm'),
    };
  });

  const prices = data.map(d => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min;
  
  // Calculate price changes
  const last7Days = data.slice(-168); // Approximately 7 days of hourly data
  const last30Days = data;
  
  const priceChange7d = last7Days.length > 1 
    ? ((currentPrice - last7Days[0].price) / last7Days[0].price) * 100 
    : 0;
  const priceChange30d = last30Days.length > 1
    ? ((currentPrice - last30Days[0].price) / last30Days[0].price) * 100
    : 0;
  
  const avg7d = last7Days.length > 0
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
              <div className="text-slate-400 text-xs font-medium mb-1">CURRENT PRICE</div>
              <div className="text-2xl font-bold text-osrs-accent">{formatGp(currentPrice)}</div>
            </div>
            
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
              <div className="text-slate-400 text-xs font-medium mb-1">7D CHANGE</div>
              <div className={`text-2xl font-bold ${priceChange7d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {priceChange7d >= 0 ? '+' : ''}{priceChange7d.toFixed(1)}%
              </div>
            </div>
            
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
              <div className="text-slate-400 text-xs font-medium mb-1">30D CHANGE</div>
              <div className={`text-2xl font-bold ${priceChange30d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {priceChange30d >= 0 ? '+' : ''}{priceChange30d.toFixed(1)}%
              </div>
            </div>
            
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
              <div className="text-slate-400 text-xs font-medium mb-1">VOLATILITY</div>
              <div className="text-2xl font-bold text-blue-400">{volatility.toFixed(1)}%</div>
            </div>
          </div>

          {/* Detailed Price Stats */}
          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <div className="text-slate-400 text-xs mb-1">{timeframeLabel} Average</div>
                <div className="text-slate-100 font-semibold">{formatGp(averagePrice)}</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs mb-1">7D Average</div>
                <div className="text-slate-100 font-semibold">{formatGp(avg7d)}</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs mb-1">{timeframeLabel} High</div>
                <div className="text-green-400 font-semibold">{formatGp(max)}</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs mb-1">{timeframeLabel} Low</div>
                <div className="text-red-400 font-semibold">{formatGp(min)}</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs mb-1">Trading Activity</div>
                <div className="text-slate-100 font-semibold">
                  {volumeIndicator > 60 ? 'High' : volumeIndicator > 30 ? 'Medium' : 'Low'}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Chart */}
      <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold text-slate-100">{itemName} - {timeframeLabel} Price History</h3>
          {showLineToggles && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                onClick={() => toggleLine('current')}
                className={`px-2 py-1 rounded-full border transition-colors ${
                  visibleLines.current
                    ? 'bg-slate-700 border-slate-600 text-slate-100'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                Current
              </button>
              <button
                onClick={() => toggleLine('avg7d')}
                className={`px-2 py-1 rounded-full border transition-colors ${
                  visibleLines.avg7d
                    ? 'bg-slate-700 border-slate-600 text-slate-100'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                7D Avg
              </button>
              <button
                onClick={() => toggleLine('avg30d')}
                className={`px-2 py-1 rounded-full border transition-colors ${
                  visibleLines.avg30d
                    ? 'bg-slate-700 border-slate-600 text-slate-100'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                30D Avg
              </button>
              {extraLines.map((line) => (
                <button
                  key={line.id}
                  onClick={() => toggleLine(line.id)}
                  className={`px-2 py-1 rounded-full border transition-colors ${
                    visibleLines[line.id]
                      ? 'bg-slate-700 border-slate-600 text-slate-100'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  {line.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="w-full h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
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
                tickFormatter={(value) => formatCompact(value)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '12px',
                }}
                labelStyle={{ color: '#e2e8f0', fontWeight: 'bold', marginBottom: '4px' }}
                formatter={(value: number) => [formatGp(value), 'Price']}
                labelFormatter={(ms) => {
                  const num = typeof ms === 'number' ? ms : Number(ms);
                  return Number.isFinite(num) ? format(new Date(num), 'MMM dd, HH:mm') : String(ms);
                }}
              />
              {visibleLines.avg30d && (
                <ReferenceLine
                  y={averagePrice}
                  stroke="#d4a574"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{ 
                    value: `30D Avg: ${formatGp(averagePrice)}`, 
                    position: 'insideTopRight', 
                    fill: '#d4a574', 
                    fontSize: 13,
                    fontWeight: 'bold'
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
                    value: `7D Avg: ${formatGp(avg7d)}`, 
                    position: 'insideBottomRight', 
                    fill: '#fbbf24', 
                    fontSize: 13,
                    fontWeight: 'bold'
                  }}
                />
              )}
              {visibleLines.current && (
                <ReferenceLine
                  y={currentPrice}
                  stroke="#10b981"
                  strokeWidth={2}
                  label={{ 
                    value: `Current: ${formatGp(currentPrice)}`, 
                    position: 'insideTopLeft', 
                    fill: '#10b981', 
                    fontSize: 13,
                    fontWeight: 'bold'
                  }}
                />
              )}
              {extraLines.map((line) => (
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
              ))}
              <Area
                type="monotone"
                dataKey="price"
                fill="url(#priceGradient)"
                stroke="none"
              />
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
