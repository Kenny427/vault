import { getPopularItems } from '@/lib/api/osrs';

export async function testFullPoolAnalysis() {
  const items = await getPopularItems();
  console.log(`Testing analysis on ${items.length} items`);
  
  // Take first 30 items
  const batch = items.slice(0, 30).map(item => ({ id: item.id, name: item.name }));
  
  try {
    const response = await fetch('/api/analyze-flips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    });
    
    const results = await response.json();
    console.log(`=== ANALYSIS RESULTS ===`);
    console.log(`Sent: ${batch.length} items`);
    console.log(`Received: ${results.length} opportunities`);
    console.log(`Results:`, results.map((r: any) => ({
      name: r.itemName,
      score: r.opportunityScore,
      confidence: r.confidence,
      deviation: r.deviation.toFixed(1),
    })));
  } catch (error) {
    console.error('Analysis failed:', error);
  }
}
