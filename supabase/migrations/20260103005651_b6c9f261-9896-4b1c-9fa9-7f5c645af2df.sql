-- Add unique constraint on subnet_id + ip_address for upsert to work
ALTER TABLE ip_addresses ADD CONSTRAINT ip_addresses_subnet_ip_unique UNIQUE (subnet_id, ip_address);