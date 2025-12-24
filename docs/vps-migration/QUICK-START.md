# 🚀 Guia de Instalação - VPS

## Pré-requisitos
- VPS Ubuntu 22.04+ com 2GB RAM mínimo
- Docker e Docker Compose instalados
- Domínio apontado para o IP da VPS

## 1. Preparar VPS (5 min)
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl

# Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

## 2. Clonar e Configurar (3 min)
```bash
# Criar estrutura
sudo mkdir -p /opt/datacenter-app
cd /opt/datacenter-app

# Clonar repositório (ou copiar arquivos)
git clone SEU_REPO .

# Configurar variáveis
cp backend/.env.example backend/.env
nano backend/.env  # Editar com suas configurações
```

## 3. Subir Containers (2 min)
```bash
# Subir tudo
docker-compose up -d

# Verificar status
docker-compose ps
docker-compose logs -f
```

## 4. Configurar SSL (5 min)
```bash
# Instalar Certbot
sudo apt install -y certbot

# Obter certificado
sudo certbot certonly --standalone -d seu-dominio.com

# Configurar renovação automática
sudo crontab -e
# Adicionar: 0 3 * * * certbot renew --quiet
```

## 5. Verificar
- Acessar: https://seu-dominio.com
- Testar login com usuário admin criado
- Verificar health: https://seu-dominio.com/api/health

## Comandos Úteis
```bash
# Ver logs
docker-compose logs -f backend

# Reiniciar
docker-compose restart

# Backup do banco
docker exec postgres pg_dump -U app datacenter > backup.sql

# Restaurar backup
docker exec -i postgres psql -U app datacenter < backup.sql
```
