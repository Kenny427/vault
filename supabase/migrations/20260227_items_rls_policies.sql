-- RLS policies for items table (needed for /api/items/search)

-- Enable RLS if not already enabled
ALTER TABLE IF EXISTS items ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read items (for thesis creation)
DROP POLICY IF EXISTS "Authenticated users can read items" ON items;
CREATE POLICY "Authenticated users can read items"
  ON items FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role to manage items (for cron tick population)
DROP POLICY IF EXISTS "Service role can manage items" ON items;
CREATE POLICY "Service role can manage items"
  ON items FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
