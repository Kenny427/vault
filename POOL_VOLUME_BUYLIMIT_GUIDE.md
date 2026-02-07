# Buy Limit & Volume Display - Setup Guide

## Overview
Added buy limit and daily volume display to the admin pool editor. This helps you make informed decisions about which items to keep in your pool based on GE buy limits and trading activity.

## What Was Added

### Database Changes
- **New columns** in `custom_pool_items` table:
  - `buy_limit` (INTEGER): GE buy limit (4-hour window)
  - `daily_volume` (BIGINT): Average daily trading volume
  - `last_volume_update` (TIMESTAMPTZ): When data was last fetched
- **New index**: `idx_pool_daily_volume` for fast sorting by volume

### API Changes
- **New endpoint**: `/api/admin/pool/update-volumes`
  - Fetches buy limits from OSRS Wiki mapping API
  - Fetches daily volumes from OSRS Wiki price history API
  - Updates all enabled pool items in batches
  - Takes ~2-5 minutes for 795 items

### UI Changes
- **ManualPoolEditor.tsx**: 
  - Added "Update Volumes" button (purple button next to "Add Item")
  - Added two new columns to the pool items table:
    - **Buy Limit**: Shows GE 4-hour buy limit (e.g., "12,000")
    - **Daily Volume**: Shows formatted volume (e.g., "6.17M", "438K")

## Setup Steps

### 1. Run Database Migration
```bash
# Option 1: Run via Supabase SQL Editor
# Copy contents of supabase/migrations/20260207_add_pool_volume_buylimit.sql
# Paste into Supabase dashboard SQL editor and run

# Option 2: Run via psql if you have connection string
psql "your-supabase-connection-string" -f supabase/migrations/20260207_add_pool_volume_buylimit.sql
```

### 2. Initial Data Population
1. Navigate to your admin panel pool editor
2. Click the purple "📊 Update Volumes" button
3. Confirm the prompt (this will take 2-5 minutes)
4. Wait for completion notification

### 3. Verify Data
After update completes:
- You should see buy limits in the new column (e.g., Zulrah's scales: 12,000)
- You should see formatted volumes (e.g., Blood rune: 9.08M/day)
- Items without data will show "-"

## How It Works

### Data Sources
1. **Buy Limits**: Fetched from OSRS Wiki mapping API
   - Endpoint: `https://prices.runescape.wiki/api/v1/osrs/mapping`
   - Returns official GE buy limits for all items
   
2. **Daily Volumes**: Calculated from OSRS Wiki price history
   - Uses last 7 days of trading data
   - Averages `highPriceVolume + lowPriceVolume` per day
   - More accurate than static JSON file

### Volume Update Process
```typescript
For each enabled pool item:
  1. Fetch buy limit from mapping API
  2. Fetch 7-day price history with volumes
  3. Calculate average daily volume
  4. Update database with both values
  5. Mark last_volume_update timestamp
```

### Volume Display Format
- **Millions**: 6,170,000 → "6.17M"
- **Thousands**: 438,000 → "438K"  
- **Under 1K**: 542 → "542"

## Usage Tips

### When to Update Volumes
- **Weekly**: Update volumes weekly to catch market changes
- **After adding items**: Run update after bulk-adding new items
- **Before cleanup**: Update before removing items to verify low volumes

### Interpreting Data

#### Buy Limits Matter
- **High limit (10K+)**: Can accumulate positions quickly
- **Low limit (100-1K)**: Slower accumulation, avoid for high-volume strategies
- **Example**: Zulrah's scales (12K limit) vs Death rune (500 limit)

#### Volume Indicates Activity
- **>1M/day**: Extremely liquid, easy to enter/exit
- **100K-1M/day**: Good liquidity for mean-reversion
- **<100K/day**: Lower liquidity, higher risk
- **Example**: Blood rune (9.08M) vs exotic Varlamore items (<10K)

### Cleanup Strategy
Use the new columns to identify removal candidates:
```sql
-- Low volume items (under 50K/day)
SELECT item_name, daily_volume, buy_limit 
FROM custom_pool_items 
WHERE daily_volume < 50000 
AND enabled = true
ORDER BY daily_volume DESC;

-- Low buy limit items (under 500)
SELECT item_name, buy_limit, daily_volume
FROM custom_pool_items
WHERE buy_limit < 500
AND enabled = true
ORDER BY buy_limit DESC;
```

## API Rate Limiting

The update endpoint is designed to be API-friendly:
- **Batch size**: 10 items per batch
- **Delay**: 200ms between batches
- **Timeout**: 5 minutes max execution time
- **Error handling**: Continues on individual item failures

## Database Query Examples

### Top volume items
```sql
SELECT item_name, daily_volume, buy_limit
FROM custom_pool_items
WHERE enabled = true
ORDER BY daily_volume DESC NULLS LAST
LIMIT 20;
```

### Items needing volume update
```sql
SELECT item_name, last_volume_update
FROM custom_pool_items
WHERE enabled = true
AND (last_volume_update IS NULL OR last_volume_update < NOW() - INTERVAL '7 days')
ORDER BY item_name;
```

### Volume distribution
```sql
SELECT 
  CASE 
    WHEN daily_volume >= 1000000 THEN '>1M'
    WHEN daily_volume >= 100000 THEN '100K-1M'
    WHEN daily_volume >= 10000 THEN '10K-100K'
    WHEN daily_volume >= 1000 THEN '1K-10K'
    ELSE '<1K'
  END as volume_tier,
  COUNT(*) as item_count
FROM custom_pool_items
WHERE enabled = true
GROUP BY volume_tier
ORDER BY MIN(daily_volume) DESC;
```

## Troubleshooting

### Update Times Out
- **Cause**: Too many items or slow API responses
- **Solution**: The endpoint has 5-minute timeout; should complete within 3-4 minutes for 795 items

### Missing Volume Data
- **Cause**: Some items may not have trading history on Wiki
- **Solution**: Normal; niche items may show "-" for volume

### Buy Limit Shows "-"
- **Cause**: Item not in Wiki mapping database (very rare)
- **Solution**: These are likely obsolete items; consider removing

### Update Fails Entirely
- **Check**: Admin authentication (must be logged in as admin)
- **Check**: API is accessible (https://prices.runescape.wiki/api/v1/osrs/mapping)
- **Check**: Database has new columns (run migration first)

## Next Steps

1. **Run migration** (required first step)
2. **Initial volume update** (click Update Volumes button)
3. **Review data**: High-volume items should show millions, low-volume items show thousands or hundreds
4. **Use for cleanup**: Identify low-volume items to remove from pool
5. **Schedule updates**: Set reminder to update volumes weekly

## Expected Results

After initial update, you should see:
- **High-volume items**: Blood rune (9.08M), Zulrah's scales (6.17M), Dragon bones (3.39M)
- **Medium-volume items**: Oak plank (438K), Astral rune (2.88M)
- **Low-volume items**: Varlamore gear (<10K), niche items (<100K)
- **Buy limits**: Most skilling items (10-13K), runes (500-25K), high-value items (varies)

This data makes it easy to spot items that don't fit your mean-reversion strategy (low volume + low buy limit = hard to trade profitably).
