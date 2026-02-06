-- Migration: Add admin analytics and notification tables
-- Created: 2026-02-06

-- ============================================
-- SYSTEM ANALYTICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS system_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  cost_usd DECIMAL(10, 4),
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_user ON system_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON system_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON system_analytics(created_at DESC);

-- ============================================
-- ERROR LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_type TEXT NOT NULL,
  error_message TEXT,
  stack_trace TEXT,
  url TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_errors_user ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_errors_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_errors_date ON error_logs(created_at DESC);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  target_users TEXT DEFAULT 'all' CHECK (target_users IN ('all', 'active', 'specific')),
  user_ids UUID[],
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ============================================
-- USER NOTIFICATIONS TABLE (read status)
-- ============================================
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_notifs ON user_notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_user_notifs_notification ON user_notifications(notification_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- System Analytics: Only admins can read
ALTER TABLE system_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all analytics"
  ON system_analytics FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'kenstorholt@gmail.com'
  ));

-- Error Logs: Only admins can read
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all errors"
  ON error_logs FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'kenstorholt@gmail.com'
  ));

-- Notifications: Admins can manage, users can read their own
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notifications"
  ON notifications FOR ALL
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'kenstorholt@gmail.com'
  ));

-- User Notifications: Users can read their own
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their notifications"
  ON user_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications"
  ON user_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to create user notifications when broadcast is created
CREATE OR REPLACE FUNCTION create_user_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- If targeting all users
  IF NEW.target_users = 'all' THEN
    INSERT INTO user_notifications (notification_id, user_id)
    SELECT NEW.id, id FROM auth.users;
  
  -- If targeting active users (signed in within 30 days)
  ELSIF NEW.target_users = 'active' THEN
    INSERT INTO user_notifications (notification_id, user_id)
    SELECT NEW.id, id FROM auth.users
    WHERE last_sign_in_at > NOW() - INTERVAL '30 days';
  
  -- If targeting specific users
  ELSIF NEW.target_users = 'specific' AND NEW.user_ids IS NOT NULL THEN
    INSERT INTO user_notifications (notification_id, user_id)
    SELECT NEW.id, unnest(NEW.user_ids);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user notifications
CREATE TRIGGER on_notification_created
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION create_user_notifications();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE system_analytics IS 'Tracks system events, API usage, and costs';
COMMENT ON TABLE error_logs IS 'Stores application errors for debugging';
COMMENT ON TABLE notifications IS 'Admin broadcast notifications';
COMMENT ON TABLE user_notifications IS 'Tracks which users have read notifications';
