import PassiveApp from '@/components/passive/PassiveApp';
import { analyzeItem } from '../lib/analysis';

export default function HomePage() {
  const itemMetrics = await analyzeItem('Rune platebody');

  return (
    <>
      <PassiveApp />
      <div>
        <h2>Rune platebody Analysis</h2>
        <p>Current Price: {itemMetrics.currentPrice}</p>
        <p>Score: {itemMetrics.score}</p>
        <p>ROI: {itemMetrics.roi}%</p>
        <p>Trend: {itemMetrics.trend}</p>
      </div>
    </>
  );
