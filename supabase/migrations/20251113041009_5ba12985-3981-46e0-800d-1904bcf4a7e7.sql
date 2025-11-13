-- Step 1: Add network_viewer to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'network_viewer';