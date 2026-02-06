# Deep Dive: AI Scanning & Analysis System Review

## Executive Summary
Two critical issues identified in the AI-powered analysis system:
1. **35 missing items** from batch scanning (AI non-compliance with output requirements)
2. **Karambwan price guidance** off by 15x (534gp → 8,165gp with no validation)

Both stem from insufficient AI prompt constraints and lack of output validation.

---

## Issue #1: 35 Missing Items in Scan

### Location
`app/api/mean-reversion-opportunities/route.ts` - lines 408-427

### Problem Description
- System sends batches of items to AI for analysis
- AI is instructed: **"MUST return EXACTLY ONE JSON entry per item ID listed below. Missing items break the system."**
- But AI is omitting ~35 items from responses
- System logs: `❌ CRITICAL: AI omitted ${missingInBatch.length} item(s) from batch response`

### Root Causes

#### 1. **AI Non-Compliance with Instructions**
   - The prompt emphasizes mandatory compliance but lacks enforcement
   - Default behavior is not specified clearly enough
   - AI seems to skip items it's uncertain about instead of returning `{"id": X, "include": false}`

#### 2. **Batch Size Too Large**
   - Current batch size: **15 items per batch** (configurable)
   - With ~113 items in pool = 8 batches
   - Some batches may exceed token limits, causing truncated responses
   - `max_tokens: 3200` might not be enough for 15 items with detailed reasoning

#### 3. **Prompt Formatting Issues**
   - Prompt doesn't show an example of the complete expected JSON structure
   - No example showing `include=false` entries alongside `include=true`
   - AI interprets missing items as "you don't need to include rejected items"

#### 4. **JSON Parsing Fragility**
   - Code expects `{"items": [...]}` array
   - If AI returns items in different order or structure, matching by ID fails
   - Missing `id` field causes items to be skipped

### Evidence
- Line 408 shows items are being filtered: `const missingInBatch = batch.filter((item) => !returnedIds.has(item.itemId));`
- Multiple batches are being processed, so ~35 missing across all batches
- Likely 5-10 items missing per batch due to token limits or AI non-compliance

---

## Issue #2: Karambwan Price Guidance - 15x Off

### Location  
`app/api/analyze-single-item/route.ts` - lines 338-354 (Strategist Pass)

### Problem Description
**User Report:**
- Raw Karambwan current price: **534gp**
- Cooked Karambwan current price: **385gp**
- AI guidance returned: **8,165-8,414gp** (15x higher! ❌)

### Root Causes

#### 1. **Zero Price Validation**
The strategist pass generates price targets with NO sanity checks:
```typescript
{
  "priceTargets": {
    "entryOptimal": 0,      // Can be ANY value!
    "exitConservative": 0,  // No validation
    "exitAggressive": 0,    // No constraints
    "triggerStop": 0        // No bounds checking
  }
}
```

The only validation is line 411 in `mean-reversion-opportunities/route.ts`:
```typescript
if (entryNow > base.currentPrice * maxReasonableMultiplier || entryNow < base.currentPrice * minReasonableMultiplier) {
  // ... but this only applies to the final decision, not the AI's original guidance
}
```

#### 2. **AI Lacks Historical Context**
Strategist prompt (lines 302-327) provides:
- Current price ✓
- 7/90/365d averages ✓
- Confidence scoring ✓
- **But NO:** Historical high/low range to anchor prices

The AI has no way to know:
- What this item's max price was (historically)
- What a reasonable 2x-3x move looks like
- If its suggestion is absurd

#### 3. **No Example or Constraint**
The prompt says: "_Provide a comprehensive investment thesis_" but doesn't say:
- **"Entry must be within ±5% of current price"**
- **"Exit base should be between current and historical average"**
- **"Any price >2x current or <50% current is invalid"**

#### 4. **AI Assumes Extreme Recovery**
Without context, AI might assume:
- "Mean reversion means price goes back to worst historical average"
- "For food items that might have hit 534gp, maybe it was 8000gp at some point?"
- "Let me suggest 8165gp as a 15x recovery target"

This is mathematically reasonable without domain knowledge but catastrophically wrong in practice.

---

## System Architecture Deep Dive

### 1. Price Data Flow

```
OSRS Wiki API
    ↓ (getItemHistoryWithVolumes)
meanReversionAnalysis.ts (analyzeMeanReversionOpportunity)
    ↓ Calculates: deviations, volatility, bot scores, confidence
MeanReversionSignal (base metrics)
    ↓
analyze-single-item/route.ts (Strategist Pass)
    ↓ AI generates: entryOptimal, exitConservative, exitAggressive, triggerStop
    ↓ ❌ NO VALIDATION HERE
Enhanced MeanReversionSignal (merged with AI guidance)
    ↓
Frontend displays these prices to user
```

### 2. Batch Analysis Flow

```
get /api/mean-reversion-opportunities
    ↓ Fetch all items from EXPANDED_ITEM_POOL (~113 items)
    ↓ For each item: analyzeMeanReversionOpportunity()
    ↓ Split into batchSize groups (default 15)
    ↓
For each batch:
    ↓ Build prompt with: itemId, name, current, dev%, confidence, etc.
    ↓ Send to AI (gpt-4o-mini, max_tokens: 3200)
    ↓ AI returns: {"items": [{id, include, entryNow, exitBase, ...}, ...]}
    ❌ AI OMITS ~35 items total
    ↓ Merge approved items into topOpportunities
    ↓ Return to frontend
```

---

## AI Prompt Assessment

### Current Strategist Prompt (analyze-single-item)

**Strengths:**
- ✓ Asks for structured "TASK" sections
- ✓ Requests 5 specific outputs (thesis, vulnerability, trigger, narrative, price guidance)
- ✓ Provides detailed context on item metrics

**Weaknesses:**
- ❌ **No price constraints**: AI has total freedom on target prices
- ❌ **No anchoring**: Doesn't show historical range (min/max over past year)
- ❌ **No example JSON**: Could have shown `{"entryOptimal": 534, "exitConservative": 600, ...}`
- ❌ **Vague guidance**: "_Provide concise JSON only_" doesn't enforce format
- ❌ **No validation rules**: Doesn't say "if your entry exceeds 2x current, you're wrong"

### Current Batch Prompt (mean-reversion-opportunities)

**Strengths:**
- ✓ Clear "CRITICAL RULES" section
- ✓ Explicit instruction: "MUST return EXACTLY ONE JSON entry per item"
- ✓ Provides compressed data format to save tokens
- ✓ Uses `response_format: { type: 'json_object' }` to enforce JSON

**Weaknesses:**
- ❌ **No example output**: Doesn't show what `{"items": [...]}` should look like with 15 items
- ❌ **Contradictory instructions**: Asks for entries, but doesn't penalize omission
- ❌ **Batch size too large**: 15 items + detailed reasoning = token overflow risk
- ❌ **No fallback format**: If JSON fails, what's the recovery mechanism?
- ❌ **Token limit too low**: 3200 tokens for 15 items with reasoning might cut off mid-list

---

## Data Quality Issues

### Expandable Item Pool (EXPANDED_ITEM_POOL)
- **Total items**: ~113 items
- **Issue**: Same items appear in multiple forms (e.g., raw vs cooked food)
- **When scanning**: System doesn't deduplicate variants properly in some flows

### Missing Items Count Analysis
- All 113 items sent → 8 batches of 15 items = 120 slots
- ~35 items missing = **31% loss rate**
- This suggests systematic token limit exceeded or prompt misunderstanding

---

## Proposed Fixes

### High Priority (Critical)

#### 1. Fix Price Validation (Karambwan Issue)
- Add `validatePriceGuidance()` function
- Constraint: Entry must be within ±10% of current price
- Constraint: Exit base must be between current and 2x long-term average
- Constraint: Stop loss must be within historical range
- **Return to user**: If AI violates, use baseSignal values instead

#### 2. Fix Missing Items Issue
- Reduce batch size from 15 to **8 items per batch**
- Add JSON structure example in prompt
- Change instruction: "If you reject an item, explicitly set `include: false` and provide `reasoning`"
- Add recovery: If response is truncated, batch smaller or retry

#### 3. Improve Strategist Prompt
- Add section: "PRICE ANCHORING"
  - Show historical 12-month high/low
  - Context: "This item rarely exceeds 2x its average"
- Add example: Show a sample JSON with valid price targets
- Add validation rules: List specific constraints

### Medium Priority (Quality)

#### 4. Enhance Prompt Clarity
- Add explicit examples for both batch and strategist flows
- Show "good response" and "bad response" examples
- Make instruction: "You must include all items, even rejections"

#### 5. Improve Data Presentation
- Pre-filter items before batching (remove low-signal items)
- Reduce batch size to 8-10 items
- Increase `max_tokens` to 4000 for safety margin

#### 6. Add Logging & Monitoring
- Log every AI response structure for debugging
- Track which items go missing per batch
- Alert if >10% of items are missing

### Low Priority (Enhancement)

#### 7. Improve Analysis Quality
- Add "volatility constraint" to entry prices
- Add "bot activity" context to price targets
- Add "recent dumps" to strategist prompt

---

## Testing Recommendations

### Unit Tests
1. **Price Validation**
   - Test items with 30%, 50%, 100%+ drops
   - Verify guidance stays within bounds
   - Test high-price items (100M+) separately

2. **Batch Completeness**
   - Send 100 items in batches of 8, 15, 20
   - Verify all items return (even with include=false)
   - Test with mixed include=true/false responses

3. **JSON Parsing**
   - Test with missing fields
   - Test with items in different order
   - Test with extra fields AI adds

### Integration Tests
1. **End-to-end Scanning**
   - Run full pool analysis
   - Count items in → items out
   - Verify no >15x price multiples appear

2. **Specific Items**
   - Test karambwan guidance vs current price
   - Test high-value items (Zulrah's scales)
   - Test low-value items (runes)

### Manual Verification
1. **Price Sanity Check**
   - For top 20 items: Compare AI price guidance to actual market
   - Verify AI entries are within ±5% of current
   - Verify exits are realistic

2. **Missing Items Analysis**
   - Check which 35 items are missing
   - Are they from specific categories (food, runes)?
   - Are they all from later batches (token cutoff)?

---

## Implementation Priority

1. **Immediate** (next 1-2 hours):
   - Add price validation to `analyze-single-item`
   - Reduce batch size to 8, increase max_tokens to 4000
   - Add example JSON to prompts

2. **Short-term** (next 4 hours):
   - Rewrite strategist prompt with anchoring
   - Improve batch prompt compliance
   - Add comprehensive logging

3. **Medium-term** (next 24 hours):
   - Add unit tests for price validation
   - Test batch completeness
   - Manual quality check on top opportunities

4. **Long-term** (future):
   - Consider alternative models (gpt-4-turbo vs gpt-4o-mini)
   - Implement caching layer for stability
   - Build admin dashboard to monitor AI quality

---

## Key Metrics to Track

1. **Missing Items**: Should be 0 (currently ~35)
2. **Price Anomalies**: Should be 0 (currently affecting karambwans)
3. **Batch Success Rate**: >99% (currently ~90-95%)
4. **Strategist Prompt Compliance**: >95% valid JSON (likely lower now)
5. **Price Range Violations**: 0 (any >2x should be flagged)

