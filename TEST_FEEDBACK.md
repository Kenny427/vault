# Testing AI Feedback System

## 1. Check Table Structure
Run in Supabase SQL Editor:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ai_feedback'
ORDER BY ordinal_position;
```

## 2. Check Current Data
```sql
SELECT * FROM ai_feedback 
ORDER BY created_at DESC 
LIMIT 10;
```

## 3. Test Manual Insert (verify permissions)
```sql
INSERT INTO ai_feedback (
  user_id,
  item_id,
  item_name,
  feedback_type,
  tags,
  user_confidence
) VALUES (
  auth.uid(),
  12345,
  'Test Item',
  'accept',
  ARRAY['Test Tag'],
  75
) RETURNING *;
```

## 4. Clean Up Test Data
```sql
DELETE FROM ai_feedback WHERE item_name = 'Test Item';
```

---

## Testing in Browser

1. **Open Dashboard** → Click ⚡ dropdown on any flip card
2. **Click "Accept"** → Click a quick tag (e.g., "Good Analysis")
3. **Open Browser Console** (F12) and run:
```javascript
fetch('/api/ai-feedback?limit=5')
  .then(r => r.json())
  .then(d => console.table(d.feedback))
```

You should see your feedback entry!

---

## Common Issues

**Nothing appears:**
- Check RLS policies: `SELECT * FROM ai_feedback` fails? → RLS blocking reads
- Check browser console for errors (F12 → Console tab)
- Verify you're logged in (user_id must match)

**"Unauthorized" error:**
- Session expired → Log out and back in
- Check Supabase connection in browser Network tab

**SQL errors:**
- Re-run AI_FEEDBACK_SCHEMA.sql (ignore trigger exists error)
- Check table exists: `SELECT * FROM information_schema.tables WHERE table_name = 'ai_feedback';`
