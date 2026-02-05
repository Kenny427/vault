# Pool Management Guide

## Overview

Your analysis pool consists of **155 items** from `lib/expandedItemPool.ts`. The system now tracks which items get filtered out during analysis so you can optimize the pool over time.

## Accessing Pool Stats

1. Click the **⚙️ Settings** icon in the dashboard
2. Select **📊 Pool Stats**
3. You'll see:
   - **Total Tracked**: Items with filter history
   - **Total Filters**: Sum of all filters across all items
   - **Avg Filters**: Average times an item is filtered
   - **Table**: Detailed breakdown with sort options

## Understanding Filter Reasons

Items get filtered out for these reasons:

### "Above historical averages"
- **Meaning**: Current price ≥ 90-day OR 365-day average
- **Why filtered**: Mean-reversion strategy requires items to be undervalued
- **Action**: If consistently filtered, it's a bad candidate for mean-reversion flipping
- **Candidates for removal**: Items that fail this 5+ times

### "Weak signal (confidence X%, potential Y%)"
- **Meaning**: Confidence < 20% OR potential < 5%
- **Why filtered**: Not enough statistical edge to justify analysis
- **Action**: May indicate the item is too stable (good for hold, bad for flip)
- **Candidates for removal**: Items failing this 3+ times

### "Low liquidity (score X/10)"
- **Meaning**: Liquidity score < 3/10
- **Why filtered**: Not enough trading volume to flip profitably
- **Action**: Can't move volume quickly at desired prices
- **Candidates for removal**: Items failing this consistently

## How to Remove Items from Pool

### Option 1: Via Dashboard (Easiest)
1. Open **📊 Pool Stats**
2. Click "Remove" button next to an item
3. Item is marked as removed and won't appear in future analyses
4. This stores the removal in localStorage

### Option 2: Permanent Removal (Edit Pool File)
1. Open `lib/expandedItemPool.ts`
2. Find the item in the array
3. Delete the entire line, e.g.:
   ```typescript
   { id: 12645, name: "Dragon Darts", category: "ammo", botLikelihood: "medium", volumeTier: "high", demandType: "pvm" },
   ```
4. Save the file
5. Commit and push: `git add lib/expandedItemPool.ts && git commit -m "Remove Dragon Darts from pool"`
6. Deploy

## How to Add Items to Pool

### 1. Find the Item's ID
- Use the OSRS Wiki or Grand Exchange
- Note the item ID (e.g., 385 for Shark)

### 2. Get Item Details
- **Name**: Full item name (e.g., "Shark")
- **Category**: One of: `'runes' | 'ammo' | 'potions' | 'herbs' | 'resources' | 'bones' | 'food' | 'secondaries' | 'pvm_drops'`
- **Bot Likelihood**: `'very_high' | 'high' | 'medium'`
- **Volume Tier**: `'massive' | 'high' | 'medium'`
- **Demand Type**: `'constant' | 'pvm' | 'skilling'`

### 3. Add to Pool File
1. Open `lib/expandedItemPool.ts`
2. Find the appropriate category section (they're grouped)
3. Add a new line in the format:
   ```typescript
   { id: 385, name: "Shark", category: "food", botLikelihood: "very_high", volumeTier: "massive", demandType: "pvm" },
   ```
4. Save and commit:
   ```
   git add lib/expandedItemPool.ts && git commit -m "Add Shark to analysis pool"
   ```
5. Deploy

### Example Addition

**Before:**
```typescript
  // === FOOD (PvM Essential) ===
  { id: 385, name: "Shark", category: "food", botLikelihood: "very_high", volumeTier: "massive", demandType: "pvm" },
  { id: 383, name: "Raw shark", category: "food", botLikelihood: "very_high", volumeTier: "massive", demandType: "pvm" },
];
```

**After (add Monkfish):**
```typescript
  // === FOOD (PvM Essential) ===
  { id: 385, name: "Shark", category: "food", botLikelihood: "very_high", volumeTier: "massive", demandType: "pvm" },
  { id: 383, name: "Raw shark", category: "food", botLikelihood: "very_high", volumeTier: "massive", demandType: "pvm" },
  { id: 7946, name: "Monkfish", category: "food", botLikelihood: "very_high", volumeTier: "high", demandType: "pvm" },
];
```

## Optimization Strategy

### Weekly Review
- Check Pool Stats after 5-10 analyses
- Look for items with 5+ filters
- Identify patterns (e.g., "always above averages")

### Monthly Optimization
- Remove items filtered 5+ times
- Review new candidates to add
- Target pool size: **100-150 items** (optimal balance)

### Red Flags for Removal
1. **Filtered 5+ times** for same reason
2. **"Always above averages"** → Wrong for mean-reversion strategy
3. **Consistent low liquidity** → Can't actually trade
4. **Consistently weak signals** → Bad statistical properties

### Green Flags for Addition
1. New items recently added to OSRS
2. Items from same category as current winners
3. Items with high bot activity
4. Items with consistent daily volume

## Technical Details

### Filter Tracking
- Stored in localStorage as `osrs-filtered-stats`
- Updated after each analysis
- Tracks: count, last reason, timestamp
- Survives page reloads and browser restarts

### Item Removal
- Stored in localStorage as `osrs-removed-items`
- Array of item IDs
- Persists across sessions
- To undo: Clear from localStorage or remove ID manually

### Performance Impact
- **155 items**: ~30-40 pre-filtered → ~10-15 AI evaluated → ~5-8 approved
- **Removing 20 items**: ~135 items → ~25-35 pre-filtered → faster analysis
- **Target**: 100-120 items for 2-3 min analysis time

## Example Workflow

1. **Day 1**: Run 3 analyses, see filter stats accumulate
2. **Day 5**: Open Pool Stats, see "Dragon Darts" has 15 filters (all "above averages")
   - Click Remove → Item marked for removal
3. **Day 10**: Edit `expandedItemPool.ts`, delete Dragon Darts permanently
   - Commit and deploy
   - Next analysis runs 10% faster
4. **Day 15**: Add new item "Amethyst Javelin" that's trending
   - Edit pool file, add new entry
   - Deploy and monitor in next analysis

## Questions?

- **"Why is this item always filtered?"** → Check Pool Stats table for the reason
- **"Can I add custom items?"** → Yes! Edit the pool file following the format
- **"How do I undo a removal?"** → Open Pool Stats, stats will reset on next analysis
- **"What's the ideal pool size?"** → 100-150 items for good balance of speed vs. opportunities

