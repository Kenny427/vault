-- Game Updates Tracking System
-- This schema tracks OSRS game updates, dev blogs, and their impact on item prices

-- Main table for storing game updates
CREATE TABLE IF NOT EXISTS game_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    update_date TIMESTAMP WITH TIME ZONE NOT NULL,
    release_date TIMESTAMP WITH TIME ZONE, -- Actual release date if different from announcement
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('dev_blog', 'game_update', 'poll', 'news')),
    source_url TEXT,
    category TEXT, -- e.g., 'quest', 'combat', 'skilling', 'economy', 'pvp'
    impact_level TEXT DEFAULT 'medium' CHECK (impact_level IN ('low', 'medium', 'high')),
    overall_sentiment TEXT DEFAULT 'neutral' CHECK (overall_sentiment IN ('bullish', 'bearish', 'neutral', 'mixed')),
    is_reviewed BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE, -- Can be deactivated if found irrelevant
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table linking updates to specific items
CREATE TABLE IF NOT EXISTS update_item_impacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    update_id UUID NOT NULL REFERENCES game_updates(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    impact_type TEXT NOT NULL CHECK (impact_type IN (
        'requirement',      -- Item needed for quest/activity
        'reward',          -- Item dropped/rewarded
        'buff',            -- Item/content buffed
        'nerf',            -- Item/content nerfed
        'drop_rate_increase', -- Better drop rates
        'drop_rate_decrease', -- Worse drop rates
        'new_method',      -- New way to obtain/use item
        'removal',         -- Content removed/disabled
        'related'          -- Indirectly related
    )),
    sentiment TEXT NOT NULL CHECK (sentiment IN ('bullish', 'bearish', 'neutral')),
    confidence INTEGER DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100), -- 0-100
    quantity INTEGER, -- If mentioned: "requires 100 dragon bones"
    notes TEXT,
    is_verified BOOLEAN DEFAULT FALSE, -- Admin reviewed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_game_updates_date ON game_updates(update_date DESC);
CREATE INDEX IF NOT EXISTS idx_game_updates_source ON game_updates(source_type);
CREATE INDEX IF NOT EXISTS idx_game_updates_active ON game_updates(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_game_updates_reviewed ON game_updates(is_reviewed);
CREATE INDEX IF NOT EXISTS idx_update_impacts_update ON update_item_impacts(update_id);
CREATE INDEX IF NOT EXISTS idx_update_impacts_item ON update_item_impacts(item_id);
CREATE INDEX IF NOT EXISTS idx_update_impacts_item_name ON update_item_impacts(item_name);
CREATE INDEX IF NOT EXISTS idx_update_impacts_type ON update_item_impacts(impact_type);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_game_updates_updated_at ON game_updates;
CREATE TRIGGER update_game_updates_updated_at
    BEFORE UPDATE ON game_updates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_update_item_impacts_updated_at ON update_item_impacts;
CREATE TRIGGER update_update_item_impacts_updated_at
    BEFORE UPDATE ON update_item_impacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- View for getting recent updates with impact counts
CREATE OR REPLACE VIEW recent_updates_summary AS
SELECT 
    gu.id,
    gu.update_date,
    gu.release_date,
    gu.title,
    gu.source_type,
    gu.category,
    gu.impact_level,
    gu.overall_sentiment,
    gu.is_reviewed,
    COUNT(DISTINCT uii.item_id) as affected_items_count,
    ARRAY_AGG(DISTINCT uii.item_name) FILTER (WHERE uii.item_name IS NOT NULL) as affected_items
FROM game_updates gu
LEFT JOIN update_item_impacts uii ON gu.id = uii.update_id
WHERE gu.is_active = TRUE
GROUP BY gu.id, gu.update_date, gu.release_date, gu.title, gu.source_type, 
         gu.category, gu.impact_level, gu.overall_sentiment, gu.is_reviewed
ORDER BY gu.update_date DESC
LIMIT 50;

-- View for getting item-specific update history
CREATE OR REPLACE VIEW item_update_history AS
SELECT 
    uii.item_id,
    uii.item_name,
    uii.impact_type,
    uii.sentiment,
    uii.confidence,
    uii.quantity,
    uii.notes,
    gu.update_date,
    gu.release_date,
    gu.title,
    gu.content,
    gu.source_type,
    gu.source_url,
    gu.category,
    gu.impact_level
FROM update_item_impacts uii
JOIN game_updates gu ON uii.update_id = gu.id
WHERE gu.is_active = TRUE
ORDER BY gu.update_date DESC;

-- Comments for documentation
COMMENT ON TABLE game_updates IS 'Stores OSRS game updates, dev blogs, polls, and news articles';
COMMENT ON TABLE update_item_impacts IS 'Links game updates to specific items they affect';
COMMENT ON COLUMN game_updates.impact_level IS 'Overall market impact: low, medium, or high';
COMMENT ON COLUMN game_updates.overall_sentiment IS 'General market direction: bullish, bearish, neutral, or mixed';
COMMENT ON COLUMN update_item_impacts.confidence IS 'How confident we are this update affects this item (0-100)';
COMMENT ON COLUMN update_item_impacts.sentiment IS 'Expected price direction for this specific item';
