'use client';

import { useEffect, useState, use } from 'react';
import PriceSparkline from '@/components/market/PriceSparkline';
import Link from 'next/link';

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
};

type TimeSeriesPoint = {
  timestamp: string;
  price: number;
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

  const sparklineValues = timeseries.map((t) => t.price);

  return (
    <main style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: '#f5c518', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← Back to Vault
        </Link>
      </div>

      {/* Item Header */}
      <div className="card" style={{ marginBottom: '1rem', background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}>
        <div className="row" style={{ gap: '1rem', alignItems: 'center' }}>
          {item.icon_url && (
            <img src={item.icon_url} alt={item.name} style={{ width: 64, height: 64, imageRendering: 'pixelated' }} />
          )}
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f5c518' }}>{item.name}</h1>
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
        </div>
      </div>

      {/* Price Info */}
      {price && (
        <div className="grid grid-2" style={{ gap: '0.5rem', marginBottom: '1rem' }}>
          <article className="card">
            <p className="muted" style={{ fontSize: '0.75rem' }}>Last Price</p>
            <p style={{ fontSize: '1.3rem', fontWeight: 900 }}>{price.last_price.toLocaleString()} gp</p>
          </article>
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
        </div>
      )}

      {/* Sparkline Chart */}
      <article className="card" style={{ marginBottom: '1rem' }}>
        <div className="row-between" style={{ marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Price History</h2>
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
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {sparklineValues.length > 0 ? (
          <PriceSparkline values={sparklineValues} width={700} height={200} timestep={timestep} />
        ) : (
          <div style={{ height: 200, display: 'grid', placeItems: 'center', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface-2)' }}>
            <p className="muted">No chart data available</p>
          </div>
        )}
      </article>

      {/* Volume Info */}
      {price && (price.volume_5m || price.volume_1h) && (
        <article className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.75rem' }}>Volume</h2>
          <div className="grid grid-2" style={{ gap: '0.5rem' }}>
            {price.volume_5m && (
              <div>
                <p className="muted" style={{ fontSize: '0.75rem' }}>5 minutes</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>{(price.volume_5m / 1000).toFixed(1)}k</p>
              </div>
            )}
            {price.volume_1h && (
              <div>
                <p className="muted" style={{ fontSize: '0.75rem' }}>1 hour</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>{(price.volume_1h / 1000).toFixed(1)}k</p>
              </div>
            )}
          </div>
        </article>
      )}
    </main>
  );
}
