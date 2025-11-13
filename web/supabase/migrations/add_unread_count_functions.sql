-- Create efficient database function to count unread messages
-- Replaces N+1 query pattern with single efficient query

-- Function to count unread DM messages for creator
CREATE OR REPLACE FUNCTION count_creator_unread_dms()
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  total_count INTEGER;
BEGIN
  SELECT COALESCE(SUM(unread_count), 0)::INTEGER INTO total_count
  FROM (
    SELECT
      COUNT(*) as unread_count
    FROM dm_conversations c
    LEFT JOIN dm_messages m ON m.conversation_id = c.id
    WHERE
      m.sender_role = 'member'
      AND m.deleted_at IS NULL
      AND m.created_at > COALESCE(c.creator_last_read_at, c.created_at, '1970-01-01'::timestamptz)
    GROUP BY c.id
  ) AS conversation_unreads;

  RETURN COALESCE(total_count, 0);
END;
$$;

-- Function to count unread DM messages for member
CREATE OR REPLACE FUNCTION count_member_unread_dms(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  total_count INTEGER;
BEGIN
  SELECT COALESCE(COUNT(*), 0)::INTEGER INTO total_count
  FROM dm_conversations c
  LEFT JOIN dm_messages m ON m.conversation_id = c.id
  WHERE
    c.member_id = p_user_id
    AND m.sender_role = 'creator'
    AND m.deleted_at IS NULL
    AND m.created_at > COALESCE(c.member_last_read_at, c.created_at, '1970-01-01'::timestamptz);

  RETURN COALESCE(total_count, 0);
END;
$$;

-- Function to count unread channel messages for user
CREATE OR REPLACE FUNCTION count_user_unread_channels(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  total_count INTEGER;
BEGIN
  SELECT COALESCE(SUM(unread_count), 0)::INTEGER INTO total_count
  FROM (
    SELECT
      COUNT(*) as unread_count
    FROM channels ch
    LEFT JOIN channel_read_status rs ON rs.channel_id = ch.id AND rs.user_id = p_user_id
    LEFT JOIN channel_messages m ON m.channel_id = ch.id
    WHERE
      ch.deleted_at IS NULL
      AND m.deleted_at IS NULL
      AND m.user_id != p_user_id
      AND m.created_at > COALESCE(rs.last_read_at, '1970-01-01'::timestamptz)
    GROUP BY ch.id
  ) AS channel_unreads;

  RETURN COALESCE(total_count, 0);
END;
$$;

COMMENT ON FUNCTION count_creator_unread_dms() IS
'Efficiently counts all unread DM messages for creator in single query. Replaces N+1 pattern.';

COMMENT ON FUNCTION count_member_unread_dms(UUID) IS
'Efficiently counts unread DM messages for member in single query. Replaces N+1 pattern.';

COMMENT ON FUNCTION count_user_unread_channels(UUID) IS
'Efficiently counts unread channel messages for user in single query. Replaces N+1 pattern.';
