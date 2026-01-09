-- Adicionar campos de informações do sistema à tabela monitored_devices
ALTER TABLE monitored_devices 
ADD COLUMN IF NOT EXISTS sys_name TEXT,
ADD COLUMN IF NOT EXISTS sys_description TEXT,
ADD COLUMN IF NOT EXISTS sys_location TEXT,
ADD COLUMN IF NOT EXISTS sys_contact TEXT;

-- Criar índice para busca por sys_name
CREATE INDEX IF NOT EXISTS idx_monitored_devices_sys_name ON monitored_devices(sys_name);

-- Comentários para documentação
COMMENT ON COLUMN monitored_devices.sys_name IS 'sysName OID 1.3.6.1.2.1.1.5.0 - Nome do sistema SNMP';
COMMENT ON COLUMN monitored_devices.sys_description IS 'sysDescr OID 1.3.6.1.2.1.1.1.0 - Descrição do sistema';
COMMENT ON COLUMN monitored_devices.sys_location IS 'sysLocation OID 1.3.6.1.2.1.1.6.0 - Localização física';
COMMENT ON COLUMN monitored_devices.sys_contact IS 'sysContact OID 1.3.6.1.2.1.1.4.0 - Contato do responsável';