# ⚠️ MIGRATION INSTRUCTIONS

Since you've already run `20260206_admin_features.sql`, you only need to run these **2 NEW migrations**:

## Run in this order:

### 1️⃣ Pool Management Tables
```sql
-- File: 20260206_pool_management.sql
-- Creates: custom_pool_items, item_performance_tracking, rate_limits tables
```

### 2️⃣ Populate Pool with 113 Items
```sql
-- File: 20260206_populate_pool.sql
-- Inserts: All 113 items from your existing EXPANDED_ITEM_POOL
```

## How to Run:

### Option A: Supabase Dashboard (Recommended)
1. Go to your Supabase project
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy contents of `20260206_pool_management.sql` → Paste → Run
5. Click **New Query** again
6. Copy contents of `20260206_populate_pool.sql` → Paste → Run

### Option B: Supabase CLI
```bash
# If you have Supabase CLI set up
supabase db push
```

## ✅ After Running:

Your alpha feed will automatically:
- Fetch items from the database
- Track AI feedback (approved/rejected)
- Show performance metrics in Pool Insights

## 🔍 Verify It Worked:

Run this query in SQL Editor:
```sql
SELECT COUNT(*) as total_items FROM custom_pool_items WHERE enabled = true;
```

Should return: **113 items**

---

**DO NOT re-run `20260206_admin_features.sql`** - it's already been applied!
