
-- Delete orphaned auth user that was not properly cleaned up
DELETE FROM auth.users WHERE id = 'aeb6264a-32e5-4193-b519-8a670f5cbd62';
