-- Add protocol column to monitored_devices
ALTER TABLE public.monitored_devices 
ADD COLUMN IF NOT EXISTS protocol TEXT DEFAULT 'http';

-- Update existing device to use correct settings
UPDATE public.monitored_devices 
SET protocol = 'http', ip_address = '86.48.3.172:3000'
WHERE device_id = 'iw-01';