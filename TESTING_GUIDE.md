# Testing Guide - Account-Based Data Persistence

## ✅ Infrastructure Status

All account-based persistence infrastructure is now in place and ready for testing:

- ✅ **Supabase Schema:** Tables with RLS policies created
- ✅ **Zustand Stores:** All updated with Supabase sync
- ✅ **Settings Page:** Created at `/settings` route
- ✅ **DINK RSN Filtering:** Implemented in dinkWebhook.ts
- ✅ **Dev Server:** Running on http://localhost:3002

## Test 1: Settings Page & RSN Configuration

### Steps:
1. **Open Settings Page**
   - Navigate to http://localhost:3002/settings
   - You should see the "Account Settings" page
   - The "RuneScape Name (RSN)" input field should be empty

2. **Enter Your RuneScape Account Name**
   - Click the RSN input field
   - Type your RuneScape account name (e.g., "TestAccount" or your actual RSN)
   - Click the "Save RSN" button

3. **Verify Success**
   - A green success message should appear: "✓ RSN saved successfully!"
   - Message should disappear after 3 seconds
   - Refresh the page - the RSN should still be there (persisted in Supabase)

4. **Check Supabase Database**
   - Go to your Supabase dashboard
   - Navigate to: SQL Editor or Table Editor
   - Query the `user_profiles` table:
     ```sql
     SELECT id, rsn FROM user_profiles WHERE id = '591427c6-3ae4-4079-a55c-360a77d04e08';
     ```
   - You should see your RSN saved in the database

### Expected Result:
✅ RSN is saved to Supabase and persists across page refreshes

---

## Test 2: Data Sync - Favorites

### Steps:
1. **Add a Favorite on Device 1 (Current)**
   - Navigate to the main dashboard
   - Search for an item
   - Click the heart/favorite icon
   - Item should appear in your Favorites list

2. **Verify in Supabase**
   - Go to Supabase dashboard
   - Check the `favorites` table
   - Filter by `user_id = '591427c6-3ae4-4079-a55c-360a77d04e08'`
   - You should see your favorite item with entry: `{user_id: "...", item_id: "...", item_name: "..."}`

3. **Test on Device 2 (Different Browser/Incognito)**
   - Open a new browser or incognito window
   - Log in with your account
   - Navigate to Favorites section
   - The favorite you just added should appear automatically
   - This proves cross-device sync is working!

### Expected Result:
✅ Favorite syncs to Supabase and loads on different devices

---

## Test 3: Data Sync - Portfolio Items

### Steps:
1. **Add a Portfolio Item on Device 1**
   - Navigate to Portfolio section
   - Click "Add Item" or similar button
   - Enter item details (item name, quantity, buy price, etc.)
   - Save the portfolio item

2. **Verify in Supabase**
   - Go to Supabase dashboard
   - Check the `portfolio_items` table
   - Filter by `user_id = '591427c6-3ae4-4079-a55c-360a77d04e08'`
   - You should see your portfolio item with all entered data

3. **Test on Device 2**
   - Open dashboard on different browser/device
   - Log in with your account
   - Go to Portfolio section
   - The portfolio item should appear automatically

### Expected Result:
✅ Portfolio items sync to Supabase and load on different devices

---

## Test 4: Data Sync - Item Notes

### Steps:
1. **Add a Note on Device 1**
   - Navigate to any item page or search result
   - Click on an item
   - Add a note/comment
   - Save the note

2. **Verify in Supabase**
   - Go to Supabase dashboard
   - Check the `item_notes` table
   - Filter by `user_id = '591427c6-3ae4-4079-a55c-360a77d04e08'`
   - You should see your note with: `{user_id: "...", item_id: "...", notes: "..."}`

3. **Test on Device 2**
   - Open dashboard on different browser/device
   - Search for the same item
   - The note should appear automatically

### Expected Result:
✅ Notes sync to Supabase and load on different devices

---

## Test 5: DINK RSN Filtering

### Steps:
1. **Verify Your RSN is Set**
   - Go to Settings page (http://localhost:3002/settings)
   - Confirm your RSN is saved

2. **Check Pending Transactions**
   - Navigate to the main dashboard
   - Look for "Pending Transactions" or GE trades section
   - If DINK is sending webhooks, you should see transactions

3. **Verify Filtering**
   - The transactions shown should match your RSN
   - Example: If your RSN is "TestAccount", only trades from "TestAccount" should show
   - Go to Supabase and check `pending_transactions` table:
     ```sql
     SELECT username, item_name, type, user_id FROM pending_transactions 
     WHERE user_id = '591427c6-3ae4-4079-a55c-360a77d04e08';
     ```
   - All entries should have your RSN as the username

4. **Test Multi-User Isolation** (if applicable)
   - If another user account is available, log in as them
   - They should NOT see your transactions
   - They should only see transactions from their own RSN

### Expected Result:
✅ Only your account's transactions appear, demonstrating account isolation

---

## Test 6: Price Alerts Sync

### Steps:
1. **Create a Price Alert on Device 1**
   - Navigate to an item page
   - Set a price alert (e.g., "Alert me if price drops below 1000gp")
   - Save the alert

2. **Verify in Supabase**
   - Go to Supabase dashboard
   - Check the `price_alerts` table
   - Filter by `user_id = '591427c6-3ae4-4079-a55c-360a77d04e08'`
   - You should see your price alert

3. **Refresh Page - Alert Persists**
   - Refresh the dashboard page
   - The price alert should still appear
   - This proves data is synced to Supabase and reloaded on startup

### Expected Result:
✅ Price alerts persist in Supabase and load on page refresh

---

## Test 7: Account Isolation - RLS Verification

### Steps:
1. **Verify No Data Leakage** (if multiple users available)
   - User A logs in
   - Note their favorites/portfolio items
   - Log out and log in as User B
   - User B should NOT see User A's data
   - Each user should only see their own data

2. **Check Supabase RLS Policies**
   - Go to Supabase dashboard
   - Navigate to any table (e.g., `favorites`)
   - Click on "RLS" or "Row Level Security"
   - Verify policies enforce `auth.uid() = user_id`

### Expected Result:
✅ RLS prevents users from seeing each other's data

---

## Test 8: Build Verification

### Steps:
1. **Run Production Build**
   - In terminal, run: `npm run build`
   - Check for any TypeScript errors (only warnings are expected)
   - Note: Daily-briefing API may timeout during pre-rendering (not critical)

2. **Verify No Breaking Errors**
   - Build should complete successfully
   - No "error" messages in output (warnings are fine)

### Expected Result:
⚠️ Build completes (pre-rendering timeout on daily-briefing is known issue)

---

## Troubleshooting

### RSN Not Saving
- **Check:** Supabase connection and auth token
- **Solution:** Verify NEXT_PUBLIC_SUPABASE_URL and keys are correct in .env.local
- **Debug:** Check browser console for error messages

### Data Not Syncing Across Devices
- **Check:** Are you logged in as the same user on both devices?
- **Solution:** Make sure both devices use the same email/account
- **Debug:** Check Supabase that user_id is the same on both devices

### DINK Filtering Not Working
- **Check:** Is RSN set in Settings?
- **Solution:** Go to /settings and confirm your RSN is saved
- **Debug:** Check Supabase user_profiles table for RSN value

### Permission Denied Errors (403/406)
- **Check:** RLS policies on tables
- **Solution:** Run the SUPABASE_SETUP.sql file in Supabase SQL editor
- **Debug:** Check Supabase RLS policies are enabled on all tables

---

## Success Criteria

### ✅ Account Isolation
- [ ] Each user only sees their own data
- [ ] RLS policies prevent unauthorized access
- [ ] No cross-user data leakage

### ✅ Cross-Device Sync
- [ ] Favorites sync across devices
- [ ] Portfolio items sync across devices
- [ ] Notes sync across devices
- [ ] Price alerts sync across devices

### ✅ DINK Integration
- [ ] RSN setting is saved
- [ ] Only user's account transactions appear
- [ ] Multi-user accounts are isolated

### ✅ Data Persistence
- [ ] Data survives page refreshes
- [ ] Data persists for multiple sessions
- [ ] Supabase is the source of truth

---

## Next Steps After Testing

1. **If tests pass:** 
   - Run `git add -A && git commit -m "Add RSN settings and account-based DINK isolation"`
   - Push to GitHub: `git push`

2. **If tests fail:**
   - Check error messages in browser console
   - Verify Supabase connection in .env.local
   - Check that tables exist in Supabase
   - Run SUPABASE_SETUP.sql if needed

3. **Production Deployment:**
   - Fix daily-briefing build timeout (optional for now)
   - Deploy to Vercel/hosting
   - Monitor for any errors

---

## Documentation Files

- **ACCOUNT_PERSISTENCE_READY.md** - Overview of implementation
- **SUPABASE_SETUP.sql** - SQL to set up database schema
- **IMPLEMENTATION_GUIDE.md** - Detailed technical guide
- **lib/supabaseServices.ts** - Helper functions for Supabase operations

---

**Status:** ✅ Ready for testing
**Dev Server:** http://localhost:3002
**Settings Page:** http://localhost:3002/settings
