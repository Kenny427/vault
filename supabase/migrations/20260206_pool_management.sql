-- Extension to admin features migration
-- Add pool management, rate limiting, and performance tracking

-- ============================================
-- CUSTOM POOL ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS custom_pool_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id INTEGER NOT NULL UNIQUE,
  item_name TEXT NOT NULL,
  category TEXT,
  priority INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT TRUE,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pool_items_enabled ON custom_pool_items(enabled);
CREATE INDEX IF NOT EXISTS idx_pool_items_priority ON custom_pool_items(priority DESC);
CREATE INDEX IF NOT EXISTS idx_pool_items_category ON custom_pool_items(category);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pool_items_item_id ON custom_pool_items(item_id);


-- ============================================
-- ITEM PERFORMANCE TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS item_performance_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  times_analyzed INTEGER DEFAULT 0,
  times_approved INTEGER DEFAULT 0,
  times_rejected INTEGER DEFAULT 0,
  total_roi_potential DECIMAL(10, 2) DEFAULT 0,
  avg_confidence_score DECIMAL(5, 2) DEFAULT 0,
  last_analyzed_at TIMESTAMPTZ,
  last_approved_at TIMESTAMPTZ,
  success_rate DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE 
      WHEN times_analyzed > 0 THEN (times_approved::DECIMAL / times_analyzed::DECIMAL * 100)
      ELSE 0
    END
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id)
);

CREATE INDEX IF NOT EXISTS idx_perf_item ON item_performance_tracking(item_id);
CREATE INDEX IF NOT EXISTS idx_perf_success ON item_performance_tracking(success_rate DESC);
CREATE INDEX IF NOT EXISTS idx_perf_analyzed ON item_performance_tracking(times_analyzed DESC);

-- ============================================
-- RATE LIMITS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  daily_limit INTEGER DEFAULT 100,
  current_usage INTEGER DEFAULT 0,
  last_reset TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user ON rate_limits(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Custom Pool Items: Admins can manage, users can view enabled items
ALTER TABLE custom_pool_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pool items"
  ON custom_pool_items FOR ALL
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'kenstorholt@gmail.com'
  ));

CREATE POLICY "Users can view enabled pool items"
  ON custom_pool_items FOR SELECT
  USING (enabled = TRUE);

-- Item Performance: Admins only
ALTER TABLE item_performance_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view item performance"
  ON item_performance_tracking FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'kenstorholt@gmail.com'
  ));

-- Rate Limits: Admins can manage, users can view their own
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage rate limits"
  ON rate_limits FOR ALL
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'kenstorholt@gmail.com'
  ));

CREATE POLICY "Users can view their own rate limits"
  ON rate_limits FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update item performance when analysis completes
CREATE OR REPLACE FUNCTION update_item_performance(
  p_item_id INTEGER,
  p_item_name TEXT,
  p_approved BOOLEAN,
  p_roi_potential DECIMAL,
  p_confidence DECIMAL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO item_performance_tracking (
    item_id,
    item_name,
    times_analyzed,
    times_approved,
    times_rejected,
    total_roi_potential,
    avg_confidence_score,
    last_analyzed_at,
    last_approved_at
  ) VALUES (
    p_item_id,
    p_item_name,
    1,
    CASE WHEN p_approved THEN 1 ELSE 0 END,
    CASE WHEN NOT p_approved THEN 1 ELSE 0 END,
    COALESCE(p_roi_potential, 0),
    COALESCE(p_confidence, 0),
    NOW(),
    CASE WHEN p_approved THEN NOW() ELSE NULL END
  )
  ON CONFLICT (item_id) DO UPDATE SET
    times_analyzed = item_performance_tracking.times_analyzed + 1,
    times_approved = item_performance_tracking.times_approved + CASE WHEN p_approved THEN 1 ELSE 0 END,
    times_rejected = item_performance_tracking.times_rejected + CASE WHEN NOT p_approved THEN 1 ELSE 0 END,
    total_roi_potential = item_performance_tracking.total_roi_potential + COALESCE(p_roi_potential, 0),
    avg_confidence_score = (
      (item_performance_tracking.avg_confidence_score * item_performance_tracking.times_analyzed + COALESCE(p_confidence, 0)) 
      / (item_performance_tracking.times_analyzed + 1)
    ),
    last_analyzed_at = NOW(),
    last_approved_at = CASE WHEN p_approved THEN NOW() ELSE item_performance_tracking.last_approved_at END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset daily rate limits
CREATE OR REPLACE FUNCTION reset_rate_limits()
RETURNS VOID AS $$
BEGIN
  UPDATE rate_limits
  SET current_usage = 0,
      last_reset = NOW()
  WHERE last_reset < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE custom_pool_items IS 'Admin-managed custom item pool with priorities and tags';
COMMENT ON TABLE item_performance_tracking IS 'Tracks success rates and performance of items in the pool';
COMMENT ON TABLE rate_limits IS 'Per-user API rate limiting configuration';
COMMENT ON FUNCTION update_item_performance IS 'Updates item performance metrics after each analysis';
COMMENT ON FUNCTION reset_rate_limits IS 'Resets daily usage counters for all users';
