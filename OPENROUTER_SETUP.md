# OpenRouter Integration Guide

## Overview

Your project now uses **OpenRouter** for AI API access with automatic model routing. Instead of sending all requests to GPT-4o (expensive), the system intelligently selects the optimal model based on task complexity and cost constraints.

## Setup Steps

### 1. Get OpenRouter API Key

1. Go to [openrouter.io](https://openrouter.io)
2. Sign up or log in
3. Go to **Settings** → **API Keys**
4. Create a new API key
5. Add to your `.env.local`:

```env
OPENROUTER_API_KEY=sk-or-xxx...
```

**Remove or comment out** the old OpenAI key:
```env
# OPENAI_API_KEY=sk-...
```

### 2. Replace Environment Variables

In `.env.local` or `.env`:

```env
# OpenRouter configuration
OPENROUTER_API_KEY=sk-or-your-key-here

# Optional: Remove these
# OPENAI_API_KEY=sk-...
```

### 3. How Model Routing Works

The system automatically selects models based on task type:

| Task Type | Models | Cost | Speed | Use Case |
|-----------|--------|------|-------|----------|
| **item-lookup** | Claude 3.5 Haiku, GPT-4o Mini | $0.08-0.15/1K | ⚡⚡⚡ | Item metadata, quick lookups |
| **price-analysis** | Claude 3.5 Haiku, GPT-4o Mini | $0.08-0.15/1K | ⚡⚡⚡ | Basic price trends |
| **complex-analysis** | Claude 3.5 Sonnet | $3.00/1K | ⚡⚡ | Pattern recognition, deep analysis |
| **recommendation** | GPT-4o, Claude 3 Opus | $5-15/1K | ⚡⚡ | Trading advice, portfolio analysis |
| **feedback-learning** | GPT-4o | $5-15/1K | ⚡⚡ | Learning from user feedback |

### 4. Three Routing Strategies

The system supports different cost/quality strategies:

```typescript
// Cost-Optimized (fast, cheap models only)
// Used for: Item lookups, pool reviews
ROUTING_STRATEGIES['cost-optimized']

// Balanced (default)
// Used for: Flip analysis, price analysis
ROUTING_STRATEGIES['balanced']

// Quality-Focused (best models regardless of cost)
// Used for: Portfolio analysis, important recommendations
ROUTING_STRATEGIES['quality-focused']
```

## Current Implementation

Your AI requests now use this structure:

### analyzeFlipsWithAI()
- **Strategy**: `balanced`
- **Task Type**: `complex-analysis`
- **Model**: Claude 3.5 Sonnet (~$0.12 per request)
- **Previous**: GPT-4o (~$0.30+ per request)
- **Savings**: ~60% cheaper

### analyzePoolWithAI()
- **Strategy**: `cost-optimized`
- **Task Type**: `item-lookup`
- **Model**: Claude 3.5 Haiku (~$0.01 per request)
- **Previous**: GPT-4o mini (~$0.05 per request)
- **Savings**: ~80% cheaper

### analyzePortfolioWithAI()
- **Strategy**: `quality-focused`
- **Task Type**: `recommendation`
- **Model**: GPT-4o (~$0.25 per request)
- **Previous**: GPT-4o (~$0.25 per request)
- **Notes**: Kept expensive model for quality, this is critical analysis

### extractItemsFromUpdate()
- **Strategy**: `cost-optimized`
- **Task Type**: `item-lookup`
- **Model**: Claude 3.5 Haiku
- **Savings**: ~80% cheaper than before

## Cost Tracking

All API calls are automatically tracked. View costs in logs:

```typescript
import { getCostTracker } from '@/lib/ai/costs';

const tracker = getCostTracker();

// Get total cost
console.log(`Total spent: $${tracker.getTotalCost().toFixed(2)}`);

// Get breakdown by model
console.log(tracker.getCostBreakdownByModel());

// Get stats for date range
const stats = tracker.getStatsForPeriod(startDate, endDate);
console.log(tracker.exportStats());  // Pretty-printed report
```

**Example output:**
```
📊 AI API Cost Report
Period: 2/21/2026 - 2/21/2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Cost: $0.1245
Total Tokens: 15,230
API Calls: 23
Avg Cost/Call: $0.0054

💰 Cost by Model:
  Claude 3.5 Haiku: $0.0245 (19.7%)
  Claude 3.5 Sonnet: $0.0840 (67.5%)
  GPT-4o Mini: $0.0160 (12.8%)

📈 Cost by Task Type:
  complex-analysis: $0.0840 (67.5%)
  item-lookup: $0.0290 (23.3%)
  recommendation: $0.0115 (9.2%)
```

## Using the AI System

### Simple Request
```typescript
import { queryAI } from '@/lib/ai';

const answer = await queryAI(
  "What items are essential for beginner flipping?",
  'item-lookup'
);
```

### Advanced Request with Custom Options
```typescript
import { makeAIRequest, ROUTING_STRATEGIES } from '@/lib/ai';

const response = await makeAIRequest(
  [
    { role: 'system', content: 'You are an expert trader' },
    { role: 'user', content: 'Analyze this item price history...' }
  ],
  {
    taskType: 'complex-analysis',
    temperature: 0.3,
    maxTokens: 1500,
    strategy: ROUTING_STRATEGIES['balanced'],
    userId: 'user-123'  // For tracking per-user costs
  }
);

console.log(`Used ${response.model}, cost: $${response.cost.toFixed(4)}`);
```

### Force Specific Model
```typescript
import { makeAIRequestWithModel } from '@/lib/ai';

const response = await makeAIRequestWithModel(
  messages,
  'anthropic/claude-3.5-sonnet',  // OpenRouter model ID
  'recommendation'
);
```

## Monitoring & Optimization

### Check Daily Costs
```typescript
const tracker = getCostTracker();
const today = new Date();
today.setHours(0, 0, 0, 0);

const stats = tracker.getStatsForPeriod(today, new Date());
console.log(`Today's cost: $${stats.totalCost.toFixed(2)}`);
console.log(`Calls: ${stats.callCount}`);
console.log(`Avg/call: $${stats.avgCostPerCall.toFixed(4)}`);
```

### Identify Expensive Calls
```typescript
const allRecords = tracker.getAllRecords();
const expensive = allRecords
  .sort((a, b) => b.cost - a.cost)
  .slice(0, 10);

expensive.forEach(record => {
  console.log(`${record.taskType} (${record.model}): $${record.cost.toFixed(4)}`);
});
```

### Optimize Task Types
If costs are high, review which task types are most expensive:

```typescript
const breakdown = tracker.getCostBreakdownByTaskType();
// Identify highest-cost tasks and consider if they need cheaper routing
```

## Model Pricing Reference

As of February 2026:

```typescript
const PRICES = {
  'Claude 3.5 Haiku': { prompt: $0.08, completion: $0.4 },      // Fastest
  'GPT-4o Mini': { prompt: $0.15, completion: $0.6 },            // Fast
  'Claude 3.5 Sonnet': { prompt: $3, completion: $15 },          // Balanced
  'GPT-4o': { prompt: $5, completion: $15 },                     // Powerful
  'Claude 3 Opus': { prompt: $15, completion: $75 },             // Most capable
};

// Estimate: 100-word prompt ≈ 75 tokens
// Estimate: 100-word response ≈ 75 tokens
// So Haiku costs ~$0.003 for 200-word exchange
```

## Troubleshooting

### API Key Issues
```
Error: OPENROUTER_API_KEY not configured
→ Add OPENROUTER_API_KEY to .env.local
```

### Rate Limiting
OpenRouter limits are generous (200 req/min). If you hit limits:
- Built-in caching in `analyzeFlipsWithAI()` helps
- Add delays between requests if needed

### Model Not Available
If a model is deprecated:
1. Check [OpenRouter's model list](https://openrouter.ai/models)
2. Update `MODEL_CATALOG` in `lib/ai/modelRouter.ts`
3. Update model aliases

### Cost Tracking Not Working
Ensure you're using the new AI functions:
- ✅ `makeAIRequest()`
- ✅ `queryAI()`
- ❌ `new OpenAI()` (old way)

## Performance Expectations

| Metric | Value |
|--------|-------|
| Haiku latency | 800ms-1.2s |
| Sonnet latency | 1.5s-2.5s |
| GPT-4o latency | 2s-3.5s |
| Cache hit (30 min) | 5ms |
| Overall speedup | 20-40% faster with Sonnet vs GPT-4o |

## Monthly Budget Planning

For your trading dashboard (estimate):

```
Scenario 1: Casual (5 analyses/day)
├─ 5 flip analyses/day × $0.12 = $0.60/day
├─ 2 portfolio reviews/week × $0.25 = $0.07/day
├─ 10 pool reviews/month × $0.01 = $0.003/day
└─ Monthly: ~$20

Scenario 2: Active (20 analyses/day)
├─ 20 flip analyses/day × $0.12 = $2.40/day
├─ Daily portfolio review × $0.25 = $0.25/day
├─ 30 pool updates/month × $0.01 = $0.01/day
└─ Monthly: ~$80

Scenario 3: Premium (50+ analyses/day + feedback learning)
├─ Heavy analysis × $3-5/day
├─ Feedback learning × $0.50/day
└─ Monthly: ~$150-200
```

## Next Steps

1. ✅ Add `OPENROUTER_API_KEY` to `.env.local`
2. ✅ Restart development server
3. ✅ Monitor logs for successful API calls
4. ✅ Check costs in the console
5. ✅ Adjust strategies if needed (in `lib/aiAnalysis.ts`)

## Support

- [OpenRouter Docs](https://openrouter.io/docs)
- [Model Comparison](https://openrouter.io/models)
- [Available Models](https://openrouter.io/api/v1/models)

---

**Created with OpenRouter integration** | February 2026
