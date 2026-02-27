-- Proposals table for manual flipping proposals
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  item_id INTEGER,
  item_name TEXT,
  side TEXT CHECK (side IN ('buy', 'sell')),
  quantity INTEGER,
  price INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Users can view their own proposals
CREATE POLICY "Users can view own proposals" ON proposals
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create proposals
CREATE POLICY "Users can create proposals" ON proposals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own proposals
CREATE POLICY "Users can update own proposals" ON proposals
  FOR UPDATE USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_proposals_user_status ON proposals(user_id, status);
