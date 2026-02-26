import PassiveApp from '@/components/passive/PassiveApp';
import { analyzeItem } from '@/lib/analysis';

export default async function HomePage() {
  const itemMetrics = await analyzeItem('Rune platebody');

  return (
    <>
      <PassiveApp />

      <div className="card" style={{ marginTop: '0.9rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.35rem' }}>Rune platebody (debug)</h2>
        <p className="muted" style={{ marginBottom: '0.5rem' }}>
          Server-side analysis snapshot (remove when item pages land).
        </p>
        <div className="grid" style={{ gap: '0.25rem' }}>
          <p>Current Price: {itemMetrics.currentPrice}</p>
          <p>Score: {itemMetrics.score}</p>
          <p>ROI: {itemMetrics.roi}%</p>
          <p>Trend: {itemMetrics.trend}</p>
        </div>
      </div>
    </>
  );
}

