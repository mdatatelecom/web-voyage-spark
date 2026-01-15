-- Adicionar coluna metadata na tabela alerts para armazenar dados extras do Zabbix
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;

-- Adicionar policy para permitir inserção de alertas pelo sistema (para o webhook)
DROP POLICY IF EXISTS "System can insert alerts" ON alerts;
CREATE POLICY "System can insert alerts"
ON alerts FOR INSERT
WITH CHECK (true);