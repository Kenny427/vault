-- AI Feedback & Learning System
-- Stores user feedback on AI recommendations to enable learning and improvement

CREATE TABLE IF NOT EXISTS ai_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Item & Recommendation Details
    item_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('accept', 'decline', 'skip', 'correct_rejection', 'wrong_rejection')),
    
    -- User Feedback
    reason TEXT,
    tags TEXT[], -- Array of quick tags selected
    user_confidence INTEGER CHECK (user_confidence >= 0 AND user_confidence <= 100),
    
    -- AI's Original Recommendation
    ai_confidence INTEGER,
    ai_thesis TEXT,
    ai_rejection_reason TEXT, -- For rejected items: what stage/reason
    price_at_feedback BIGINT,
    
    -- Context at time of feedback
    market_context JSONB, -- Can store additional market data if needed
    
    -- Outcome Tracking (filled in later)
    outcome TEXT CHECK (outcome IS NULL OR outcome IN ('win', 'loss', 'neutral', 'unknown')),
    profit_loss_pct DECIMAL,
    checked_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user ON ai_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_item ON ai_feedback(item_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_type ON ai_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_created ON ai_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_outcome ON ai_feedback(outcome) WHERE outcome IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_ai_feedback_updated_at
    BEFORE UPDATE ON ai_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- View for recent feedback summary
CREATE OR REPLACE VIEW ai_feedback_summary AS
SELECT 
    feedback_type,
    COUNT(*) as total_count,
    AVG(user_confidence) as avg_user_confidence,
    AVG(ai_confidence) as avg_ai_confidence,
    COUNT(*) FILTER (WHERE outcome = 'win') as wins,
    COUNT(*) FILTER (WHERE outcome = 'loss') as losses,
    AVG(profit_loss_pct) FILTER (WHERE outcome IS NOT NULL) as avg_profit_loss
FROM ai_feedback
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY feedback_type;

-- View for learning insights (most common feedback patterns)
CREATE OR REPLACE VIEW ai_learning_insights AS
SELECT 
    unnest(tags) as tag,
    feedback_type,
    COUNT(*) as frequency,
    AVG(user_confidence) as avg_confidence,
    COUNT(*) FILTER (WHERE outcome = 'win') as successful_outcomes,
    COUNT(*) FILTER (WHERE outcome = 'loss') as failed_outcomes
FROM ai_feedback
WHERE tags IS NOT NULL 
  AND array_length(tags, 1) > 0
  AND created_at > NOW() - INTERVAL '90 days'
GROUP BY unnest(tags), feedback_type
ORDER BY frequency DESC
LIMIT 50;

-- Function to get recent feedback for AI context
CREATE OR REPLACE FUNCTION get_recent_feedback_context(limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
    feedback_summary TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        format(
            '%s: "%s" (User: %s%%, AI: %s%%) - Tags: %s',
            initcap(feedback_type),
            COALESCE(reason, 'No specific reason'),
            user_confidence,
            ai_confidence,
            COALESCE(array_to_string(tags, ', '), 'none')
        )
    FROM ai_feedback
    WHERE created_at > NOW() - INTERVAL '7 days'
    ORDER BY created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE ai_feedback IS 'Stores user feedback on AI recommendations for learning and improvement';
COMMENT ON COLUMN ai_feedback.feedback_type IS 'Whether user accepted, declined, or skipped the recommendation';
COMMENT ON COLUMN ai_feedback.tags IS 'Quick tag reasons selected by user';
COMMENT ON COLUMN ai_feedback.outcome IS 'Actual outcome of the trade (filled in later for learning)';
COMMENT ON COLUMN ai_feedback.user_confidence IS 'How confident the user was in their decision (0-100)';
