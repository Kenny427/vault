-- Fix RLS policies for custom_pool_items
-- The issue: policies check auth.users table which regular users can't access
-- Solution: Allow all authenticated users to read enabled items

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage pool items" ON custom_pool_items;
DROP POLICY IF EXISTS "Users can view enabled pool items" ON custom_pool_items;

-- Create new policies that work for everyone
CREATE POLICY "Anyone can view enabled pool items"
  ON custom_pool_items FOR SELECT
  USING (enabled = TRUE);

CREATE POLICY "Admins can manage all pool items"
  ON custom_pool_items FOR ALL
  USING (
    auth.jwt() ->> 'email' = 'kenstorholt@gmail.com'
  );

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'custom_pool_items';
