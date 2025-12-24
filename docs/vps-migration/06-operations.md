# 🔧 Operação e Manutenção

## 1. Monitoramento

### 1.1 Health Checks

```bash
# Script de verificação de saúde
# scripts/health-check.sh

#!/bin/bash

check_service() {
    local name=$1
    local url=$2
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 10)
    
    if [ "$response" == "200" ]; then
        echo "✅ $name: OK"
        return 0
    else
        echo "❌ $name: FAILED (HTTP $response)"
        return 1
    fi
}

echo "🔍 Verificando serviços..."
echo ""

check_service "Frontend" "https://seudominio.com"
check_service "API Health" "https://api.seudominio.com/health"
check_service "API Auth" "https://api.seudominio.com/api/auth"

echo ""
echo "📊 Status dos containers:"
docker compose -f /opt/datacenter-app/docker-compose.prod.yml ps

echo ""
echo "💾 Uso de recursos:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

### 1.2 Configurar Cron para Monitoramento

```bash
# Adicionar ao crontab
crontab -e

# Health check a cada 5 minutos
*/5 * * * * /opt/datacenter-app/scripts/health-check.sh >> /var/log/datacenter-health.log 2>&1

# Backup diário às 3h
0 3 * * * /opt/datacenter-app/scripts/backup.sh >> /var/log/datacenter-backup.log 2>&1

# Renovação SSL 2x por dia
0 0,12 * * * /opt/datacenter-app/scripts/renew-ssl.sh >> /var/log/ssl-renew.log 2>&1

# Limpeza de logs antigos semanalmente
0 4 * * 0 find /var/log/datacenter-*.log -mtime +30 -delete

# Limpeza Docker semanal
0 5 * * 0 docker system prune -f >> /var/log/docker-prune.log 2>&1
```

### 1.3 Alertas por Email

```bash
# scripts/alert.sh
#!/bin/bash

ALERT_EMAIL="admin@seudominio.com"
SUBJECT="[ALERTA] Datacenter App - $1"
MESSAGE=$2

echo "$MESSAGE" | mail -s "$SUBJECT" "$ALERT_EMAIL"
```

Integrar com health-check:

```bash
# No health-check.sh, adicionar:
if ! check_service "API Health" "https://api.seudominio.com/health"; then
    ./scripts/alert.sh "API Down" "A API está fora do ar. Verifique imediatamente."
fi
```

## 2. Logs

### 2.1 Estrutura de Logs

```
/var/log/
├── datacenter-health.log      # Logs de health check
├── datacenter-backup.log      # Logs de backup
├── ssl-renew.log              # Logs de renovação SSL
└── docker-prune.log           # Logs de limpeza Docker

/opt/datacenter-app/
└── logs/
    └── backend/
        ├── combined.log       # Todos os logs
        └── error.log          # Apenas erros
```

### 2.2 Visualizar Logs

```bash
# Logs do backend em tempo real
docker compose -f docker-compose.prod.yml logs -f backend

# Últimas 100 linhas
docker compose -f docker-compose.prod.yml logs --tail=100 backend

# Logs de um período específico
docker compose -f docker-compose.prod.yml logs --since="2024-01-01" backend

# Logs do Nginx
docker exec datacenter-nginx tail -f /var/log/nginx/access.log
docker exec datacenter-nginx tail -f /var/log/nginx/error.log

# Logs do PostgreSQL
docker compose -f docker-compose.prod.yml logs postgres
```

### 2.3 Rotação de Logs

```bash
# /etc/logrotate.d/datacenter
/opt/datacenter-app/logs/**/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 deploy deploy
    sharedscripts
    postrotate
        docker kill -s USR1 datacenter-backend 2>/dev/null || true
    endscript
}

/var/log/datacenter-*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
}
```

## 3. Backup e Restore

### 3.1 Backup Completo

```bash
# scripts/full-backup.sh
#!/bin/bash

set -e

BACKUP_DIR="/opt/datacenter-app/database/backup"
DATE=$(date +%Y%m%d_%H%M%S)
FULL_BACKUP_DIR="$BACKUP_DIR/full_$DATE"

mkdir -p "$FULL_BACKUP_DIR"

echo "📦 Iniciando backup completo..."

# 1. Backup do banco
echo "  → Banco de dados..."
docker exec datacenter-postgres pg_dump -U datacenter datacenter_db | gzip > "$FULL_BACKUP_DIR/database.sql.gz"

# 2. Backup dos uploads
echo "  → Uploads..."
docker cp datacenter-backend:/app/uploads "$FULL_BACKUP_DIR/uploads"
tar -czf "$FULL_BACKUP_DIR/uploads.tar.gz" -C "$FULL_BACKUP_DIR" uploads
rm -rf "$FULL_BACKUP_DIR/uploads"

# 3. Backup das configurações
echo "  → Configurações..."
cp /opt/datacenter-app/.env "$FULL_BACKUP_DIR/env.backup"
cp /opt/datacenter-app/docker-compose.prod.yml "$FULL_BACKUP_DIR/"
cp -r /opt/datacenter-app/nginx "$FULL_BACKUP_DIR/"

# 4. Criar arquivo final
echo "  → Compactando..."
cd "$BACKUP_DIR"
tar -czf "full_backup_$DATE.tar.gz" "full_$DATE"
rm -rf "full_$DATE"

echo "✅ Backup completo criado: full_backup_$DATE.tar.gz"
echo "   Tamanho: $(du -h full_backup_$DATE.tar.gz | cut -f1)"

# Opcional: Upload para S3
# aws s3 cp "full_backup_$DATE.tar.gz" s3://seu-bucket/backups/
```

### 3.2 Restore Completo

```bash
# scripts/full-restore.sh
#!/bin/bash

set -e

if [ -z "$1" ]; then
    echo "Uso: ./full-restore.sh <full_backup_XXXXXX.tar.gz>"
    exit 1
fi

BACKUP_FILE=$1
TEMP_DIR="/tmp/restore_$$"

echo "⚠️ ATENÇÃO: Isso irá substituir TODOS os dados!"
read -p "Digite 'RESTAURAR' para confirmar: " confirm

if [ "$confirm" != "RESTAURAR" ]; then
    echo "Cancelado."
    exit 0
fi

echo "🔄 Extraindo backup..."
mkdir -p "$TEMP_DIR"
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

BACKUP_CONTENT=$(ls "$TEMP_DIR")
cd "$TEMP_DIR/$BACKUP_CONTENT"

echo "⏹️ Parando serviços..."
docker compose -f /opt/datacenter-app/docker-compose.prod.yml down

echo "📦 Restaurando banco de dados..."
docker compose -f /opt/datacenter-app/docker-compose.prod.yml up -d postgres
sleep 10
gunzip -c database.sql.gz | docker exec -i datacenter-postgres psql -U datacenter -d datacenter_db

echo "📁 Restaurando uploads..."
tar -xzf uploads.tar.gz
docker cp uploads/. datacenter-backend:/app/uploads/

echo "🚀 Reiniciando serviços..."
docker compose -f /opt/datacenter-app/docker-compose.prod.yml up -d

echo "🧹 Limpando..."
rm -rf "$TEMP_DIR"

echo "✅ Restore completo!"
```

## 4. Atualizações

### 4.1 Atualização com Zero Downtime

```bash
# scripts/zero-downtime-update.sh
#!/bin/bash

set -e

cd /opt/datacenter-app

echo "🔄 Iniciando atualização zero-downtime..."

# 1. Backup rápido
./scripts/backup.sh

# 2. Pull das mudanças
git pull origin main

# 3. Build nova imagem do backend
docker compose -f docker-compose.prod.yml build backend

# 4. Atualizar backend (o nginx continua servindo a versão antiga)
docker compose -f docker-compose.prod.yml up -d --no-deps backend

# 5. Aguardar backend ficar healthy
echo "Aguardando backend..."
for i in {1..30}; do
    if docker exec datacenter-backend wget -q --spider http://localhost:3000/health; then
        echo "✅ Backend healthy!"
        break
    fi
    sleep 2
done

# 6. Atualizar frontend se necessário
if [ -d "frontend/dist" ]; then
    docker compose -f docker-compose.prod.yml build frontend
    docker compose -f docker-compose.prod.yml up -d --no-deps nginx
fi

echo "✅ Atualização concluída!"
```

### 4.2 Rollback

```bash
# scripts/rollback.sh
#!/bin/bash

set -e

# Listar últimos commits
echo "Últimos commits:"
git log --oneline -10

echo ""
read -p "Digite o hash do commit para rollback: " COMMIT_HASH

git checkout "$COMMIT_HASH"
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

echo "✅ Rollback para $COMMIT_HASH concluído!"
```

## 5. Troubleshooting

### 5.1 Container não inicia

```bash
# Ver logs detalhados
docker compose -f docker-compose.prod.yml logs backend

# Ver eventos do container
docker events --filter container=datacenter-backend

# Inspecionar container
docker inspect datacenter-backend

# Tentar iniciar manualmente para ver erro
docker compose -f docker-compose.prod.yml run --rm backend
```

### 5.2 Banco de dados lento

```bash
# Conectar ao PostgreSQL
docker exec -it datacenter-postgres psql -U datacenter -d datacenter_db

# Ver queries lentas
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';

# Ver tamanho das tabelas
SELECT relname AS table_name,
       pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

# Executar VACUUM
VACUUM ANALYZE;
```

### 5.3 Disco cheio

```bash
# Ver uso de disco
df -h

# Ver uso por pasta
du -sh /opt/datacenter-app/*
du -sh /var/lib/docker/*

# Limpar Docker
docker system prune -a --volumes

# Limpar logs antigos
find /var/log -name "*.gz" -mtime +30 -delete
journalctl --vacuum-time=7d
```

### 5.4 Memória alta

```bash
# Ver uso de memória
free -h
docker stats --no-stream

# Reiniciar container com problema
docker compose -f docker-compose.prod.yml restart backend

# Ver processos dentro do container
docker exec datacenter-backend ps aux
```

## 6. Segurança

### 6.1 Verificações Periódicas

```bash
# scripts/security-check.sh
#!/bin/bash

echo "🔒 Verificação de Segurança"
echo ""

# 1. Verificar atualizações do sistema
echo "📦 Atualizações disponíveis:"
apt list --upgradable 2>/dev/null | head -10

# 2. Verificar logins falhos
echo ""
echo "🚫 Logins falhos (últimas 24h):"
grep "Failed password" /var/log/auth.log | tail -5

# 3. Verificar portas abertas
echo ""
echo "🌐 Portas abertas:"
ss -tulpn | grep LISTEN

# 4. Verificar certificado SSL
echo ""
echo "🔐 Certificado SSL:"
openssl s_client -connect seudominio.com:443 -servername seudominio.com 2>/dev/null | openssl x509 -noout -dates

# 5. Verificar imagens Docker
echo ""
echo "🐳 Imagens Docker (verificar vulnerabilidades):"
docker images --format "{{.Repository}}:{{.Tag}}" | head -5
```

### 6.2 Atualizações de Segurança

```bash
# Atualizar sistema
apt update && apt upgrade -y

# Atualizar imagens Docker
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## 7. Checklist de Operação

### Diário
- [ ] Verificar health checks
- [ ] Revisar logs de erro
- [ ] Monitorar uso de recursos

### Semanal
- [ ] Verificar backups
- [ ] Revisar métricas de performance
- [ ] Atualizar dependências se necessário

### Mensal
- [ ] Testar restore de backup
- [ ] Atualizar sistema operacional
- [ ] Revisar configurações de segurança
- [ ] Limpar dados antigos

### Trimestral
- [ ] Renovar credenciais/senhas
- [ ] Revisar documentação
- [ ] Planejar upgrades

---

## 📞 Contatos de Emergência

| Situação | Ação |
|----------|------|
| Sistema fora do ar | Executar `./scripts/health-check.sh` e verificar logs |
| Banco corrompido | Executar restore do último backup |
| Ataque/Invasão | Desconectar servidor e contactar equipe de segurança |
| Disco cheio | Limpar logs e Docker, expandir disco se necessário |

---

## ✅ Sistema Migrado com Sucesso!

Sua aplicação agora roda 100% na sua VPS com:

- ✅ Backend Node.js + Express
- ✅ Frontend React (Nginx)
- ✅ PostgreSQL
- ✅ Docker + Docker Compose
- ✅ SSL/HTTPS
- ✅ Backups automáticos
- ✅ Monitoramento
- ✅ Scripts de manutenção
