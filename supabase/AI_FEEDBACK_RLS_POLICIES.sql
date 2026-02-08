-- RLS Policies for ai_feedback table
-- Run this in Supabase SQL Editor to fix permission issues

-- Enable RLS
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own feedback
CREATE POLICY "Users can insert their own feedback"
    ON ai_feedback FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own feedback
CREATE POLICY "Users can view their own feedback"
    ON ai_feedback FOR SELECT
    USING (auth.uid() = user_id);

-- Allow users to update their own feedback (for outcome tracking)
CREATE POLICY "Users can update their own feedback"
    ON ai_feedback FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Verify policies are created
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'ai_feedback';
