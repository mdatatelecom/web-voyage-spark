-- Add VPN settings to system_settings (we'll use JSON structure)
-- The VPN config will be stored with setting_key = 'vpn_settings'
-- No new table needed, we'll use existing system_settings table

-- Just ensuring system_settings exists and has proper policies (already exists)
-- VPN settings will be stored as JSON: { vpnHost: string, vpnUser: string, vpnPassword: string, sshPort: number }
SELECT 1;