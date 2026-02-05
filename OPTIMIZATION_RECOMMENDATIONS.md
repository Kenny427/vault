# AI Optimization Recommendations for Flip Opportunities

## Executive Summary
Current system makes **~9 AI calls per scan** at **$0.09-0.27 per scan**. 
Optimizations can reduce to **2-3 calls** at **$0.03-0.09 per scan** (~70% cost reduction).

---

## Critical Issues & Solutions

### 1. TOO MANY SEQUENTIAL AI CALLS

**Current Flow:**
```
355 items → Pre-filter → ~150 items → Split into 9 batches → 9 AI calls
```

**Problem:** 
- Batching at 40 items/call is arbitrary
- Each call has ~1500 input tokens + 400 output tokens
- Total: ~17,100 tokens/scan = $0.09-0.27

**Solution A: Two-Phase Filtering (70% cost reduction)**
```typescript
// Phase 1: Quick triage (1 call, all items)
// Compressed format: ID, name, price, 3 key metrics only
// AI returns: "include: [id1, id2...], reject: [id3, id4...]"
// Input: ~2000 tokens, Output: ~200 tokens
// Cost: $0.01

// Phase 2: Deep analysis (1-2 calls, top 20-30 items)
// Full metrics for survivors only
// Input: ~1500 tokens, Output: ~800 tokens  
// Cost: $0.02-0.04

// Total: $0.03-0.05 (65% savings)
```

**Solution B: Smart Pre-filtering (eliminate 80% before AI)**
```typescript
// Rule-based filters BEFORE AI:
- Price < 90d_avg AND price < 365d_avg (must be discounted)
- Deviation > 10% (meaningful discount)
- Liquidity score > 30 (tradeable)
- No structural downtrend (30d_avg < 90d_avg < 365d_avg = skip)

// Reduces 355 items → ~70 items → 2 AI calls
// Cost: $0.06 (50% savings)
```

---

### 2. BLOATED PROMPTS (wasting 60% of tokens)

**Current Prompt Structure:**
```
- System persona: ~200 tokens ("ELITE ANALYST with DEEP knowledge...")
- Instructions: ~300 tokens (repeated rules, examples)  
- Per-item data: ~150 tokens × 40 items = 6000 tokens
- Output format: ~100 tokens
= 6,600 tokens/batch
```

**Optimized Structure:**
```
- Persona: ~30 tokens ("OSRS flip analyst. Mean-reversion strategy.")
- Instructions: ~80 tokens (concise bullet points)
- Per-item data: ~40 tokens × 40 items = 1,600 tokens (compressed)
- Output format: ~50 tokens
= 1,760 tokens/batch (73% reduction)
```

**Data Compression Example:**

❌ **Current (150 tokens):**
```
━━━ [Rune platebody] (ID: 1127) ━━━
💰 CURRENT: 38400gp

📊 MULTI-TIMEFRAME ANALYSIS:
30d:  Avg=39200gp | Range=37500-41000 | Vol=8.9% | Momentum=-2.1% | StdDev=850 | Consistency=89%
90d:  Avg=39800gp | Range=37000-42500 | Vol=13.8% | Momentum=-0.5% | StdDev=1250
180d: Avg=39600gp | Range=36500-43000 | Vol=16.4% | Momentum=0.2% | StdDev=1480
365d: Avg=40100gp | Range=36000-44500 | Vol=21.2% | Momentum=-1.8% | StdDev=1950 | Consistency=85%

📈 TREND ANALYSIS:
Direction: downward | Strength: 2.1%
Price Position: 23rd percentile (30d) | 28th percentile (365d)

🎯 TECHNICAL INDICATORS:
Support Level: 38150gp | Resistance: 42050gp
Near Support: YES ✓ | Near Resistance: NO
Recovery Potential: 4.4%
Extreme Volatility: Normal
Price Collapse: Normal | Price Surge: Normal
```

✅ **Optimized (40 tokens):**
```
1127|RunePlatebody|38400|Avg[30/90/365]:39.2k/39.8k/40.1k|Dev[30/365]:-2.0/-4.2%|Vol:21.2%|Pctl:23/28|Sup:38.1k|Rec:+4.4%|Trend:dn|Risk:low
```

**Parsing guide for AI:**
```
Format: ID|Name|CurPrice|Averages|Deviations|Volatility|Percentiles|Support|Recovery|Trend|Risk
- Averages: [30d/90d/365d] in gp or k (thousands)
- Deviations: % below averages [30d/365d]
- Percentiles: position in 30d/365d range
- Trend: up/dn/flat
```

---

### 3. VAGUE PROMPTS (AI guessing your intent)

**Current Issues:**
- "Find SOLID flip opportunities" - what does SOLID mean?
- "Be ruthless" then "Include borderline candidates" - contradictory
- No mention of GE tax calculation
- No failed flip feedback loop

**Specific Improvements:**

```typescript
const OPTIMIZED_PROMPT = `
Analyze OSRS items for mean-reversion flips. Return ONLY items meeting ALL criteria:

HARD REQUIREMENTS (must pass):
1. Price 10%+ below 90d OR 15%+ below 365d avg
2. NOT in structural downtrend (30d_avg >= 90d_avg)  
3. Liquidity score >= 30 (tradeable volume)
4. Within 2 std deviations of 365d avg (not manipulated)

SCORING (0-100):
- Base: depth of discount (10% = 50pts, 20% = 75pts, 30% = 90pts)
- +10: Price at 365d support level
- +10: High consistency (>80%)
- -20: High volatility (>40%)
- -15: Low liquidity (<50)

TARGET PRICES:
- Buy at current price
- Sell at: min(90d_avg, 365d_avg) - 1% (conservative)
- Factor in 2% GE tax for profit calc

RETURN FORMAT (JSON only):
[{"id":123,"conf":72,"target":350,"hold":"2-4w","invest":500000,"risk":"med","why":"22% below 90d avg, 85% consistency, strong support at 38k"}]

ITEMS (compressed):
${items.map(i => `${i.id}|${i.name}|${i.price}|${i.avg30}/${i.avg90}/${i.avg365}|${i.dev30}/${i.dev365}%|${i.vol}%|${i.liq}`).join('\n')}
`;
```

**Benefits:**
- Clear success criteria (no guessing)
- Explicit calculation formulas
- Compressed data format
- Removes fluff ("ELITE", emojis, redundant warnings)

---

### 4. NO INTELLIGENT CACHING

**Current System:**
- 30-min cache keyed by item IDs (changes every scan)
- Cache miss rate: ~100%
- Items like "Rune platebody" analyzed 50x/week with same data

**Smart Caching Strategy:**

```typescript
interface CachedAnalysis {
  itemId: number;
  priceAtAnalysis: number;
  result: FlipOpportunity;
  analyzedAt: number;
  expiresAt: number;
}

// Cache key: itemId + price bucket
// If price changed <3%, reuse analysis
function getCacheKey(itemId: number, price: number): string {
  const priceBucket = Math.floor(price / (price * 0.03)); // 3% buckets
  return `${itemId}-${priceBucket}`;
}

// Tiered expiration:
// - High volatility items (>30%): 1 hour
// - Medium volatility (10-30%): 4 hours  
// - Low volatility (<10%): 12 hours
// - Stable items (consistent 90d): 24 hours

function getCacheDuration(item: FlipOpportunity): number {
  if (item.volatility > 30) return 1 * 60 * 60 * 1000; // 1 hour
  if (item.volatility > 10) return 4 * 60 * 60 * 1000; // 4 hours
  if (item.consistency > 80) return 24 * 60 * 60 * 1000; // 24 hours
  return 12 * 60 * 60 * 1000; // 12 hours default
}

// Expected cache hit rate: 40-60% (huge savings)
```

**Database-backed Cache (for multi-user):**
```sql
CREATE TABLE ai_analysis_cache (
  item_id INTEGER,
  price_bucket INTEGER,
  analysis_result JSONB,
  analyzed_at TIMESTAMP,
  expires_at TIMESTAMP,
  hit_count INTEGER DEFAULT 1,
  PRIMARY KEY (item_id, price_bucket)
);

CREATE INDEX idx_expires ON ai_analysis_cache(expires_at);
```

---

### 5. NO REQUEST DEDUPLICATION

**Current Issue:**
- User clicks "Scan" 3 times quickly → 3 parallel scans → 27 AI calls
- No in-flight request tracking

**Solution:**
```typescript
// In lib/aiAnalysis.ts
const inFlightRequests = new Map<string, Promise<FlipOpportunity[]>>();

export async function analyzeFlipsWithAI(items: Item[]): Promise<FlipOpportunity[]> {
  const cacheKey = items.map(i => i.id).sort().join(',');
  
  // Return existing promise if request already in flight
  if (inFlightRequests.has(cacheKey)) {
    console.log('Deduplicating in-flight AI request');
    return inFlightRequests.get(cacheKey)!;
  }
  
  // Start new request
  const promise = performAnalysis(items);
  inFlightRequests.set(cacheKey, promise);
  
  // Clean up after completion
  promise.finally(() => {
    inFlightRequests.delete(cacheKey);
  });
  
  return promise;
}
```

---

## Implementation Priority

### Phase 1: Quick Wins (1-2 hours, 50% cost reduction)
1. ✅ Compress data format (150 tokens → 40 tokens per item)
2. ✅ Remove prompt fluff (persona, examples, contradictions)
3. ✅ Add request deduplication
4. ✅ Smart pre-filtering (eliminate 80% before AI)

### Phase 2: Caching (3-4 hours, additional 30% reduction)
5. ✅ Price-bucket caching with tiered expiration
6. ✅ Database-backed cache for persistence
7. ✅ Cache warming for popular items

### Phase 3: Advanced (1-2 days, marginal improvements)
8. ✅ Two-phase AI filtering
9. ✅ Failed flip feedback loop
10. ✅ Seasonal pattern awareness

---

## Expected Cost Savings

| Optimization | Current Cost | Optimized Cost | Savings |
|--------------|--------------|----------------|---------|
| **Baseline** | $0.18/scan | - | - |
| Data compression | $0.18 | $0.11 | 39% |
| Smart pre-filtering | $0.11 | $0.06 | 67% |
| Intelligent caching (40% hit rate) | $0.06 | $0.036 | 80% |
| Request deduplication | $0.036 | $0.036 | (prevents waste) |
| **TOTAL IMPACT** | **$0.18** | **$0.036** | **80% reduction** |

**Projected Monthly Savings:**
- Current: 100 scans/day × $0.18 = $18/day = $540/month
- Optimized: 100 scans/day × $0.036 = $3.60/day = $108/month
- **Savings: $432/month** (at 100 scans/day scale)

---

## Code Examples

### Optimized Prompt Template

```typescript
export async function analyzeFlipsWithAI(items: Item[]): Promise<FlipOpportunity[]> {
  // Pre-filter: eliminate obvious rejections
  const candidates = items.filter(item => {
    const dev90 = ((item.currentPrice - item.avg90) / item.avg90) * 100;
    const dev365 = ((item.currentPrice - item.avg365) / item.avg365) * 100;
    
    // Must be discounted
    if (dev90 >= 0 && dev365 >= 0) return false;
    
    // Must have meaningful discount
    if (Math.abs(dev90) < 8 && Math.abs(dev365) < 12) return false;
    
    // Must not be in structural decline
    if (item.avg30 < item.avg90 && item.avg90 < item.avg365) return false;
    
    // Must have basic liquidity
    if (item.liquidityScore < 20) return false;
    
    return true;
  });
  
  console.log(`Pre-filtered: ${items.length} → ${candidates.length} items (${((1 - candidates.length/items.length) * 100).toFixed(0)}% reduction)`);
  
  if (candidates.length === 0) return [];
  
  // Compress data
  const compressed = candidates.map(i => 
    `${i.id}|${i.name}|${i.currentPrice}|${i.avg30}/${i.avg90}/${i.avg365}|` +
    `${((i.currentPrice - i.avg30) / i.avg30 * 100).toFixed(1)}/${((i.currentPrice - i.avg365) / i.avg365 * 100).toFixed(1)}%|` +
    `${i.volatility.toFixed(1)}%|${i.liquidityScore}`
  ).join('\n');
  
  const prompt = `Mean-reversion flip analyzer. Return items meeting ALL:
1. 10%+ below 90d OR 15%+ below 365d avg
2. NOT declining (30d_avg >= 90d_avg)
3. Liquidity >= 30

Score: discount_depth × consistency × (1 - volatility/100)
Target: min(90d_avg, 365d_avg) × 0.99
Profit: (target - current) × 0.98 (after 2% GE tax)

Format: ID|Name|Cur|Avg[30/90/365]|Dev[30/365]%|Vol%|Liq
Return JSON: [{"id":123,"conf":72,"target":350,"hold":"2-4w","invest":500k,"risk":"med","why":"brief"}]

ITEMS:
${compressed}`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    max_tokens: 1000, // Reduced from 2000
    messages: [{ role: 'user', content: prompt }],
  });
  
  // ... parse and return
}
```

---

## Monitoring & Metrics

Track these to measure optimization impact:

```typescript
interface AIUsageMetrics {
  totalCalls: number;
  totalTokensInput: number;
  totalTokensOutput: number;
  totalCostUSD: number;
  cacheHits: number;
  cacheMisses: number;
  avgItemsPerCall: number;
  avgTokensPerItem: number;
  deduplicatedRequests: number;
}

// Log after each analysis
console.log(`AI Stats: ${metrics.totalCalls} calls, ${metrics.totalTokensInput} tokens in, $${metrics.totalCostUSD.toFixed(4)} cost, ${(metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses) * 100).toFixed(1)}% cache hit rate`);
```

---

## Conclusion

Your current system works but is **inefficient and expensive**. The main issues:

1. ❌ **Too many AI calls** (9 per scan)
2. ❌ **Bloated prompts** (6,600 tokens vs. 1,760 possible)
3. ❌ **Vague instructions** (AI guessing your strategy)
4. ❌ **No caching** (re-analyzing same items constantly)
5. ❌ **No deduplication** (parallel requests waste money)

**Implementing Phase 1 + Phase 2 optimizations:**
- Reduces cost by **80%** ($0.18 → $0.036 per scan)
- Improves response time (fewer API calls)
- Provides more consistent results (clearer prompts)
- Scales better (caching + deduplication)

**Recommended immediate actions:**
1. Implement data compression (1 hour, 40% cost reduction)
2. Add smart pre-filtering (30 min, additional 30% reduction)
3. Enable price-bucket caching (2 hours, additional 20% reduction with 40% hit rate)
4. Add request deduplication (30 min, prevents waste)

Total effort: ~4 hours for 80% cost savings.
