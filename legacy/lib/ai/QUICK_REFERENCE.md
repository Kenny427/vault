# OpenRouter Integration - Quick Reference

## TL;DR Setup

1. **Get API Key**: Sign up at [openrouter.io](https://openrouter.io), copy key
2. **Add to `.env.local`**:
   ```env
   OPENROUTER_API_KEY=sk-or-your-key
   ```
3. **Restart** dev server
4. **Done!** Everything uses OpenRouter with automatic model selection

## Models Selected by Your App

| Function | Old Model | New Model | Cost Savings |
|----------|-----------|-----------|--------------|
| **analyzeFlipsWithAI()** | GPT-4o | Claude 3.5 Sonnet | 60% cheaper |
| **analyzePoolWithAI()** | GPT-4o Mini | Claude 3.5 Haiku | 80% cheaper |
| **analyzePortfolioWithAI()** | GPT-4o | GPT-4o | Same quality |
| **extractItemsFromUpdate()** | GPT-4o Mini | Claude 3.5 Haiku | 80% cheaper |

## Typical Costs

- **Flip analysis**: ~$0.12 per request (vs $0.30 before)
- **Pool review**: ~$0.01 per request (vs $0.05 before)
- **Portfolio review**: ~$0.25 per request (same as before)
- **Item extraction**: ~$0.01 per request (vs $0.02 before)

**Monthly estimate for active use**: ~$60-80 (down from $180-200)

## Code Examples

### Monitor Next Request's Cost
```typescript
const tracker = getCostTracker();
const costBefore = tracker.getTotalCost();

// Make some AI requests...
const response = await analyzeFlipsWithAI(items);

const costAfter = tracker.getTotalCost();
console.log(`Cost: $${(costAfter - costBefore).toFixed(4)}`);
```

### Check Daily Costs
```typescript
const tracker = getCostTracker();
const today = new Date();
today.setHours(0, 0, 0, 0);

const stats = tracker.getStatsForPeriod(today, new Date());
console.log(`Today: $${stats.totalCost.toFixed(2)} (${stats.callCount} calls)`);
```

### View Detailed Report
```typescript
const tracker = getCostTracker();
console.log(tracker.exportStats()); // Pretty-printed breakdown
```

## Key Features

✅ **Automatic Model Routing** - Selects best model for each task  
✅ **Cost Tracking** - Monitor spending by model and task  
✅ **Three Strategies** - Cost-optimized, balanced (default), quality-focused  
✅ **Drop-in Replacement** - No code changes needed in API routes  
✅ **Request ID Tracking** - Debug with unique identifiers  
✅ **Per-user Cost Tracking** - Optional userId parameter  

## Troubleshooting

**Error: "OPENROUTER_API_KEY not configured"**
→ Add key to `.env.local` and restart server

**API calls still slow?**
→ Haiku (fastest) takes ~1s, Sonnet ~2s, GPT-4o ~3s. This is normal.

**Costs higher than expected?**
→ Portfolio analysis (GPT-4o) is expensive. Use balanced strategy for other tasks.

## Files Added/Modified

```
lib/ai/
├── openrouter.ts          ← API client wrapper
├── modelRouter.ts         ← Model selection logic
├── costs.ts              ← Cost tracking
├── utils.ts              ← Helper functions
├── index.ts              ← Main entry point
└── EXAMPLES.ts           ← Code examples

Modified:
├── lib/aiAnalysis.ts     ← Now uses OpenRouter
├── lib/updateItemExtractor.ts ← Now uses OpenRouter

Documentation:
├── OPENROUTER_SETUP.md   ← Complete setup guide
└── lib/ai/QUICK_REFERENCE.md ← This file
```

## Advanced: Custom Model Selection

```typescript
// Force specific model
const response = await makeAIRequestWithModel(
  messages,
  'anthropic/claude-3.5-opus',  // OpenRouter model ID
  'recommendation'
);

// Custom cost limit
const response = await makeAIRequest(messages, {
  taskType: 'complex-analysis',
  strategy: {
    preferSpeed: true,
    maxCostPerRequest: 0.10,  // Max $0.10 per request
    prioritizeCapability: false
  }
});
```

## Available Models

See [openrouter.io/models](https://openrouter.io/models) for full list. Here are your defaults:

- **Claude 3.5 Haiku** - Fast, cheap, good for simple tasks
- **Claude 3.5 Sonnet** - Best value, used for complex analysis
- **GPT-4o** - Most powerful, used for recommendations
- **Claude 3 Opus** - Most capable but expensive

---

**Questions?** See `OPENROUTER_SETUP.md` for comprehensive guide
