-- Create port_type ENUM
DO $$ BEGIN
  CREATE TYPE port_type AS ENUM (
    'rj45',           -- Ethernet RJ45
    'sfp',            -- Fibra SFP (1G)
    'sfp_plus',       -- Fibra SFP+ (10G)
    'sfp28',          -- SFP28 (25G)
    'qsfp',           -- QSFP (40G)
    'qsfp28',         -- QSFP28 (100G)
    'fiber_lc',       -- Fibra LC
    'fiber_sc',       -- Fibra SC
    'bnc',            -- BNC (CFTV)
    'hdmi',           -- HDMI
    'vga',            -- VGA
    'usb',            -- USB
    'serial',         -- Serial
    'console_rj45',   -- Console RJ45
    'console_usb',    -- Console USB
    'fxo_fxs',        -- FXO/FXS (VoIP)
    'e1_t1',          -- E1/T1 (Telecom)
    'power_ac',       -- Energia AC
    'power_dc',       -- Energia DC
    'antenna_sma',    -- Antena SMA
    'rs485_rs232',    -- RS-485/RS-232
    'io',             -- I/O Digital
    'other'           -- Outro
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add port_type column to ports table
ALTER TABLE ports ADD COLUMN IF NOT EXISTS port_type port_type DEFAULT 'rj45';

-- Create index on port_type for efficient filtering
CREATE INDEX IF NOT EXISTS idx_ports_port_type ON ports(port_type);

-- Expand equipment_type ENUM with new types
DO $$ BEGIN
  ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'load_balancer';
  ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'waf';
  ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'access_point';
  ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'pdu';
  ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'ups';
  ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'dvr';
  ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'nvr';
  ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'pabx';
  ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'voip_gateway';
  ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'modem';
  ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'olt';
  ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'onu';
  ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'kvm';
  ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'console_server';
  ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'patch_panel_fiber';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;