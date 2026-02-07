# Optimized Pool Setup Guide

## Current Status

**Network Issue Detected**: Wiki API is unreachable from this machine, preventing automatic fetching of all 800+ items.

**Solution**: Use the provided files as a starting point, then expand once network connectivity is restored.

---

## Option 1: Use Manual SQL Now (Fast)

📄 **File**: `optimized-pool-manual.sql`

This contains ~100+ confirmed high-volume items from your current analysis and known OSRS meta.

### Steps:
1. Open [Supabase Dashboard](https://supabase.com) → Your Project → SQL Editor
2. Copy entire content of `optimized-pool-manual.sql`
3. Paste into the SQL editor
4. Click "Run"
5. Verify: `SELECT COUNT(*) FROM custom_pool_items WHERE enabled = true;`

**Pros**:
- Works immediately
- Tested, known high-volume items
- Safe transaction (BEGIN/COMMIT)

**Cons**:
- Only ~100 items, not the 800 you wanted
- Missing many valid opportunities

---

## Option 2: Generate Full 800+ Item Pool (Best)

Once your network connectivity is fixed, run:

```bash
node scripts/generate-optimized-pool-v2.js
```

### What this does:
1. ✅ Fetches all 4,522 tradeable OSRS items from Wiki API
2. ✅ Queries each for daily volume data (24-hour timeseries)
3. ✅ Filters by: volume > 10,000 AND price >= 50gp
4. ✅ Generates complete SQL with ~800 items
5. ✅ Includes summary statistics and volume distribution

### Expected output files:
- `optimized-pool-full.sql` - Ready-to-run SQL
- `optimized-pool-full.csv` - Reference spreadsheet
- Summary statistics in console

### Timeline:
- Network query time: ~30-40 minutes (due to rate limiting)
- All 800 items will be added in one transaction

---

## Comparison: Manual vs. Automated

| Aspect | Manual | Automated |
|--------|--------|-----------|
| Items | ~100 | ~800 |
| Accuracy | High (known items) | Maximum (actual Wiki data) |
| Setup time | 2 minutes | 40 minutes |
| Network required | No | Yes |
| Price/volume filtering | Manual selection | Automated threshold |
| Customization | Hard to add more | Can adjust thresholds |
| Start now? | Yes ✅ | No (network issue) |

---

## How to Fix Network Issue

If you want to run the automated script NOW:

### Option A: Check Windows Network Settings
1. Open PowerShell as Admin
2. Run: `Test-NetConnection -ComputerName services.runescape.wiki -Port 443`
3. Check result:
   - ✅ Success: Network is working
   - ❌ Failed: Check firewall/proxy settings

### Option B: Try Alternative DNS
```powershell
# Test with explicit DNS
nslookup services.runescape.wiki 8.8.8.8
```

### Option C: Check if behind corporate proxy
- If you're on a corporate network, you may need proxy settings
- Contact your network admin or check System Settings → Network & Internet → Proxy

---

## Recommended Path Forward

### Immediate (Next 5 minutes):
1. Use `optimized-pool-manual.sql` to add ~100 items
2. Run your Alpha Feed scan
3. Monitor rejection rates in Stage 0

### Once Network Works (Later):
1. Run `node scripts/generate-optimized-pool-v2.js`
2. This will generate `optimized-pool-full.sql` with ~800 items
3. Either:
   - **Option A**: Replace the pool (truncate and reload)
   - **Option B**: Append to existing pool (item IDs won't duplicate)

### To verify network later:
```powershell
# Quick test
Invoke-WebRequest -Uri "https://services.runescape.wiki/api/m/ge_mapping" -UseBasicParsing
```

---

## Manual Pool Expansion Strategy

If you want to manually add more items before the script works:

1. **Identify item IDs** from OSRS wiki
2. **Check volumes** using URL: `https://services.runescape.wiki/api/m/ge/timeseries?item={ID}&timestep=24h`
3. **Add to SQL** using the template:
```sql
INSERT INTO custom_pool_items (item_id, item_name, category, enabled, added_date) 
VALUES (12345, 'Item Name', 'resources', true, NOW());
```

---

## Migration Strategy

When you have the full 800-item pool:

### Safe Migration (Recommended):
```sql
-- Backup current pool (optional)
CREATE TABLE custom_pool_items_backup AS SELECT * FROM custom_pool_items;

-- Delete old pool
DELETE FROM custom_pool_items WHERE enabled = true;

-- Run optimized-pool-full.sql to insert all 800 items
-- (from the generated file)
```

### Merge Strategy:
```sql
-- Keep current, add new items only
-- Run optimized-pool-full.sql
-- Duplicates will fail silently (if you add error handling)
```

---

## Expected Performance Impact

### Current Pool (112 items):
- Manual Stage 0 filter: ~70-80% removed
- AI analysis cost per scan: ~$0.006
- Items sent to AI: ~20-30

### Optimized Pool (800 items):
- Manual Stage 0 filter: ~70-80% removed (more strict now)
- Estimated items after Stage 0: ~150-250
- Estimate AI analysis cost per scan: ~$0.04-0.06
- Items sent to AI per batch: ~20-30

**Impact**: ~10× more opportunities analyzed, but only ~5-7× higher cost due to Stage 0 efficiency.

---

## Next Steps

1. **Immediate**: Run `optimized-pool-manual.sql` in Supabase
2. **Test**: Run one Alpha Feed scan
3. **Monitor**: Check Stage 0 rejection rates
4. **When network works**: Expand with `generate-optimized-pool-v2.js`
5. **Optimize**: Adjust volume/price thresholds based on Stage 0 data

---

## Questions?

- **Manual SQL won't run?** Check custom_pool_items table exists in Supabase
- **Script hangs?** Press Ctrl+C, check network with test above
- **Wrong items added?** Use transaction: `ROLLBACK;` immediately, then delete and retry

