
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS system_knowledge CASCADE;
DELETE FROM system_settings WHERE setting_key = 'go2rtc_server';
