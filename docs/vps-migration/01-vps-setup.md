# 🖥️ Configuração Inicial da VPS

## 1. Primeiro Acesso

```bash
# Conectar via SSH
ssh root@SEU_IP_VPS

# Atualizar sistema
apt update && apt upgrade -y

# Instalar utilitários básicos
apt install -y curl wget git htop nano ufw fail2ban
```

## 2. Criar Usuário de Deploy

```bash
# Criar usuário
adduser deploy

# Adicionar ao grupo sudo
usermod -aG sudo deploy

# Configurar SSH para o usuário
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

## 3. Configurar SSH Seguro

```bash
# Editar configuração SSH
nano /etc/ssh/sshd_config
```

Alterar estas linhas:
```
Port 2222                    # Porta diferente do padrão
PermitRootLogin no           # Desabilitar root
PasswordAuthentication no     # Apenas chave SSH
PubkeyAuthentication yes
```

```bash
# Reiniciar SSH
systemctl restart sshd

# IMPORTANTE: Testar nova conexão ANTES de desconectar
# ssh -p 2222 deploy@SEU_IP_VPS
```

## 4. Configurar Firewall (UFW)

```bash
# Configurar regras
ufw default deny incoming
ufw default allow outgoing

# Permitir SSH (nova porta)
ufw allow 2222/tcp

# Permitir HTTP e HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Habilitar firewall
ufw enable

# Verificar status
ufw status verbose
```

## 5. Instalar Docker

```bash
# Remover versões antigas
apt remove docker docker-engine docker.io containerd runc

# Instalar dependências
apt install -y ca-certificates curl gnupg lsb-release

# Adicionar chave GPG oficial
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Adicionar repositório
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Adicionar usuário deploy ao grupo docker
usermod -aG docker deploy

# Verificar instalação
docker --version
docker compose version
```

## 6. Configurar Fail2Ban

```bash
# Criar configuração local
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
nano /etc/fail2ban/jail.local
```

Adicionar/editar:
```ini
[sshd]
enabled = true
port = 2222
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
findtime = 600

[nginx-http-auth]
enabled = true
```

```bash
# Reiniciar Fail2Ban
systemctl restart fail2ban
systemctl enable fail2ban

# Verificar status
fail2ban-client status
```

## 7. Configurar Swap (se necessário)

```bash
# Verificar swap atual
free -h

# Criar arquivo swap de 4GB
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Tornar permanente
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Otimizar swappiness
echo 'vm.swappiness=10' >> /etc/sysctl.conf
sysctl -p
```

## 8. Criar Estrutura de Diretórios

```bash
# Logar como deploy
su - deploy

# Criar estrutura
mkdir -p /opt/datacenter-app/{backend,frontend,database,nginx,scripts}
mkdir -p /opt/datacenter-app/database/{init,migrations,backup}
mkdir -p /opt/datacenter-app/nginx/ssl

# Dar permissões
sudo chown -R deploy:deploy /opt/datacenter-app
```

## 9. Configurar Git

```bash
# Configurar identidade
git config --global user.name "Deploy Bot"
git config --global user.email "deploy@seudominio.com"
```

## 10. Verificação Final

```bash
# Verificar Docker
docker run hello-world

# Verificar espaço em disco
df -h

# Verificar memória
free -h

# Verificar firewall
ufw status

# Verificar serviços
systemctl status docker
systemctl status fail2ban
```

---

## ✅ Checklist de Conclusão

- [ ] Usuário `deploy` criado com acesso SSH
- [ ] SSH configurado na porta 2222, sem root, apenas chave
- [ ] Firewall (UFW) ativo com portas 2222, 80, 443
- [ ] Docker e Docker Compose instalados
- [ ] Fail2Ban configurado
- [ ] Swap configurado (se RAM < 4GB)
- [ ] Estrutura de diretórios criada
- [ ] Git instalado e configurado

---

## 🔜 Próximo Passo

[Migração do Banco de Dados →](./02-database-migration.md)
