-- Add test_button_name column to iptv_panels table
ALTER TABLE iptv_panels ADD COLUMN IF NOT EXISTS test_button_name TEXT;
