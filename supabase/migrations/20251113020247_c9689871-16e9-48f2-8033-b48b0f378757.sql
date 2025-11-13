-- Add Portuguese labels to enums (for future UI display)
COMMENT ON TYPE user_role IS 'User roles: admin (Administrador), technician (Técnico), viewer (Visualizador)';
COMMENT ON TYPE equipment_type IS 'Equipment types: switch, router, server, patch_panel, firewall';
COMMENT ON TYPE cable_type IS 'Cable types: fiber_om3 (Fibra OM3), fiber_om4 (Fibra OM4), utp_cat5e (UTP Cat5e), utp_cat6 (UTP Cat6), utp_cat6a (UTP Cat6a)';
COMMENT ON TYPE connection_status IS 'Connection status: active (Ativo), inactive (Inativo), testing (Testando), reserved (Reservado), faulty (Defeituoso)';
COMMENT ON TYPE port_status IS 'Port status: available (Disponível), in_use (Em Uso), reserved (Reservado), faulty (Defeituoso)';