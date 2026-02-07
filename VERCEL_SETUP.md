# Vercel Environment Setup for Analytics

## ⚠️ Critical: Analytics Not Working in Production?

### Root Causes:
1. **Missing Supabase Migration** - The INSERT policy hasn't been added to production database
2. **Missing Environment Variable** - `SUPABASE_SERVICE_ROLE_KEY` not set in Vercel
3. **RLS Policy Blocks Writes** - Without the policy, all inserts fail

## ✅ Fix Steps

### Step 1: Run Migration in Production Supabase

Go to your Supabase Dashboard → SQL Editor and run:

```sql
-- Add INSERT policy to allow system to track analytics
CREATE POLICY "Service role can insert analytics"
  ON system_analytics FOR INSERT
  WITH CHECK (true);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_analytics_cost 
  ON system_analytics(cost_usd) 
  WHERE cost_usd IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_tokens 
  ON system_analytics(tokens_used) 
  WHERE tokens_used IS NOT NULL;
```

### Step 2: Verify Vercel Environment Variables

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Check that these are set:
   - ✅ `NEXT_PUBLIC_SUPABASE_URL`
   - ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - ✅ `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **MUST BE SET**
   - ✅ `OPENAI_API_KEY`

3. If `SUPABASE_SERVICE_ROLE_KEY` is missing:
   - Get it from Supabase Dashboard → Project Settings → API
   - Copy the `service_role` key (NOT the anon key)
   - Add to Vercel: `SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...`
   - **Redeploy** after adding

### Step 3: Verify Analytics Work

After fixing both issues above, check logs during next scan:

**Good (Success):**
```
✅ Analytics tracked: ai_scan_batch { cost: 0.0003, tokens: 619 }
```

**Bad (Still Failing):**
```
⚠️ SUPABASE_SERVICE_ROLE_KEY not set - analytics will fail due to RLS
```
OR
```
⚠️ Analytics tracking failed: { code: '42501', message: 'new row violates row-level security policy' }
```

### Step 4: View Analytics Dashboard

Once working, view at: `https://your-domain.vercel.app/admin`
- Go to **Analytics** tab
- See total costs, token usage, and event breakdown

## 🧪 Test Locally

```bash
# Test analytics tracking
curl -X POST http://localhost:3000/api/admin/test-analytics

# View analytics summary
curl http://localhost:3000/api/admin/test-analytics
```

## 📊 What Analytics Track

Every AI scan records:
- **Event Type:** `ai_scan_batch`
- **Cost:** $0.0003 per typical scan (gpt-4o-mini)
- **Tokens:** ~600-800 tokens per scan
- **User ID:** Who triggered the scan
- **Metadata:** Model used, batch size, success count

View accumulated costs over 7d/30d/90d periods in admin dashboard.
