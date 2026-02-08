-- Cached Alpha Feed System
-- Stores global AI analysis results shared across all users with cooldown

CREATE TABLE IF NOT EXISTS cached_alpha_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Analysis Results
    opportunities JSONB NOT NULL, -- Array of FlipOpportunity objects
    filtered_stage0 JSONB, -- Stage 0 filtered items
    ai_rejected JSONB, -- AI rejected items
    
    -- Metadata
    scanned_by_user_id UUID REFERENCES auth.users(id),
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '2 hours'),
    
    -- Stats
    total_opportunities INTEGER,
    total_rejected INTEGER,
    analysis_duration_seconds INTEGER,
    ai_cost_dollars DECIMAL(10, 4),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for finding latest valid cache
CREATE INDEX idx_cached_alpha_feed_expires ON cached_alpha_feed(expires_at DESC);
CREATE INDEX idx_cached_alpha_feed_created ON cached_alpha_feed(created_at DESC);

-- Function to get latest valid cached feed
CREATE OR REPLACE FUNCTION get_latest_cached_alpha_feed()
RETURNS TABLE (
    id UUID,
    opportunities JSONB,
    filtered_stage0 JSONB,
    ai_rejected JSONB,
    scanned_by_user_id UUID,
    scanned_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    total_opportunities INTEGER,
    total_rejected INTEGER,
    is_expired BOOLEAN,
    minutes_until_rescan INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.opportunities,
        c.filtered_stage0,
        c.ai_rejected,
        c.scanned_by_user_id,
        c.scanned_at,
        c.expires_at,
        c.total_opportunities,
        c.total_rejected,
        (c.expires_at < NOW()) as is_expired,
        GREATEST(0, EXTRACT(EPOCH FROM (c.expires_at - NOW()))::INTEGER / 60) as minutes_until_rescan
    FROM cached_alpha_feed c
    ORDER BY c.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to check if rescan is allowed
CREATE OR REPLACE FUNCTION can_rescan_alpha_feed()
RETURNS BOOLEAN AS $$
DECLARE
    latest_expires TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT expires_at INTO latest_expires
    FROM cached_alpha_feed
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Allow if no cache exists or expired
    RETURN (latest_expires IS NULL OR latest_expires < NOW());
END;
$$ LANGUAGE plpgsql;

-- Auto-cleanup old cache entries (keep last 10)
CREATE OR REPLACE FUNCTION cleanup_old_alpha_feed_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM cached_alpha_feed
    WHERE id NOT IN (
        SELECT id FROM cached_alpha_feed
        ORDER BY created_at DESC
        LIMIT 10
    );
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE cached_alpha_feed IS 'Global cached Alpha Feed analysis shared across all users with 2-hour cooldown';
COMMENT ON COLUMN cached_alpha_feed.opportunities IS 'Approved flip opportunities from AI analysis';
COMMENT ON COLUMN cached_alpha_feed.expires_at IS 'When this cache expires and allows rescan (2 hours from creation)';
COMMENT ON COLUMN cached_alpha_feed.scanned_by_user_id IS 'User who triggered the scan';
