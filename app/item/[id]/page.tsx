'use client';

import { useEffect, useState, use, useMemo } from 'react';
import PriceVolumeChart from '@/components/market/PriceVolumeChart';
import PriceSparkline from '@/components/market/PriceSparkline';
import SignalsPanel from '@/components/market/SignalsPanel';
import Link from 'next/link';
import Image from 'next/image';

// Helper to get OSRS Wiki URL for an item
function getWikiUrl(itemName: string): string {
  const encoded = encodeURIComponent(itemName.replace(/ /g, '_'));
  return `https://oldschool.runescape.wiki/w/${encoded}`;
}

type ItemDetails = {
  item_id: number;
  name: string;
  members: boolean;
  buy_limit: number | null;
  alch_value: number | null;
  icon_url: string | null;
};

type PriceData = {
  last_price: number;
  buy_at: number;
  sell_at: number;
  margin: number;
  spread_pct: number;
  volume_5m: number | null;
  volume_1h: number | null;
  freshness?: number | null;
};

type TimeSeriesPoint = {
  timestamp: number;
  avgHighPrice?: number | null;
  avgLowPrice?: number | null;
  highPriceVolume?: number | null;
  lowPriceVolume?: number | null;
};

export default function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const itemId = Number(id);

  const [item, setItem] = useState<ItemDetails | null>(null);
  const [price, setPrice] = useState<PriceData | null>(null);
  const [timeseries, setTimeseries] = useState<TimeSeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timestep, setTimestep] = useState<'5m' | '1h' | '6h' | '24h'>('1h');
  const [showFlipCalc, setShowFlipCalc] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'signals' | 'history' | 'notes'>('overview');
  const [notes, setNotes] = useState('');

  // Flip calculator state
  const [flipQty, setFlipQty] = useState<number>(1);
  const [flipBuyPrice, setFlipBuyPrice] = useState<string>('');
  const [flipSellPrice, setFlipSellPrice] = useState<string>('');

  const [addingWatch, setAddingWatch] = useState(false);
  const [addedToWatch, setAddedToWatch] = useState(false);

  // Calculate freshness (minutes since last update)
  const freshnessMinutes = useMemo(() => {
    if (price?.freshness !== undefined && price?.freshness !== null) {
      return price.freshness;
    }
    return null;
  }, [price?.freshness]);

  const freshnessDisplay = useMemo(() => {
    if (freshnessMinutes === null) return '—';
    if (freshnessMinutes < 1) return '<1m';
    if (freshnessMinutes < 60) return `${freshnessMinutes}m`;
    const hours = Math.floor(freshnessMinutes / 60);
    return `${hours}h ${freshnessMinutes % 60}m`;
  }, [freshnessMinutes]);

  // Flip calculation
  const flipCalc = useMemo(() => {
    const qty = flipQty > 0 ? flipQty : 0;
    const buyPrice = Number(flipBuyPrice) || 0;
    const sellPrice = Number(flipSellPrice) || 0;

    if (qty === 0 || buyPrice === 0 || sellPrice === 0) return null;

    const totalCost = qty * buyPrice;
    const totalRevenue = qty * sellPrice;
    const profit = totalRevenue - totalCost;
    const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;

    return { qty, buyPrice, sellPrice, totalCost, totalRevenue, profit, roi };
  }, [flipQty, flipBuyPrice, flipSellPrice]);

  // Add to watchlist
  const handleAddToWatchlist = async () => {
    if (!item || addingWatch || addedToWatch) return;
    setAddingWatch(true);
    try {
      const res = await fetch('/api/theses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.item_id, item_name: item.name }),
      });
      if (res.ok) {
        setAddedToWatch(true);
      }
    } finally {
      setAddingWatch(false);
    }
  };

  // Extract sparkline values from timeseries
  const sparklineValues = useMemo(() => {
    if (timeseries.length === 0) return [];
    return timeseries.map(t => t.avgHighPrice).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  }, [timeseries]);

  // Determine sparkline color based on trend
  const sparklineColor = useMemo(() => {
    if (sparklineValues.length < 2) return undefined;
    const first = sparklineValues[0];
    const last = sparklineValues[sparklineValues.length - 1];
    return last >= first ? '#22c55e' : '#ef4444';
  }, [sparklineValues]);
  const { volatility, priceChange, high24h, low24h, avgPrice, priceRangePct } = useMemo(() => {
    if (timeseries.length < 2) return { volatility: null, priceChange: null, high24h: null, low24h: null, avgPrice: null, priceRangePct: null };
    
    const prices = timeseries
      .map((t) => t.avgHighPrice)
      .filter((p): p is number => typeof p === 'number' && Number.isFinite(p));
    
    if (prices.length < 2) return { volatility: null, priceChange: null, high24h: null, low24h: null, avgPrice: null, priceRangePct: null };
    
    // Calculate volatility (coefficient of variation)
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    let volatility: number | null = null;
    if (mean !== 0) {
      const squaredDiffs = prices.map((p) => Math.pow(p - mean, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / prices.length;
      const stdDev = Math.sqrt(variance);
      volatility = (stdDev / mean) * 100;
    }
    
    // Calculate price change
    const first = prices[0];
    const last = prices[prices.length - 1];
    const priceChange = ((last - first) / first) * 100;
    
    // Calculate 24h high/low from timeseries
    const high24h = Math.max(...prices);
    const low24h = Math.min(...prices);
    
    // Calculate average price
    const avgPrice = mean;
    
    // Calculate range percentage
    const priceRangePct = low24h > 0 ? ((high24h - low24h) / low24h) * 100 : null;
    
    return { volatility, priceChange, high24h, low24h, avgPrice, priceRangePct };
  }, [timeseries]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        // Fetch item details
        const itemRes = await fetch(`/api/items/${itemId}`);
        if (itemRes.ok) {
          const itemData = await itemRes.json();
          setItem(itemData.item);
        }

        // Fetch current price
        const priceRes = await fetch(`/api/market/price/${itemId}`);
        if (priceRes.ok) {
          const priceData = await priceRes.json();
          setPrice(priceData);
        }

        // Fetch timeseries
        const tsRes = await fetch(`/api/market/timeseries?id=${itemId}&timestep=${timestep}`);
        if (tsRes.ok) {
          const tsData = await tsRes.json();
          setTimeseries(tsData.data || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }

    if (itemId) {
      void loadData();
    }
  }, [itemId, timestep]);

  if (loading) {
    return (
      <main style={{ padding: '1rem' }}>
        <p className="muted">Loading item...</p>
      </main>
    );
  }

  if (error || !item) {
    return (
      <main style={{ padding: '1rem' }}>
        <Link href="/" style={{ color: '#f5c518', textDecoration: 'underline' }}>← Back to Vault</Link>
        <p style={{ color: '#ef4444', marginTop: '1rem' }}>Error: {error || 'Item not found'}</p>
      </main>
    );
  }

  return (
    <main style={{ padding: '1rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#f5c518', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← Back to Vault
        </Link>
      </div>

      {/* Two-column layout: Main Content + Right Stats Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1rem' }}>
        {/* Left Column - Main Content */}
        <div style={{ minWidth: 0 }}>
          {/* Item Header */}
          <div className="card" style={{ marginBottom: '0.75rem', background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}>
        <div className="row" style={{ gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {item.icon_url && (
            <Image src={item.icon_url} alt={item.name} width={64} height={64} style={{ imageRendering: 'pixelated' }} unoptimized />
          )}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f5c518' }}>{item.name}</h1>
              <button
                onClick={() => {
                  const info = price ? `${item.name}: ${price.last_price.toLocaleString()}gp (${price.spread_pct.toFixed(1)}% spread)` : item.name;
                  navigator.clipboard.writeText(info);
                }}
                className="btn btn-secondary"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                title="Copy item info"
              >
                📋
              </button>
            </div>
            <div className="row" style={{ gap: '0.75rem', marginTop: '0.25rem' }}>
              {item.members && (
                <span style={{ background: '#22c55e', color: '#000', padding: '0.1rem 0.4rem', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700 }}>
                  MEMBERS
                </span>
              )}
              {item.buy_limit && (
                <span className="muted" style={{ fontSize: '0.85rem' }}>Buy limit: {item.buy_limit.toLocaleString()}</span>
              )}
              {item.alch_value && (
                <span className="muted" style={{ fontSize: '0.85rem' }}>Alch: {item.alch_value.toLocaleString()} gp</span>
              )}
            </div>
          </div>
          {/* Wiki link + sparkline row */}
          <div className="row" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
            {sparklineValues.length > 3 && (
              <div style={{ opacity: 0.9 }}>
                <PriceSparkline 
                  values={sparklineValues} 
                  width={140} 
                  height={50} 
                  stroke={sparklineColor}
                  showArea={true}
                  showLastDot={true}
                  showGrid={false}
                  timestep={timestep}
                />
              </div>
            )}
            {item && (
              <a
                href={getWikiUrl(item.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.35rem 0.65rem',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
                title="Open OSRS Wiki"
              >
                📖 Wiki
              </a>
            )}
            <button
              onClick={() => {
                setFlipBuyPrice(String(price?.buy_at || ''));
                setFlipSellPrice(String(price?.sell_at || ''));
                setFlipQty(1);
                setShowFlipCalc(true);
              }}
              className="btn btn-secondary"
              style={{
                fontSize: '0.75rem',
                padding: '0.35rem 0.65rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
              title="Flip Calculator"
            >
              🧮 Flip
            </button>
          </div>
        </div>
        <div style={{ marginTop: '0.75rem' }}>
          {addedToWatch ? (
            <span style={{ fontSize: '0.85rem', color: '#22c55e', fontWeight: 600 }}>✓ Added to Watchlist</span>
          ) : (
            <button
              onClick={handleAddToWatchlist}
              disabled={addingWatch}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--muted)',
                padding: '0.3rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: addingWatch ? 'not-allowed' : 'pointer',
                opacity: addingWatch ? 0.6 : 1,
              }}
            >
              {addingWatch ? 'Adding...' : '+ Add to Watchlist'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs - Segmented Control */}
      <div className="card" style={{ marginBottom: '0.75rem', padding: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--surface-2)', padding: '0.25rem', borderRadius: 8 }}>
          {(['overview', 'signals', 'history', 'notes'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '0.5rem 0.75rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: activeTab === tab ? 'var(--surface)' : 'transparent',
                color: activeTab === tab ? 'var(--text)' : 'var(--muted)',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.15s ease',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && price && (
      <div>
        {/* Price Info Grid */}
      {price && (
        <div className="grid grid-2" style={{ gap: '0.5rem', marginBottom: '1rem' }}>
          <article className="card">
            <p className="muted" style={{ fontSize: '0.75rem' }}>Current Price</p>
            <p style={{ fontSize: '1.3rem', fontWeight: 900 }}>{price.last_price.toLocaleString()} gp</p>
            {priceChange !== null && (
              <p style={{ 
                fontSize: '0.85rem', 
                fontWeight: 700, 
                color: priceChange >= 0 ? '#22c55e' : '#ef4444'
              }}>
                {priceChange >= 0 ? '↑' : '↓'} {Math.abs(priceChange).toFixed(1)}% ({timestep})
              </p>
            )}
          </article>
          <article className="card">
            <p className="muted" style={{ fontSize: '0.75rem' }}>5m Volume</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: price.volume_5m && price.volume_5m > 0 ? '#3b82f6' : 'var(--muted)' }}>
              {price.volume_5m ? price.volume_5m.toLocaleString() : '—'} trades
            </p>
            <p className="muted" style={{ fontSize: '0.65rem' }}>Last 5 minutes</p>
          </article>
          <article className="card">
            <p className="muted" style={{ fontSize: '0.75rem' }}>1h Volume</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: price.volume_1h && price.volume_1h > 0 ? '#8b5cf6' : 'var(--muted)' }}>
              {price.volume_1h ? price.volume_1h.toLocaleString() : '—'} trades
            </p>
            <p className="muted" style={{ fontSize: '0.65rem' }}>Last hour</p>
          </article>
          {high24h !== null && low24h !== null && (
            <article className="card">
              <p className="muted" style={{ fontSize: '0.75rem' }}>24h Range</p>
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                <span style={{ color: '#22c55e' }}>{high24h.toLocaleString()}</span>
                <span className="muted" style={{ margin: '0 0.4rem' }}>→</span>
                <span style={{ color: '#ef4444' }}>{low24h.toLocaleString()}</span>
              </div>
              <p className="muted" style={{ fontSize: '0.7rem' }}>
                {((high24h - low24h) / low24h * 100).toFixed(1)}% range
              </p>
            </article>
          )}
          <article className="card">
            <p className="muted" style={{ fontSize: '0.75rem' }}>Margin</p>
            <p style={{ fontSize: '1.3rem', fontWeight: 900, color: '#22c55e' }}>{price.margin.toLocaleString()} gp</p>
          </article>
          <article className="card">
            <p className="muted" style={{ fontSize: '0.75rem' }}>Buy At</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>{price.buy_at.toLocaleString()} gp</p>
          </article>
          <article className="card">
            <p className="muted" style={{ fontSize: '0.75rem' }}>Sell At</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>{price.sell_at.toLocaleString()} gp</p>
          </article>
          <article className="card">
            <p className="muted" style={{ fontSize: '0.75rem' }}>Spread</p>
            <p style={{ fontSize: '1.3rem', fontWeight: 900, color: price.spread_pct <= 1 ? '#22c55e' : price.spread_pct <= 3 ? '#f5c518' : '#ef4444' }}>
              {price.spread_pct.toFixed(1)}%
            </p>
            <p className="muted" style={{ fontSize: '0.65rem' }}>{price.spread_pct <= 1 ? 'Great' : price.spread_pct <= 3 ? 'OK' : 'High'} spread</p>
          </article>
        </div>
      )}

      {/* Price Statistics */}
      {avgPrice !== null && high24h !== null && low24h !== null && priceRangePct !== null && (
        <article className="card" style={{ marginBottom: '1rem', background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.6rem' }}>
            📊 {timestep} Price Statistics
          </h2>
          <div className="grid grid-3" style={{ gap: '0.75rem' }}>
            <div style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
              <p className="muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Average</p>
              <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f5c518' }}>{Math.round(avgPrice).toLocaleString()} gp</p>
            </div>
            <div style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
              <p className="muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Highest</p>
              <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#22c55e' }}>{high24h.toLocaleString()} gp</p>
            </div>
            <div style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
              <p className="muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lowest</p>
              <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ef4444' }}>{low24h.toLocaleString()} gp</p>
            </div>
          </div>
          <div style={{ marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="muted" style={{ fontSize: '0.75rem' }}>Range Width</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: priceRangePct > 10 ? '#f59e0b' : '#9ab4aa' }}>
              {priceRangePct.toFixed(1)}%
            </span>
          </div>
        </article>
      )}

      {/* Signals Panel */}
      {price && (
        <article className="card" style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.75rem' }}>Market Signals</h2>
          <SignalsPanel
            spreadPct={price.spread_pct}
            spreadGp={price.margin}
            volume5m={price.volume_5m}
            volume1h={price.volume_1h}
            volatility={volatility}
            price={price.last_price}
          />
        </article>
      )}

      {/* Price + Volume Chart */}
      <article className="card" style={{ marginBottom: '1rem' }}>
        <div className="row-between" style={{ marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Price & Volume</h2>
          <div className="row" style={{ gap: '0.25rem' }}>
            {(['5m', '1h', '6h', '24h'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimestep(t)}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  background: timestep === t ? '#f5c518' : 'transparent',
                  color: timestep === t ? '#000' : 'var(--muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: timestep === t ? 700 : 400,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (timestep !== t) {
                    e.currentTarget.style.background = 'var(--surface-2)';
                    e.currentTarget.style.borderColor = '#f5c518';
                  }
                }}
                onMouseLeave={(e) => {
                  if (timestep !== t) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {timeseries.length > 0 ? (
          <PriceVolumeChart 
            data={timeseries} 
            width={700} 
            height={320} 
            timestep={timestep} 
          />
        ) : (
          <div style={{ height: 320, display: 'grid', placeItems: 'center', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface-2)' }}>
            <p className="muted">No chart data available</p>
          </div>
        )}
      </article>
      </div>
      )}

      {activeTab === 'signals' && price && (
        <article className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.75rem' }}>Market Signals</h2>
          <SignalsPanel
            spreadPct={price.spread_pct}
            spreadGp={price.margin}
            volume5m={price.volume_5m}
            volume1h={price.volume_1h}
            volatility={volatility}
            price={price.last_price}
          />
        </article>
      )}

      {activeTab === 'history' && (
        <article className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.75rem' }}>Price History</h2>
          <p className="muted" style={{ fontSize: '0.85rem' }}>Historical price data for {item.name}.</p>
          {timeseries.length > 0 ? (
            <div style={{ marginTop: '1rem', maxHeight: '400px', overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--muted)' }}>Time</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--muted)' }}>High</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--muted)' }}>Low</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--muted)' }}>Vol</th>
                  </tr>
                </thead>
                <tbody>
                  {timeseries.slice(-20).reverse().map((point, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.4rem 0.5rem' }}>{new Date(point.timestamp).toLocaleString()}</td>
                      <td style={{ textAlign: 'right', padding: '0.4rem 0.5rem', color: '#22c55e' }}>{point.avgHighPrice?.toLocaleString() ?? '—'}</td>
                      <td style={{ textAlign: 'right', padding: '0.4rem 0.5rem', color: '#ef4444' }}>{point.avgLowPrice?.toLocaleString() ?? '—'}</td>
                      <td style={{ textAlign: 'right', padding: '0.4rem 0.5rem', color: '#3b82f6' }}>{point.highPriceVolume ? point.highPriceVolume.toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted" style={{ marginTop: '1rem' }}>No history available</p>
          )}
        </article>
      )}

      {activeTab === 'notes' && (
        <article className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.75rem' }}>📝 Notes</h2>
          <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>Keep research notes for {item.name}.</p>
          <textarea 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)} 
            placeholder="Add your notes here..." 
            style={{ 
              width: '100%', 
              minHeight: '300px', 
              padding: '0.75rem', 
              background: 'var(--surface-2)', 
              border: '1px solid var(--border)', 
              borderRadius: 8, 
              color: 'var(--text)', 
              fontSize: '0.9rem', 
              fontFamily: 'inherit', 
              resize: 'vertical' 
            }} 
          />
        </article>
      )}
        </div>

        {/* Right Column - Intelligence Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* AI Insight Card */}
          <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', border: '1px solid #334155', borderRadius: 12, padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ color: '#06b6d4', fontFamily: 'monospace', fontSize: '0.7rem' }}>{'◆'}</span>
              <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f5c518', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Market Analysis</h3>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', lineHeight: 1.5, marginBottom: '0.5rem' }}>
              Low spread detected with healthy trading volume. Potential opportunity for quick flips. Monitor for trend continuation.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.65rem', textTransform: 'uppercase' }}>Confidence</span>
              <span style={{ color: '#22c55e', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'monospace' }}>78%</span>
            </div>
          </div>

          {/* Quick Stats Panel */}
          <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', border: '1px solid #334155', borderRadius: 12, padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ color: '#06b6d4', fontFamily: 'monospace', fontSize: '0.7rem' }}>{'>'}</span>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f5c518', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Intelligence Panel</h3>
            </div>
            
            {/* Spread */}
            <div style={{ marginBottom: '0.6rem' }}>
              <p style={{ color: '#64748b', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Spread</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#e2e8f0', fontFamily: 'monospace' }}>{price?.spread_pct.toFixed(1) ?? '—'}%</span>
                <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: 4, background: price && price.spread_pct <= 1 ? 'rgba(34,197,94,0.2)' : price && price.spread_pct <= 3 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)', color: price && price.spread_pct <= 1 ? '#22c55e' : price && price.spread_pct <= 3 ? '#f59e0b' : '#ef4444' }}>
                  {price && price.spread_pct <= 1 ? 'OPTIMAL' : price && price.spread_pct <= 3 ? 'ACCEPTABLE' : 'HIGH'}
                </span>
              </div>
            </div>

            {/* 5m Volume */}
            <div style={{ marginBottom: '0.6rem', paddingBottom: '0.6rem', borderBottom: '1px solid #334155' }}>
              <p style={{ color: '#64748b', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vol 5m</p>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: price?.volume_5m && price.volume_5m > 0 ? '#3b82f6' : '#64748b', fontFamily: 'monospace' }}>
                {price?.volume_5m?.toLocaleString() ?? '—'}
              </span>
            </div>

            {/* 1h Volume */}
            <div style={{ marginBottom: '0.6rem', paddingBottom: '0.6rem', borderBottom: '1px solid #334155' }}>
              <p style={{ color: '#64748b', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vol 1h</p>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: price?.volume_1h && price.volume_1h > 0 ? '#8b5cf6' : '#64748b', fontFamily: 'monospace' }}>
                {price?.volume_1h?.toLocaleString() ?? '—'}
              </span>
            </div>

            {/* Volatility */}
            <div style={{ marginBottom: '0.6rem', paddingBottom: '0.6rem', borderBottom: '1px solid #334155' }}>
              <p style={{ color: '#64748b', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Volatility</p>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: volatility !== null ? (volatility > 10 ? '#f59e0b' : '#06b6d4') : '#64748b', fontFamily: 'monospace' }}>
                {volatility !== null ? `${volatility.toFixed(1)}%` : '—'}
              </span>
            </div>

            {/* Buy Limit */}
            {item.buy_limit && (
              <div style={{ marginBottom: '0.6rem', paddingBottom: '0.6rem', borderBottom: '1px solid #334155' }}>
                <p style={{ color: '#64748b', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Buy Limit</p>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f5c518', fontFamily: 'monospace' }}>
                  {item.buy_limit.toLocaleString()}
                </span>
              </div>
            )}

            {/* Freshness */}
            <div>
              <p style={{ color: '#64748b', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Freshness</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#e2e8f0', fontFamily: 'monospace' }}>{freshnessDisplay}</span>
                <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: 4, background: freshnessMinutes !== null && freshnessMinutes < 30 ? 'rgba(34,197,94,0.2)' : freshnessMinutes !== null && freshnessMinutes < 60 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)', color: freshnessMinutes !== null && freshnessMinutes < 30 ? '#22c55e' : freshnessMinutes !== null && freshnessMinutes < 60 ? '#f59e0b' : '#ef4444' }}>
                  {freshnessMinutes !== null && freshnessMinutes < 30 ? 'LIVE' : freshnessMinutes !== null && freshnessMinutes < 60 ? 'DELAYED' : 'STALE'}
                </span>
              </div>
            </div>
          </div>

          {/* 24h Range mini card */}
          {high24h !== null && low24h !== null && (
            <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', border: '1px solid #334155', borderRadius: 10, padding: '0.875rem' }}>
              <p style={{ color: '#64748b', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>24h Range</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#22c55e', fontFamily: 'monospace' }}>{high24h.toLocaleString()}</span>
                <span style={{ color: '#64748b' }}>→</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ef4444', fontFamily: 'monospace' }}>{low24h.toLocaleString()}</span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.7rem', marginTop: '0.25rem', fontFamily: 'monospace' }}>{priceRangePct?.toFixed(1)}% range</p>
            </div>
          )}
        </div>
      </div>

      {/* Flip Calculator Modal */}
      {showFlipCalc && (
        <div className="modal-overlay" onClick={() => setShowFlipCalc(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="row-between" style={{ marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>🧮 Flip Calculator</h2>
              <button className="btn-close" onClick={() => setShowFlipCalc(false)}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label className="muted" style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={flipQty}
                  onChange={(e) => setFlipQty(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ fontSize: '1rem', padding: '0.6rem' }}
                />
              </div>
              <div className="grid grid-2" style={{ gap: '0.5rem' }}>
                <div>
                  <label className="muted" style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Buy Price (gp)</label>
                  <input
                    type="number"
                    placeholder={price ? String(price.buy_at) : '0'}
                    value={flipBuyPrice}
                    onChange={(e) => setFlipBuyPrice(e.target.value)}
                    style={{ fontSize: '1rem', padding: '0.6rem' }}
                  />
                </div>
                <div>
                  <label className="muted" style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Sell Price (gp)</label>
                  <input
                    type="number"
                    placeholder={price ? String(price.sell_at) : '0'}
                    value={flipSellPrice}
                    onChange={(e) => setFlipSellPrice(e.target.value)}
                    style={{ fontSize: '1rem', padding: '0.6rem' }}
                  />
                </div>
              </div>

              {flipCalc && (
                <div style={{ 
                  marginTop: '0.5rem', 
                  padding: '1rem', 
                  background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)', 
                  borderRadius: 12,
                  border: '1px solid var(--border)'
                }}>
                  <div className="grid grid-2" style={{ gap: '0.75rem' }}>
                    <div>
                      <p className="muted" style={{ fontSize: '0.7rem' }}>Total Cost</p>
                      <p style={{ fontSize: '1rem', fontWeight: 700 }}>{flipCalc.totalCost.toLocaleString()} gp</p>
                    </div>
                    <div>
                      <p className="muted" style={{ fontSize: '0.7rem' }}>Total Revenue</p>
                      <p style={{ fontSize: '1rem', fontWeight: 700 }}>{flipCalc.totalRevenue.toLocaleString()} gp</p>
                    </div>
                  </div>
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                    <div className="row-between">
                      <div>
                        <p className="muted" style={{ fontSize: '0.7rem' }}>Profit</p>
                        <p style={{ 
                          fontSize: '1.4rem', 
                          fontWeight: 900, 
                          color: flipCalc.profit >= 0 ? '#22c55e' : '#ef4444' 
                        }}>
                          {flipCalc.profit >= 0 ? '+' : ''}{flipCalc.profit.toLocaleString()} gp
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p className="muted" style={{ fontSize: '0.7rem' }}>ROI</p>
                        <p style={{ 
                          fontSize: '1.4rem', 
                          fontWeight: 900, 
                          color: flipCalc.roi >= 0 ? '#22c55e' : '#ef4444' 
                        }}>
                          {flipCalc.roi >= 0 ? '+' : ''}{flipCalc.roi.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button 
                className="btn" 
                onClick={() => setShowFlipCalc(false)}
                style={{ marginTop: '0.5rem', width: '100%' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
