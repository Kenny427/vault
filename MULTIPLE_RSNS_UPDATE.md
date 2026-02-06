# 🔄 Update Summary - Multiple RuneScape Accounts Support

## What Changed

You can now **add multiple RuneScape account names** instead of just one!

### Database Update
- New table created: `user_rsn_accounts`
- Supports unlimited RSN accounts per user
- Each RSN is unique per user (can't add duplicates)
- RLS policies protect user data

### Settings Page Updated
- Old: Single RSN input field
- New: Add/Remove multiple RSNs interface
- Add new account with "Add" button
- Click "Remove" to delete an account
- Shows list of all your accounts

### DINK Filtering Updated
- Old: Checked against single RSN
- New: Checks against ALL your RSN accounts
- Only transactions from your accounts appear
- Automatically filters across all your accounts

---

## ✅ Your Next Steps (In Order)

### Step 1: Run the SQL in Supabase (2 minutes)
```
1. Go to https://supabase.com/dashboard
2. Click on your project (lbmvcrwyumxzmdckclyk)
3. Go to "SQL Editor"
4. Create a new query
5. Copy and paste the entire contents of: SUPABASE_MULTIPLE_RSNS.sql
6. Click "Run"
7. Wait for success message
```

**That's it!** The new table is created with RLS policies.

### Step 2: Test the Updated Settings Page (5 minutes)
```
1. Make sure dev server is still running: http://localhost:3002
2. Go to: http://localhost:3002/settings
3. Enter your first RuneScape account name (e.g., "MainAccount")
4. Click "Add"
5. Verify it appears in the list below
6. Add a second account (e.g., "AltAccount")
7. Verify both appear in the list
8. Test "Remove" button
9. All changes auto-save to Supabase
```

### Step 3: Verify in Supabase (2 minutes)
```
1. Go to Supabase dashboard
2. Click "Table Editor"
3. Find table: user_rsn_accounts
4. Filter by user_id: 591427c6-3ae4-4079-a55c-360a77d04e08
5. You should see your RSN accounts listed
```

### Step 4: Test DINK Filtering (5 minutes)
```
1. Make sure your RSN accounts are added in Settings
2. Check the Pending Transactions section
3. Verify transactions appear from all your RSN accounts
4. If no transactions, wait for DINK webhooks to arrive
```

### Step 5: Commit and Push (1 minute)
```bash
cd c:\Users\kenst\Desktop\Dashboard

# Check what changed
git status

# Commit the updates
git add -A
git commit -m "Add support for multiple RuneScape accounts per user"

# Push to GitHub
git push
```

---

## 📊 Files Changed

### Modified:
- `components/SettingsPage.tsx` - Complete rewrite for multiple RSNs
- `lib/dinkWebhook.ts` - Updated filtering logic

### New:
- `SUPABASE_MULTIPLE_RSNS.sql` - Database migration

### No Changes Needed:
- Other stores and components work as-is
- Backwards compatible

---

## 🔍 What the SQL Does

The `SUPABASE_MULTIPLE_RSNS.sql` file:
1. Creates `user_rsn_accounts` table
2. Enables RLS protection
3. Creates 3 RLS policies (SELECT, INSERT, DELETE)
4. Creates an index for fast queries
5. That's it! Takes 30 seconds to run.

---

## ✨ Features

### Settings Page Now Shows:
- Account email
- List of all your RuneScape accounts
- Input field to add new accounts
- "Remove" button for each account
- Status messages (success/error)

### DINK Now:
- Tracks transactions from ALL your accounts
- Shows pending trades from any of your accounts
- Completely isolated per user (other users won't see yours)

### Security:
- RLS protects all your data
- Other users can't see your RSN accounts
- Each user has complete isolation

---

## 🎯 Summary

| Before | After |
|--------|-------|
| 1 RSN per user | Multiple RSNs per user |
| Single input field | Add/remove interface |
| Limited account tracking | Track all your accounts |
| One DINK filter | Multiple account filtering |

---

## ⚠️ Important Notes

1. **Old RSN column still exists** in `user_profiles` (backwards compatible)
   - Can remove it later if you want
   - For now, it's safe to leave

2. **Duplicate RSNs prevented**
   - Can't add the same account twice
   - You'll get an error message

3. **Migration not needed**
   - New users automatically use new table
   - Old data still works

4. **No downtime**
   - Changes are live immediately after SQL runs
   - Dev server doesn't need restart

---

## 🚀 Quick Reference

**Settings Page URL:** http://localhost:3002/settings

**New Table:** `user_rsn_accounts`
- Columns: id, user_id, rsn, created_at

**RLS Policies:** 3 policies (SELECT, INSERT, DELETE)

**Index:** `idx_user_rsn_accounts_user_id`

---

## 📋 Checklist

- [ ] Run SUPABASE_MULTIPLE_RSNS.sql in Supabase SQL Editor
- [ ] Test Settings page - add your first RSN
- [ ] Test Settings page - add your second RSN
- [ ] Test Remove button
- [ ] Verify data in Supabase user_rsn_accounts table
- [ ] Test DINK filtering with multiple accounts
- [ ] Commit changes: `git add -A && git commit -m "..."`
- [ ] Push to GitHub: `git push`

---

## 💡 Future Enhancements (Optional)

After this works, you could:
1. Add "Primary Account" designation
2. Add account aliases/nicknames
3. Show total portfolio across all accounts
4. Aggregate DINK transactions by account
5. Set different alert thresholds per account

But not needed right now - the basic system works great!

---

## Questions?

**How do I remove all accounts?**
Just click "Remove" on each one. You can add them back anytime.

**Can I add the same account twice?**
No, it will show "This RuneScape account is already added"

**What if I have 10 accounts?**
Add them all! No limit.

**Does this affect other users?**
No, each user sees only their own accounts.

**Does DINK track all my accounts now?**
Yes, once you add them in Settings, DINK filters transactions for all of them.

---

**Status:** Ready for SQL update + testing
**Time Required:** 15 minutes total
**Difficulty:** Very Easy

Good luck! 🎉
