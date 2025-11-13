-- Create alert types
CREATE TYPE alert_type AS ENUM ('rack_capacity', 'port_capacity', 'equipment_failure');
CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical');
CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved');

-- Create alerts table
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type alert_type NOT NULL,
  severity alert_severity NOT NULL,
  status alert_status DEFAULT 'active',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_entity_id UUID,
  related_entity_type TEXT,
  threshold_value NUMERIC,
  current_value NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
);

-- Create indexes for performance
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_type ON alerts(type);

-- Enable RLS
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone authenticated can view alerts"
ON alerts FOR SELECT
USING (true);

CREATE POLICY "Admins and technicians can manage alerts"
ON alerts FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'technician'::user_role)
);

-- Create alert_settings table for customizable thresholds
CREATE TABLE alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value NUMERIC NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);

-- Insert default thresholds
INSERT INTO alert_settings (setting_key, setting_value, description) VALUES
  ('rack_warning_threshold', 80, 'Rack occupancy warning threshold (%)'),
  ('rack_critical_threshold', 95, 'Rack occupancy critical threshold (%)'),
  ('port_warning_threshold', 80, 'Port usage warning threshold (%)'),
  ('port_critical_threshold', 95, 'Port usage critical threshold (%)');

-- Enable RLS for alert_settings
ALTER TABLE alert_settings ENABLE ROW LEVEL SECURITY;

-- RLS for alert_settings
CREATE POLICY "Anyone authenticated can view alert settings"
ON alert_settings FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage alert settings"
ON alert_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_alert_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_alert_settings_updated_at_trigger
BEFORE UPDATE ON alert_settings
FOR EACH ROW
EXECUTE FUNCTION update_alert_settings_updated_at();