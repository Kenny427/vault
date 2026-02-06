-- Quick fix: Just add the UNIQUE constraint if it doesn't exist
-- Run this instead of the full pool_management.sql

-- Add unique constraint to item_id (if not already there)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'custom_pool_items_item_id_key'
  ) THEN
    ALTER TABLE custom_pool_items ADD CONSTRAINT custom_pool_items_item_id_key UNIQUE (item_id);
  END IF;
END $$;

-- Verify it worked
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'custom_pool_items_item_id_key'
    ) 
    THEN '✅ Unique constraint exists - ready to populate!'
    ELSE '❌ Constraint missing - something went wrong'
  END as status;
