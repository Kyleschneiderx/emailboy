-- Enhanced Security Measures
-- Run this AFTER setup.sql to add additional security layers

-- 1. Add check constraint to ensure user_id is never null
ALTER TABLE collected_emails
ADD CONSTRAINT check_user_id_not_null
CHECK (user_id IS NOT NULL);

-- 2. Add check constraint to ensure email is valid format
ALTER TABLE collected_emails
ADD CONSTRAINT check_email_format
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- 3. Add check constraint to ensure timestamps are valid
ALTER TABLE collected_emails
ADD CONSTRAINT check_timestamps
CHECK (
  first_seen <= last_seen AND
  created_at <= updated_at
);

-- 4. Create a function to log suspicious activity (optional)
CREATE OR REPLACE FUNCTION log_suspicious_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- If user_id doesn't match auth.uid(), log it
  IF NEW.user_id != auth.uid() THEN
    RAISE WARNING 'Suspicious activity detected: user_id mismatch for user %', auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to log suspicious activity
DROP TRIGGER IF EXISTS log_suspicious_collected_emails ON collected_emails;
CREATE TRIGGER log_suspicious_collected_emails
  BEFORE INSERT OR UPDATE ON collected_emails
  FOR EACH ROW
  EXECUTE FUNCTION log_suspicious_activity();

-- 5. Add a policy to prevent bulk operations (optional - can be restrictive)
-- This limits users to inserting reasonable amounts of data
-- Uncomment if you want to add this protection:
/*
CREATE POLICY "Prevent bulk inserts"
  ON collected_emails
  FOR INSERT
  WITH CHECK (
    (SELECT COUNT(*) FROM collected_emails WHERE user_id = auth.uid()) < 10000
  );
*/

-- 6. Create a view for users to see only their own stats (optional)
CREATE OR REPLACE VIEW user_email_stats AS
SELECT 
  user_id,
  COUNT(*) as total_emails,
  COUNT(DISTINCT domain) as unique_domains,
  MIN(first_seen) as first_collection,
  MAX(last_seen) as last_collection
FROM collected_emails
WHERE user_id = auth.uid()
GROUP BY user_id;

-- Grant access to the view
GRANT SELECT ON user_email_stats TO authenticated;

-- 7. Add comment to table for documentation
COMMENT ON TABLE collected_emails IS 
'Stores email addresses collected by users. Protected by Row Level Security.';

COMMENT ON COLUMN collected_emails.user_id IS 
'Automatically set by trigger based on authenticated user. Cannot be modified by users.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Enhanced security measures applied!';
  RAISE NOTICE '✅ Check constraints added';
  RAISE NOTICE '✅ Suspicious activity logging enabled';
  RAISE NOTICE '✅ User stats view created';
END $$;

