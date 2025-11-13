-- supabase/migrations/ensure_user_exists_function.sql
CREATE OR REPLACE FUNCTION ensure_user_exists(
  p_user_id TEXT,
  p_email TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO users (id, email, name, unseen_sets_count)
  VALUES (
    p_user_id, 
    COALESCE(p_email, p_user_id || '@unknown.com'),
    p_name,
    (SELECT COUNT(*) FROM content_sets WHERE published_at IS NOT NULL OR scheduled_time <= NOW())
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = COALESCE(EXCLUDED.email, users.email),
    name = COALESCE(EXCLUDED.name, users.name),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;