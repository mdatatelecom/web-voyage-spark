# 🗄️ Migração do Banco de Dados

## 1. Exportar Dados do Supabase

### Via Lovable Cloud (Recomendado)

Acesse o painel do Lovable Cloud e exporte os dados via interface.

### Via pg_dump (Alternativo)

```bash
# Variáveis de conexão (substituir pelos valores reais)
export SUPABASE_DB_URL="postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"

# Exportar schema
pg_dump "$SUPABASE_DB_URL" --schema-only --no-owner --no-acl > schema.sql

# Exportar dados (excluindo tabelas de sistema)
pg_dump "$SUPABASE_DB_URL" --data-only --no-owner --no-acl \
  --exclude-table='auth.*' \
  --exclude-table='storage.*' \
  --exclude-table='supabase_*' \
  > data.sql
```

## 2. Schema do Banco de Dados

### 2.1 ENUMs

```sql
-- database/init/02-enums.sql

-- Status de alertas
CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical');
CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved');
CREATE TYPE alert_type AS ENUM ('rack_capacity', 'port_capacity', 'equipment_failure', 'poe_capacity');

-- Tipos de cabo
CREATE TYPE cable_type AS ENUM (
  'utp_cat5e', 'utp_cat6', 'utp_cat6a',
  'fiber_om3', 'fiber_om4', 'fiber_os2',
  'dac', 'other'
);

-- Status de conexão
CREATE TYPE connection_status AS ENUM ('active', 'inactive', 'reserved', 'testing', 'faulty');

-- Status de equipamento
CREATE TYPE equipment_status AS ENUM ('active', 'planned', 'offline', 'staged', 'failed', 'decommissioning');

-- Tipos de equipamento
CREATE TYPE equipment_type AS ENUM (
  'switch', 'router', 'server', 'patch_panel', 'firewall', 'storage', 'other',
  'load_balancer', 'waf', 'access_point', 'pdu', 'ups', 'dvr', 'nvr',
  'pabx', 'voip_gateway', 'modem', 'olt', 'onu', 'kvm', 'console_server',
  'patch_panel_fiber', 'cable_organizer_horizontal', 'cable_organizer_vertical',
  'brush_panel', 'switch_poe', 'poe_injector', 'poe_splitter', 'pdu_smart',
  'ip_camera', 'media_converter', 'media_converter_chassis', 'environment_sensor',
  'rack_monitor', 'dslam', 'msan', 'fixed_shelf'
);

-- Status de porta
CREATE TYPE port_status AS ENUM ('available', 'in_use', 'reserved', 'disabled');

-- Tipos de porta
CREATE TYPE port_type AS ENUM (
  'rj45', 'sfp', 'sfp_plus', 'sfp28', 'qsfp', 'qsfp28',
  'fiber_lc', 'fiber_sc', 'bnc', 'hdmi', 'vga', 'usb', 'serial',
  'console_rj45', 'console_usb', 'fxo_fxs', 'e1_t1', 'power_ac', 'power_dc',
  'antenna_sma', 'rs485_rs232', 'io', 'other',
  'rj45_poe', 'rj45_poe_plus', 'rj45_poe_plus_plus', 'sensor_io'
);

-- Papéis de usuário
CREATE TYPE user_role AS ENUM ('admin', 'technician', 'viewer', 'network_viewer');
```

### 2.2 Tabelas de Usuários

```sql
-- database/init/03-tables.sql (parte 1)

-- Usuários (substitui auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_sign_in_at TIMESTAMPTZ,
  raw_user_meta_data JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_users_email ON users(email);

-- Perfis
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  avatar_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Papéis de usuário
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES users(id),
  UNIQUE(user_id, role)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- Sessões (para refresh tokens)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);
```

### 2.3 Tabelas de Infraestrutura

```sql
-- database/init/03-tables.sql (parte 2)

-- Prédios
CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  building_type TEXT,
  internal_code TEXT,
  zip_code TEXT,
  city TEXT,
  state TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Andares
CREATE TABLE floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  floor_number INTEGER,
  area_sqm NUMERIC,
  has_access_control BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_floors_building_id ON floors(building_id);

-- Salas
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  room_type TEXT,
  capacity INTEGER,
  has_access_control BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rooms_floor_id ON rooms(floor_id);

-- Racks
CREATE TABLE racks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size_u INTEGER NOT NULL DEFAULT 42,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_racks_room_id ON racks(room_id);

-- Equipamentos
CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rack_id UUID NOT NULL REFERENCES racks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type equipment_type NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  asset_tag TEXT,
  hostname TEXT,
  ip_address TEXT,
  primary_mac_address TEXT,
  position_u_start INTEGER,
  position_u_end INTEGER,
  mount_side TEXT,
  airflow TEXT,
  power_consumption_watts INTEGER,
  poe_budget_watts INTEGER,
  poe_power_per_port JSONB,
  weight_kg NUMERIC,
  equipment_status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_equipment_rack_id ON equipment(rack_id);
CREATE INDEX idx_equipment_type ON equipment(type);

-- Portas
CREATE TABLE ports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  port_number INTEGER,
  port_type port_type,
  status port_status NOT NULL DEFAULT 'available',
  speed TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ports_equipment_id ON ports(equipment_id);
CREATE INDEX idx_ports_status ON ports(status);

-- Sequence para código de conexão
CREATE SEQUENCE connection_code_seq START 1;

-- Conexões
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_code TEXT NOT NULL UNIQUE,
  port_a_id UUID NOT NULL REFERENCES ports(id) ON DELETE CASCADE,
  port_b_id UUID NOT NULL REFERENCES ports(id) ON DELETE CASCADE,
  cable_type cable_type NOT NULL,
  cable_color TEXT,
  cable_length_meters NUMERIC,
  status connection_status NOT NULL DEFAULT 'active',
  vlan_id INTEGER,
  vlan_name TEXT,
  vlan_tagging TEXT,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  installed_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_connections_port_a ON connections(port_a_id);
CREATE INDEX idx_connections_port_b ON connections(port_b_id);
```

### 2.4 Tabelas de Suporte

```sql
-- database/init/03-tables.sql (parte 3)

-- Tickets de suporte
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  created_by UUID NOT NULL REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  contact_phone TEXT,
  technician_phone TEXT,
  due_date TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  related_building_id UUID REFERENCES buildings(id),
  related_room_id UUID REFERENCES rooms(id),
  related_rack_id UUID REFERENCES racks(id),
  related_equipment_id UUID REFERENCES equipment(id),
  attachments JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tickets_status ON support_tickets(status);
CREATE INDEX idx_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX idx_tickets_created_by ON support_tickets(created_by);

-- Comentários em tickets
CREATE TABLE ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  source TEXT DEFAULT 'web',
  whatsapp_sender_phone TEXT,
  whatsapp_sender_name TEXT,
  attachments JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);

-- Alertas
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
  acknowledged_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id)
);

CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_severity ON alerts(severity);

-- Configurações de alertas
CREATE TABLE alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value NUMERIC NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES users(id)
);

-- Configurações de notificação
CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  email_enabled BOOLEAN DEFAULT true,
  email_address TEXT,
  alert_info BOOLEAN DEFAULT true,
  alert_warning BOOLEAN DEFAULT true,
  alert_critical BOOLEAN DEFAULT true,
  whatsapp_enabled BOOLEAN DEFAULT false,
  whatsapp_phone TEXT,
  whatsapp_alert_critical BOOLEAN DEFAULT true,
  whatsapp_alert_warning BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Etiquetas
CREATE TABLE labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  qr_code_data TEXT NOT NULL,
  label_file_url TEXT,
  print_count INTEGER DEFAULT 0,
  printed_at TIMESTAMPTZ,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_by UUID REFERENCES users(id)
);

-- Anotações em racks
CREATE TABLE rack_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rack_id UUID NOT NULL REFERENCES racks(id) ON DELETE CASCADE,
  annotation_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  position_u INTEGER NOT NULL,
  position_side TEXT,
  color TEXT,
  icon TEXT,
  priority TEXT,
  due_date TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Logs de acesso
CREATE TABLE access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  connection_id UUID REFERENCES connections(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX idx_access_logs_created_at ON access_logs(created_at);

-- Configurações do sistema
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.5 Tabelas WhatsApp

```sql
-- database/init/03-tables.sql (parte 4)

-- Grupos WhatsApp
CREATE TABLE whatsapp_groups (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  description TEXT,
  owner TEXT,
  size INTEGER,
  picture_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sessões WhatsApp
CREATE TABLE whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  state TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Mapeamento de mensagens WhatsApp
CREATE TABLE whatsapp_message_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  phone_number TEXT,
  group_id TEXT,
  direction TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_whatsapp_mapping_ticket ON whatsapp_message_mapping(ticket_id);
CREATE INDEX idx_whatsapp_mapping_message ON whatsapp_message_mapping(message_id);

-- Notificações WhatsApp
CREATE TABLE whatsapp_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id),
  phone_number TEXT NOT NULL,
  message_type TEXT NOT NULL,
  message_content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  external_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Templates WhatsApp
CREATE TABLE whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL,
  template_content TEXT NOT NULL,
  variables TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.6 Views

```sql
-- database/init/04-views.sql

-- Detalhes de conexão
CREATE OR REPLACE VIEW v_connection_details AS
SELECT 
  c.id,
  c.connection_code,
  c.cable_type,
  c.cable_color,
  c.cable_length_meters,
  c.status,
  c.vlan_id,
  c.vlan_name,
  c.vlan_tagging,
  c.installed_at,
  c.notes,
  pa.id as port_a_id,
  pa.name as port_a_name,
  pb.id as port_b_id,
  pb.name as port_b_name,
  ea.id as equipment_a_id,
  ea.name as equipment_a_name,
  ea.type as equipment_a_type,
  eb.id as equipment_b_id,
  eb.name as equipment_b_name,
  eb.type as equipment_b_type,
  ra.id as rack_a_id,
  ra.name as rack_a_name,
  rb.id as rack_b_id,
  rb.name as rack_b_name
FROM connections c
JOIN ports pa ON c.port_a_id = pa.id
JOIN ports pb ON c.port_b_id = pb.id
JOIN equipment ea ON pa.equipment_id = ea.id
JOIN equipment eb ON pb.equipment_id = eb.id
JOIN racks ra ON ea.rack_id = ra.id
JOIN racks rb ON eb.rack_id = rb.id;

-- Disponibilidade de portas
CREATE OR REPLACE VIEW v_port_availability AS
SELECT 
  e.id as equipment_id,
  e.name as equipment_name,
  e.type as equipment_type,
  COUNT(p.id) as total_ports,
  COUNT(CASE WHEN p.status = 'in_use' THEN 1 END) as in_use_ports,
  COUNT(CASE WHEN p.status = 'available' THEN 1 END) as available_ports
FROM equipment e
LEFT JOIN ports p ON e.id = p.equipment_id
GROUP BY e.id, e.name, e.type;
```

### 2.7 Funções

```sql
-- database/init/05-functions.sql

-- Gerar código de conexão
CREATE OR REPLACE FUNCTION generate_connection_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
  code TEXT;
BEGIN
  next_num := nextval('connection_code_seq');
  code := 'C-' || LPAD(next_num::TEXT, 5, '0');
  RETURN code;
END;
$$;

-- Verificar papel do usuário
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Gerar número do ticket
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  year_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO year_count 
  FROM support_tickets 
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  
  NEW.ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(year_count::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

-- Definir código de conexão automaticamente
CREATE OR REPLACE FUNCTION set_connection_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.connection_code IS NULL THEN
    NEW.connection_code := generate_connection_code();
  END IF;
  RETURN NEW;
END;
$$;
```

### 2.8 Triggers

```sql
-- database/init/06-triggers.sql

-- Triggers de updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_buildings_updated_at BEFORE UPDATE ON buildings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_floors_updated_at BEFORE UPDATE ON floors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_racks_updated_at BEFORE UPDATE ON racks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ports_updated_at BEFORE UPDATE ON ports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para gerar ticket_number
CREATE TRIGGER generate_ticket_number_trigger
  BEFORE INSERT ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();

-- Trigger para gerar connection_code
CREATE TRIGGER set_connection_code_trigger
  BEFORE INSERT ON connections
  FOR EACH ROW EXECUTE FUNCTION set_connection_code();
```

## 3. Importar Dados

```bash
# Conectar ao PostgreSQL da VPS
docker exec -it datacenter-postgres psql -U datacenter -d datacenter_db

# Executar scripts na ordem
\i /docker-entrypoint-initdb.d/02-enums.sql
\i /docker-entrypoint-initdb.d/03-tables.sql
\i /docker-entrypoint-initdb.d/04-views.sql
\i /docker-entrypoint-initdb.d/05-functions.sql
\i /docker-entrypoint-initdb.d/06-triggers.sql

# Importar dados
\i /path/to/data.sql
```

## 4. Script de Backup Automático

```bash
# scripts/backup.sh
#!/bin/bash

BACKUP_DIR="/opt/datacenter-app/database/backup"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Criar backup
docker exec datacenter-postgres pg_dump -U datacenter datacenter_db | gzip > "$BACKUP_DIR/backup_$DATE.sql.gz"

# Remover backups antigos
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

```bash
# Adicionar ao cron (diário às 3h)
crontab -e
# 0 3 * * * /opt/datacenter-app/scripts/backup.sh >> /var/log/datacenter-backup.log 2>&1
```

---

## ✅ Checklist de Conclusão

- [ ] ENUMs criados
- [ ] Tabelas criadas
- [ ] Views criadas
- [ ] Funções criadas
- [ ] Triggers criados
- [ ] Dados importados
- [ ] Backup automático configurado
- [ ] Integridade verificada

---

## 🔜 Próximo Passo

[Backend Node.js →](./03-backend-setup.md)
