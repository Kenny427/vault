-- Add buy_limit and daily_volume columns to custom_pool_items table
-- This allows tracking of GE buy limits and trading volumes for each item

ALTER TABLE custom_pool_items 
ADD COLUMN IF NOT EXISTS buy_limit INTEGER,
ADD COLUMN IF NOT EXISTS daily_volume BIGINT,
ADD COLUMN IF NOT EXISTS last_volume_update TIMESTAMPTZ;

-- Add index for easy filtering by volume
CREATE INDEX IF NOT EXISTS idx_pool_daily_volume ON custom_pool_items(daily_volume DESC)
WHERE enabled = true;

-- Comment on new columns
COMMENT ON COLUMN custom_pool_items.buy_limit IS 'GE buy limit (4-hour window) from OSRS Wiki API';
COMMENT ON COLUMN custom_pool_items.daily_volume IS 'Average daily trading volume from OSRS Wiki API';
COMMENT ON COLUMN custom_pool_items.last_volume_update IS 'Last time volume data was fetched';
