# 🐳 Docker e Deploy

## 1. docker-compose.yml (Desenvolvimento)

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: datacenter-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: datacenter_db
      POSTGRES_USER: datacenter
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d:ro
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U datacenter -d datacenter_db"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - datacenter-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: datacenter-backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      NODE_ENV: development
      PORT: 3000
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: datacenter_db
      DB_USER: datacenter
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      RESEND_API_KEY: ${RESEND_API_KEY}
      EVOLUTION_API_URL: ${EVOLUTION_API_URL}
      EVOLUTION_API_KEY: ${EVOLUTION_API_KEY}
      EVOLUTION_INSTANCE: ${EVOLUTION_INSTANCE}
    volumes:
      - ./backend/src:/app/src:ro
      - backend_uploads:/app/uploads
      - backend_logs:/app/logs
    ports:
      - "3000:3000"
    networks:
      - datacenter-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: http://localhost:3000/api
        VITE_WS_URL: ws://localhost:3000/ws
    container_name: datacenter-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    networks:
      - datacenter-network

volumes:
  postgres_data:
  backend_uploads:
  backend_logs:

networks:
  datacenter-network:
    driver: bridge
```

## 2. docker-compose.prod.yml (Produção)

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: datacenter-postgres
    restart: always
    environment:
      POSTGRES_DB: datacenter_db
      POSTGRES_USER: datacenter
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d:ro
      - ./database/backup:/backup
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U datacenter -d datacenter_db"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - datacenter-network
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 256M

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: datacenter-backend
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 3000
      BASE_URL: https://api.${DOMAIN}
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: datacenter_db
      DB_USER: datacenter
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: 24h
      JWT_REFRESH_EXPIRES_IN: 7d
      CORS_ORIGIN: https://${DOMAIN}
      RESEND_API_KEY: ${RESEND_API_KEY}
      EVOLUTION_API_URL: ${EVOLUTION_API_URL}
      EVOLUTION_API_KEY: ${EVOLUTION_API_KEY}
      EVOLUTION_INSTANCE: ${EVOLUTION_INSTANCE}
    volumes:
      - backend_uploads:/app/uploads
      - backend_logs:/app/logs
    networks:
      - datacenter-network
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 128M
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    container_name: datacenter-nginx
    restart: always
    depends_on:
      - backend
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./frontend/dist:/usr/share/nginx/html:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
      - backend_uploads:/app/uploads:ro
      - nginx_logs:/var/log/nginx
    networks:
      - datacenter-network
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Redis (opcional - para cache e sessões)
  redis:
    image: redis:7-alpine
    container_name: datacenter-redis
    restart: always
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - datacenter-network
    deploy:
      resources:
        limits:
          memory: 128M

volumes:
  postgres_data:
  backend_uploads:
  backend_logs:
  nginx_logs:
  redis_data:

networks:
  datacenter-network:
    driver: bridge
```

## 3. .env.example (Raiz do Projeto)

```env
# ====================================
# CONFIGURAÇÃO DE AMBIENTE - PRODUÇÃO
# ====================================

# Domínio
DOMAIN=seudominio.com

# Database
DB_PASSWORD=SUA_SENHA_POSTGRESQL_MUITO_SEGURA

# JWT (gerar com: openssl rand -base64 64)
JWT_SECRET=SEU_JWT_SECRET_MUITO_SEGURO_AQUI_MINIMO_64_CARACTERES

# Redis (opcional)
REDIS_PASSWORD=SUA_SENHA_REDIS

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx

# WhatsApp (Evolution API)
EVOLUTION_API_URL=http://seu-servidor-evolution:8080
EVOLUTION_API_KEY=sua_api_key_evolution
EVOLUTION_INSTANCE=datacenter
```

## 4. Scripts de Deploy

### 4.1 deploy.sh

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

echo "🚀 Iniciando deploy..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Diretório do projeto
PROJECT_DIR="/opt/datacenter-app"
cd "$PROJECT_DIR"

# Verificar .env
if [ ! -f .env ]; then
    echo -e "${RED}❌ Arquivo .env não encontrado!${NC}"
    echo "Copie .env.example para .env e configure as variáveis."
    exit 1
fi

# Carregar variáveis
source .env

echo -e "${YELLOW}📦 Atualizando código...${NC}"
git pull origin main

echo -e "${YELLOW}🏗️ Construindo imagens...${NC}"
docker compose -f docker-compose.prod.yml build --no-cache

echo -e "${YELLOW}⏹️ Parando containers antigos...${NC}"
docker compose -f docker-compose.prod.yml down

echo -e "${YELLOW}🚀 Iniciando containers...${NC}"
docker compose -f docker-compose.prod.yml up -d

echo -e "${YELLOW}⏳ Aguardando serviços...${NC}"
sleep 10

# Verificar saúde dos containers
echo -e "${YELLOW}🔍 Verificando saúde dos serviços...${NC}"

check_health() {
    local service=$1
    local status=$(docker inspect --format='{{.State.Health.Status}}' "datacenter-$service" 2>/dev/null || echo "unknown")
    
    if [ "$status" == "healthy" ]; then
        echo -e "${GREEN}✅ $service: healthy${NC}"
        return 0
    elif [ "$status" == "unknown" ]; then
        # Container sem healthcheck, verificar se está rodando
        local running=$(docker inspect --format='{{.State.Running}}' "datacenter-$service" 2>/dev/null || echo "false")
        if [ "$running" == "true" ]; then
            echo -e "${YELLOW}⚠️ $service: running (no healthcheck)${NC}"
            return 0
        fi
    fi
    
    echo -e "${RED}❌ $service: $status${NC}"
    return 1
}

# Aguardar até 60 segundos para containers ficarem healthy
for i in {1..12}; do
    all_healthy=true
    
    check_health "postgres" || all_healthy=false
    check_health "backend" || all_healthy=false
    check_health "nginx" || all_healthy=false
    
    if $all_healthy; then
        break
    fi
    
    echo -e "${YELLOW}Aguardando... ($((i*5))s)${NC}"
    sleep 5
done

echo ""
echo -e "${GREEN}🎉 Deploy concluído!${NC}"
echo ""
echo "Serviços disponíveis:"
echo "  - Frontend: https://${DOMAIN}"
echo "  - API: https://api.${DOMAIN}"
echo ""
echo "Comandos úteis:"
echo "  docker compose -f docker-compose.prod.yml logs -f    # Ver logs"
echo "  docker compose -f docker-compose.prod.yml ps         # Status"
echo "  docker compose -f docker-compose.prod.yml restart    # Reiniciar"
```

### 4.2 backup.sh

```bash
#!/bin/bash
# scripts/backup.sh

set -e

BACKUP_DIR="/opt/datacenter-app/database/backup"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

echo "📦 Iniciando backup..."

# Criar backup do PostgreSQL
docker exec datacenter-postgres pg_dump -U datacenter datacenter_db | gzip > "$BACKUP_DIR/db_backup_$DATE.sql.gz"

# Backup dos uploads
tar -czf "$BACKUP_DIR/uploads_backup_$DATE.tar.gz" -C /var/lib/docker/volumes datacenter-app_backend_uploads

echo "✅ Backup criado: db_backup_$DATE.sql.gz"

# Remover backups antigos
find "$BACKUP_DIR" -name "*.gz" -mtime +$RETENTION_DAYS -delete

echo "🧹 Backups antigos removidos (> $RETENTION_DAYS dias)"

# Opcional: Enviar para storage externo (S3, etc)
# aws s3 cp "$BACKUP_DIR/db_backup_$DATE.sql.gz" s3://seu-bucket/backups/
```

### 4.3 restore.sh

```bash
#!/bin/bash
# scripts/restore.sh

set -e

if [ -z "$1" ]; then
    echo "Uso: ./restore.sh <arquivo_backup.sql.gz>"
    echo ""
    echo "Backups disponíveis:"
    ls -la /opt/datacenter-app/database/backup/*.sql.gz 2>/dev/null || echo "Nenhum backup encontrado"
    exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Arquivo não encontrado: $BACKUP_FILE"
    exit 1
fi

echo "⚠️ ATENÇÃO: Isso irá substituir todos os dados atuais!"
read -p "Tem certeza? (digite 'sim' para confirmar): " confirm

if [ "$confirm" != "sim" ]; then
    echo "Operação cancelada."
    exit 0
fi

echo "🔄 Restaurando backup..."

# Parar backend para evitar conexões
docker compose -f docker-compose.prod.yml stop backend

# Restaurar
gunzip -c "$BACKUP_FILE" | docker exec -i datacenter-postgres psql -U datacenter -d datacenter_db

# Reiniciar backend
docker compose -f docker-compose.prod.yml start backend

echo "✅ Backup restaurado com sucesso!"
```

### 4.4 update.sh

```bash
#!/bin/bash
# scripts/update.sh

set -e

PROJECT_DIR="/opt/datacenter-app"
cd "$PROJECT_DIR"

echo "🔄 Atualizando sistema..."

# Backup antes de atualizar
./scripts/backup.sh

# Atualizar código
git pull origin main

# Rebuildar apenas o que mudou
docker compose -f docker-compose.prod.yml build

# Rolling update (zero downtime para nginx)
docker compose -f docker-compose.prod.yml up -d --no-deps --build backend
sleep 10
docker compose -f docker-compose.prod.yml up -d --no-deps --build nginx

echo "✅ Atualização concluída!"
```

## 5. Comandos Úteis

### Gerenciamento

```bash
# Subir todos os serviços
docker compose -f docker-compose.prod.yml up -d

# Ver logs em tempo real
docker compose -f docker-compose.prod.yml logs -f

# Ver logs de um serviço específico
docker compose -f docker-compose.prod.yml logs -f backend

# Status dos containers
docker compose -f docker-compose.prod.yml ps

# Parar todos os serviços
docker compose -f docker-compose.prod.yml down

# Reiniciar um serviço
docker compose -f docker-compose.prod.yml restart backend

# Executar comando dentro de um container
docker exec -it datacenter-backend sh
docker exec -it datacenter-postgres psql -U datacenter -d datacenter_db
```

### Manutenção

```bash
# Limpar imagens não utilizadas
docker system prune -a

# Ver uso de disco
docker system df

# Verificar logs do nginx
docker exec datacenter-nginx tail -f /var/log/nginx/access.log
docker exec datacenter-nginx tail -f /var/log/nginx/error.log

# Testar configuração do nginx
docker exec datacenter-nginx nginx -t

# Recarregar nginx sem downtime
docker exec datacenter-nginx nginx -s reload
```

### Monitoramento

```bash
# CPU e memória dos containers
docker stats

# Informações detalhadas de um container
docker inspect datacenter-backend

# Ver redes
docker network ls
docker network inspect datacenter-app_datacenter-network

# Ver volumes
docker volume ls
docker volume inspect datacenter-app_postgres_data
```

## 6. Primeiro Deploy

```bash
# 1. Clonar repositório na VPS
cd /opt
git clone https://github.com/seu-usuario/datacenter-app.git
cd datacenter-app

# 2. Configurar variáveis de ambiente
cp .env.example .env
nano .env  # Editar com suas configurações

# 3. Criar diretórios necessários
mkdir -p database/{init,backup}
mkdir -p certbot/{conf,www}
mkdir -p nginx/ssl

# 4. Copiar arquivos SQL para init
# (os scripts de init do banco de dados)

# 5. Build do frontend localmente e copiar dist
# Ou fazer build na VPS

# 6. Obter certificado SSL (primeira vez)
# Seguir instruções do doc 04-frontend-nginx.md

# 7. Deploy
chmod +x scripts/*.sh
./scripts/deploy.sh
```

---

## ✅ Checklist de Conclusão

- [ ] docker-compose.yml configurado
- [ ] docker-compose.prod.yml configurado
- [ ] .env configurado
- [ ] Scripts de deploy criados
- [ ] Scripts executáveis (chmod +x)
- [ ] Primeiro deploy realizado
- [ ] Todos os containers healthy
- [ ] SSL funcionando
- [ ] Backup automático configurado

---

## 🔜 Próximo Passo

[Operação e Manutenção →](./06-operations.md)
