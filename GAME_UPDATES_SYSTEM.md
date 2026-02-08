# 🎮 OSRS Game Updates Tracker

Automated system for tracking OSRS game updates, dev blogs, and their market impacts.

## 📋 Overview

This system automatically:
1. **Scrapes** OSRS official news and wiki updates (twice weekly)
2. **Extracts** affected items using AI (GPT-4o mini)
3. **Analyzes** market sentiment and impact levels
4. **Integrates** into AI trading analysis for better predictions

## 🗄️ Database Schema

### Tables

**`game_updates`** - Stores game updates
- `id`, `update_date`, `release_date`
- `title`, `content`, `source_url`
- `source_type`: dev_blog | game_update | poll | news
- `impact_level`: low | medium | high
- `overall_sentiment`: bullish | bearish | neutral | mixed
- `is_reviewed`, `is_active`

**`update_item_impacts`** - Links updates to items
- `update_id` → game_updates(id)
- `item_id`, `item_name`
- `impact_type`: requirement | reward | buff | nerf | drop_rate_increase | drop_rate_decrease | new_method | removal | related
- `sentiment`: bullish | bearish | neutral
- `confidence`: 0-100
- `quantity`, `notes`
- `is_verified`

### Views

**`recent_updates_summary`** - Recent updates with impact counts
**`item_update_history`** - Item-specific update timeline

## 🤖 AI Integration

### How It Works

1. **Scraping**: Fetches updates from OSRS official news and wiki
2. **Extraction**: GPT-4o mini analyzes content and identifies:
   - Affected items
   - Impact type (requirement/reward/buff/nerf/etc.)
   - Sentiment (bullish/bearish/neutral)
   - Confidence score (0-100)
   - Quantities mentioned

3. **Analysis Enhancement**: When analyzing items, AI receives:
```
🎮 RECENT GAME UPDATES (Last 14 days):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Feb 5] DEV_BLOG: "Varlamore Part 2"
📈 Impact: Required for (85% confidence)
   Quantity mentioned: 200
   Details: Required for new spell
   Impact Level: HIGH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

4. **Better Predictions**: AI can now:
   - Anticipate demand spikes before update releases
   - Identify bearish signals from nerfs/increased drop rates
   - Track quest requirements affecting item prices
   - Consider upcoming content in recommendations

## 📅 Scheduled Scraping

### Schedule
- **Wednesday**: 12:00 PM UK time (main update day)
- **Sunday**: 12:00 PM UK time (backup/catch late announcements)

### Configuration
File: `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/cron/scrape-updates",
      "schedule": "0 12 * * 3"  // Wednesday noon
    },
    {
      "path": "/api/cron/scrape-updates",
      "schedule": "0 12 * * 0"  // Sunday noon
    }
  ]
}
```

### Environment Variables
Required:
- `OPENAI_API_KEY` - For AI extraction
- `CRON_SECRET` - (Optional) Secure cron endpoint

## 🎛️ Admin Interface

### Location
Admin Panel → Game Updates tab

### Features

1. **View Updates**
   - Filter: All | Unreviewed
   - See affected items, sentiment, impact level
   - Source links for verification

2. **Manual Scraping**
   - Scrape 7 days button
   - Scrape 14 days button
   - Real-time progress/errors

3. **Review Actions**
   - Mark as reviewed
   - Activate/deactivate updates
   - Edit sentiment/impact levels

4. **Item Impacts**
   - See which items are affected
   - Confidence scores
   - Quantity requirements
   - Impact types

## 🔌 API Endpoints

### Admin Endpoints

**POST `/api/admin/game-updates/scrape`**
```json
{
  "daysBack": 7  // Optional, default 7
}
```
Manually trigger scraping

**GET `/api/admin/game-updates`**
Query params:
- `limit`: Max results (default 50)
- `unreviewed`: true/false

**PATCH `/api/admin/game-updates`**
```json
{
  "id": "uuid",
  "is_reviewed": true,
  "overall_sentiment": "bullish",
  "impact_level": "high"
}
```

### Public Endpoints

**GET `/api/game-updates/item/[id]`**
Query params:
- `days`: Days back (default 14)

Returns recent updates affecting specific item

## 💡 Usage Examples

### Example 1: Quest Announcement
```
Update: "Desert Treasure 3 - Dev Blog"
Content: "Requires 500 Death runes, 1000 Blood runes..."

AI Extraction:
- Death rune: requirement, 500 qty, 90% confidence, BULLISH
- Blood rune: requirement, 1000 qty, 90% confidence, BULLISH

Impact Level: HIGH
Overall Sentiment: BULLISH

Result: AI analysis shows:
"📈 Recent game update: Death rune required for upcoming 
quest (500 qty). High demand expected on release."
```

### Example 2: Nerf Announcement
```
Update: "Twisted Bow Nerf"
Content: "Damage reduced by 15% in PvP..."

AI Extraction:
- Twisted bow: nerf, 85% confidence, BEARISH

Impact Level: HIGH
Overall Sentiment: BEARISH

Result: AI analysis shows:
"📉 Recent nerf announced: Twisted bow effectiveness 
reduced. Anticipate price decline."
```

### Example 3: Drop Rate Buff
```
Update: "Tombs of Amascut Changes"
Content: "Increased Masori armor drop rates..."

AI Extraction:
- Masori mask: drop_rate_increase, 80% confidence, BEARISH
- Masori body: drop_rate_increase, 80% confidence, BEARISH
- Masori chaps: drop_rate_increase, 80% confidence, BEARISH

Impact Level: MEDIUM
Overall Sentiment: BEARISH

Result: AI analysis shows:
"📉 Drop rate increased: More Masori masks entering market.
Expect oversupply and price pressure."
```

## 🧪 Testing

### Manual Test Scrape
1. Go to Admin Panel → Game Updates
2. Click "Scrape Updates (7 days)"
3. Review extracted items
4. Mark false positives as inactive
5. Verify confidence scores

### Test AI Analysis
1. Find item affected by recent update
2. Open item analysis modal
3. Check if update context appears in analysis
4. Verify AI considers the update in recommendation

## 📊 Cost Analysis

### Per Scrape (7 days)
- Scraping: Free (public pages)
- AI extraction: ~$0.01-0.03 (5-10 updates × GPT-4o mini)
- Database: Minimal

### Per Week
- 2 scrapes × $0.02 = **~$0.04/week**

### Per Analysis (with updates)
- Additional tokens: +50-100 tokens
- Cost increase: +$0.0001 per analysis
- **Negligible impact on analysis costs**

## 🔧 Maintenance

### Weekly Review
1. Check unreviewed updates
2. Verify AI extraction accuracy
3. Manually add missed items if needed
4. Adjust confidence thresholds if needed

### Monthly Tasks
1. Review system logs
2. Check scraper success rate
3. Validate item matching accuracy
4. Update item aliases if needed

## 📈 Benefits

### Trading Edge
- **Early Intel**: Know about updates before price spikes
- **Avoid Traps**: See nerfs coming, sell before crash
- **Quest Prep**: Buy requirements before demand surge
- **Drop Analysis**: Track supply changes

### AI Quality
- **Context-Aware**: AI considers game mechanics
- **Timing**: Better entry/exit recommendations
- **Risk Assessment**: Identifies update-related risks
- **Confidence**: More accurate predictions

## 🚀 Future Enhancements

Potential improvements:
1. **Poll Tracking**: Monitor active polls, predict outcomes
2. **Reddit Integration**: Track community sentiment
3. **Price Correlation**: Historical update→price impact analysis
4. **Smart Alerts**: Notify high-impact updates immediately
5. **Pattern Recognition**: Learn which update types = biggest moves

## 🐛 Troubleshooting

### Scraper Not Working
- Check OSRS website structure hasn't changed
- Verify network connectivity
- Review error logs in Admin Panel

### AI Extraction Issues
- Check OpenAI API key
- Verify rate limits not exceeded
- Review extraction logs

### Missing Items
- Item might not be tradeable (excluded)
- Update might not mention item directly
- Confidence below threshold (30%)

### Wrong Sentiment
- Manually override in Admin Panel
- Mark update as reviewed with correct sentiment
- Consider adding notes for future reference

## 📚 Resources

- OSRS News: https://secure.runescape.com/m=news/archive?oldschool=true
- OSRS Wiki: https://oldschool.runescape.wiki/w/Game_updates
- Dev Blogs: Check official website
- Polls: https://oldschool.runescape.wiki/w/Polls

---

**Built with:** Next.js, Supabase, OpenAI GPT-4o mini, Cheerio, Vercel Cron
