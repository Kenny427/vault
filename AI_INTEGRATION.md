# Strategic AI Integration - Low-Cost, High-Value

## Overview
Two strategic AI features that maximize value while minimizing API credit usage through batch processing and user-controlled triggers.

---

## 🤖 Feature 1: Portfolio AI Review

### What It Does
Single button analyzes ALL your portfolio holdings at once and provides:
- **Risk Assessment**: Overall portfolio risk level (LOW/MEDIUM/HIGH/CRITICAL)
- **Diversification Score**: 0-100 rating of portfolio diversity
- **Item Analysis**: Individual recommendations for each holding
  - Recommendation: HOLD | SELL_NOW | SELL_SOON | WATCH_CLOSELY | GOOD_POSITION
  - Risk Level: LOW | MEDIUM | HIGH | CRITICAL
  - Reasoning: AI explanation for the recommendation
  - Suggested Action: Specific exit price or condition
- **Top 3 Recommendations**: Actionable insights
- **Warnings**: Critical alerts if needed

### Location
**Portfolio Tab** → "🤖 AI Review Portfolio" button

### Cost Efficiency
- **1 API call** analyzes entire portfolio (not 1 call per item)
- User-triggered only (no auto-refresh)
- Estimated: 3-5 calls per day = **3-5 credits/day**

### Use Case
Hit this button when you're about to make decisions:
- Before closing a position
- Weekly portfolio checkup
- After major market moves
- When unsure about holdings

---

## ✨ Feature 2: AI Opportunity Ranking

### What It Does
Re-ranks your top opportunities with AI analysis:
- **AI Score**: 0-100 quality rating
- **AI Confidence**: How confident the AI is
- **AI Reasoning**: 1-sentence explanation
- Automatically sorts by AI score

### Location
**Opportunities Tab** → "✨ AI Rank Top 15" button (appears after analysis)

### Cost Efficiency
- **1 API call** ranks 15 opportunities (batch processing)
- Only analyzes top 15 filtered items (not all 350)
- User-triggered (not automatic)
- Cached until you clear or re-analyze
- Estimated: 1-3 calls per day = **1-3 credits/day**

### Use Case
- After refreshing opportunities
- When deciding which flip to execute
- To validate rule-based scores
- Second opinion on opportunities

---

## Cost Summary

### Daily Estimated Usage
- **Portfolio Reviews**: 3-5 credits
- **Opportunity Rankings**: 1-3 credits
- **Total**: ~5-10 credits per day

### Why This Works
1. **Batch Processing**: One call handles multiple items
2. **User-Controlled**: You decide when to spend credits
3. **High-Value Moments**: AI only helps at decision points
4. **No Auto-Spam**: No background auto-refresh burning credits

### Comparison to Alternatives
❌ **Auto-refresh every 5 minutes**: ~288 calls/day = 288+ credits
❌ **Per-item analysis**: 350 items = 350+ credits per refresh
✅ **This approach**: ~5-10 credits/day

---

## Technical Implementation

### New Files
- `app/api/analyze-portfolio/route.ts` - API endpoint for portfolio analysis
- `app/api/rank-opportunities/route.ts` - API endpoint for opportunity ranking
- `lib/aiAnalysis.ts` - Added `analyzePortfolioWithAI()` and `rankOpportunitiesWithAI()`

### Updated Files
- `components/Portfolio.tsx` - AI Review button and results display
- `components/Dashboard.tsx` - AI Rank button for opportunities
- `components/FlipCard.tsx` - Display AI scores and reasoning

### AI Model Used
- **gpt-4o-mini** (cost-effective)
- JSON mode for structured responses
- Temperature 0.3 (focused, consistent)

---

## Usage Examples

### Portfolio Review Workflow
1. Open Portfolio tab
2. Click "🤖 AI Review Portfolio"
3. Wait 2-5 seconds for analysis
4. Review risk levels and recommendations
5. Execute suggested actions
6. Close review panel

### Opportunity Ranking Workflow
1. Refresh opportunities (rule-based)
2. Filter by flip type if desired
3. Click "✨ AI Rank Top 15"
4. Wait 2-5 seconds for AI ranking
5. Review AI scores and reasoning
6. Execute best opportunities
7. Clear AI ranking when done

---

## Future Enhancements (Optional)
- Cache AI reviews for 1 hour
- Allow AI analysis of specific items only
- Add "AI confidence threshold" filter
- Export AI recommendations to notes
- Historical tracking of AI suggestions

---

## Developer Notes

### API Rate Limiting
Both endpoints use OpenAI's rate limits (no custom limits yet). Consider adding if needed:
```typescript
// Future: Add rate limiting per user
const rateLimit = 10; // calls per hour
```

### Error Handling
- API errors show user-friendly alerts
- Failed analyses don't crash the app
- Console logs for debugging

### Testing
Test with:
- Empty portfolios (edge case)
- Large portfolios (10+ items)
- Edge case opportunities (extreme scores)
- API failures (network issues)
