#!/bin/bash

# ============================================
# Script de Exportação Automatizada do Supabase
# ============================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Exportação de Dados do Supabase${NC}"
echo -e "${GREEN}============================================${NC}"

# Configurações - PREENCHA COM SEUS DADOS
SUPABASE_HOST="${SUPABASE_HOST:-db.xxxxx.supabase.co}"
SUPABASE_PORT="${SUPABASE_PORT:-5432}"
SUPABASE_DB="${SUPABASE_DB:-postgres}"
SUPABASE_USER="${SUPABASE_USER:-postgres}"
SUPABASE_PASSWORD="${SUPABASE_PASSWORD:-}"

# Diretório de saída
OUTPUT_DIR="${OUTPUT_DIR:-./supabase_export}"
DATE_SUFFIX=$(date +%Y%m%d_%H%M%S)

# Criar diretório de saída
mkdir -p "$OUTPUT_DIR"

echo -e "${YELLOW}Diretório de saída: $OUTPUT_DIR${NC}"

# Verificar se a senha foi fornecida
if [ -z "$SUPABASE_PASSWORD" ]; then
    echo -e "${YELLOW}Digite a senha do PostgreSQL:${NC}"
    read -s SUPABASE_PASSWORD
fi

export PGPASSWORD="$SUPABASE_PASSWORD"

# Função para exportar tabela
export_table() {
    local table=$1
    local schema=${2:-public}
    
    echo -e "  Exportando ${YELLOW}${schema}.${table}${NC}..."
    
    psql -h "$SUPABASE_HOST" -p "$SUPABASE_PORT" -U "$SUPABASE_USER" -d "$SUPABASE_DB" \
        -c "\COPY (SELECT * FROM ${schema}.${table}) TO '${OUTPUT_DIR}/${table}.csv' WITH CSV HEADER" \
        2>/dev/null || echo -e "  ${RED}Erro ao exportar ${table}${NC}"
}

echo ""
echo -e "${GREEN}Exportando tabelas de infraestrutura...${NC}"
export_table "buildings"
export_table "floors"
export_table "rooms"
export_table "racks"
export_table "equipment"
export_table "ports"
export_table "connections"
export_table "labels"
export_table "rack_annotations"

echo ""
echo -e "${GREEN}Exportando tabelas de suporte...${NC}"
export_table "support_tickets"
export_table "ticket_comments"

echo ""
echo -e "${GREEN}Exportando tabelas de alertas...${NC}"
export_table "alerts"
export_table "alert_settings"
export_table "notification_settings"

echo ""
echo -e "${GREEN}Exportando tabelas do sistema...${NC}"
export_table "system_settings"
export_table "access_logs"
export_table "profiles"
export_table "user_roles"

echo ""
echo -e "${GREEN}Exportando tabelas do WhatsApp...${NC}"
export_table "whatsapp_groups"
export_table "whatsapp_notifications"
export_table "whatsapp_sessions"
export_table "whatsapp_message_mapping"
export_table "whatsapp_templates"

echo ""
echo -e "${GREEN}Exportando usuários do auth.users...${NC}"
psql -h "$SUPABASE_HOST" -p "$SUPABASE_PORT" -U "$SUPABASE_USER" -d "$SUPABASE_DB" \
    -c "
    SELECT 
        id,
        email,
        COALESCE(encrypted_password, 'migrated') as password_hash,
        email_confirmed_at,
        created_at,
        updated_at,
        last_sign_in_at,
        true as is_active
    FROM auth.users
    " \
    -A -F',' -o "${OUTPUT_DIR}/users.csv" \
    2>/dev/null || echo -e "  ${RED}Erro ao exportar auth.users${NC}"

echo ""
echo -e "${GREEN}Gerando contagem de registros...${NC}"
psql -h "$SUPABASE_HOST" -p "$SUPABASE_PORT" -U "$SUPABASE_USER" -d "$SUPABASE_DB" \
    -c "
    SELECT 'users (auth)' as tabela, COUNT(*) as registros FROM auth.users
    UNION ALL SELECT 'profiles', COUNT(*) FROM profiles
    UNION ALL SELECT 'user_roles', COUNT(*) FROM user_roles
    UNION ALL SELECT 'buildings', COUNT(*) FROM buildings
    UNION ALL SELECT 'floors', COUNT(*) FROM floors
    UNION ALL SELECT 'rooms', COUNT(*) FROM rooms
    UNION ALL SELECT 'racks', COUNT(*) FROM racks
    UNION ALL SELECT 'equipment', COUNT(*) FROM equipment
    UNION ALL SELECT 'ports', COUNT(*) FROM ports
    UNION ALL SELECT 'connections', COUNT(*) FROM connections
    UNION ALL SELECT 'labels', COUNT(*) FROM labels
    UNION ALL SELECT 'support_tickets', COUNT(*) FROM support_tickets
    UNION ALL SELECT 'ticket_comments', COUNT(*) FROM ticket_comments
    UNION ALL SELECT 'alerts', COUNT(*) FROM alerts
    UNION ALL SELECT 'whatsapp_groups', COUNT(*) FROM whatsapp_groups
    ORDER BY tabela;
    " \
    2>/dev/null | tee "${OUTPUT_DIR}/record_counts.txt"

echo ""
echo -e "${GREEN}Compactando arquivos...${NC}"
cd "$OUTPUT_DIR"
tar -czvf "../supabase_export_${DATE_SUFFIX}.tar.gz" *.csv *.txt 2>/dev/null || true
cd ..

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Exportação concluída!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "Arquivos exportados para: ${YELLOW}${OUTPUT_DIR}${NC}"
echo -e "Arquivo compactado: ${YELLOW}supabase_export_${DATE_SUFFIX}.tar.gz${NC}"
echo ""
echo -e "${YELLOW}Próximos passos:${NC}"
echo "1. Copie supabase_export_${DATE_SUFFIX}.tar.gz para a VPS"
echo "2. Extraia: tar -xzvf supabase_export_${DATE_SUFFIX}.tar.gz"
echo "3. Execute: psql -U app -d datacenter < scripts/sql/01-create-schema.sql"
echo "4. Importe os dados conforme scripts/sql/03-import-data.sql"
echo ""

unset PGPASSWORD
