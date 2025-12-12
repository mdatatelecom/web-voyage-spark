# SSH WebSocket Relay Server

Servidor relay que aceita conexões WebSocket e as encaminha para servidores SSH reais.

## Requisitos

- Node.js 18+
- VPS com acesso à internet

## Instalação no VPS

### 1. Clone ou copie os arquivos

```bash
# Criar diretório
mkdir -p /opt/ssh-relay
cd /opt/ssh-relay

# Copiar package.json e server.js para o diretório
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Testar manualmente

```bash
node server.js
```

### 4. Configurar como serviço (systemd)

Crie o arquivo `/etc/systemd/system/ssh-relay.service`:

```ini
[Unit]
Description=SSH WebSocket Relay
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/ssh-relay
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=PORT=8080

[Install]
WantedBy=multi-user.target
```

Ativar e iniciar:

```bash
sudo systemctl daemon-reload
sudo systemctl enable ssh-relay
sudo systemctl start ssh-relay
sudo systemctl status ssh-relay
```

### 5. Verificar se está funcionando

```bash
curl http://localhost:8080/health
```

Deve retornar:
```json
{
  "status": "ok",
  "service": "SSH WebSocket Relay",
  "sshAvailable": true
}
```

### 6. Configurar firewall (se necessário)

```bash
# UFW
sudo ufw allow 8080/tcp

# iptables
sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
```

## Configuração no Lovable

1. Acesse **Sistema** → **VPN**
2. Ative **Usar SSH Relay Externo**
3. Configure a URL: `ws://SEU-IP:8080/ssh`
4. Salve as configurações
5. Abra o terminal CLI e conecte

## Segurança Recomendada

### Usar HTTPS/WSS (com Nginx)

```nginx
server {
    listen 443 ssl;
    server_name seu-dominio.com;
    
    ssl_certificate /etc/letsencrypt/live/seu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com/privkey.pem;
    
    location /ssh {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }
}
```

### Limitar IPs de origem

Adicione ao início do `server.js`:

```javascript
const ALLOWED_ORIGINS = ['https://seu-projeto.lovable.app'];

wss.on('connection', (ws, req) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.length && !ALLOWED_ORIGINS.includes(origin)) {
    ws.close(1008, 'Origin not allowed');
    return;
  }
  // ... resto do código
});
```

## Logs

Ver logs do serviço:

```bash
sudo journalctl -u ssh-relay -f
```

## Troubleshooting

### Erro: "Connection refused"
- Verifique se o serviço está rodando: `systemctl status ssh-relay`
- Verifique o firewall: `sudo ufw status`

### Erro: "Authentication failed"
- Verifique usuário e senha no Lovable
- Teste SSH direto: `ssh usuario@host`

### WebSocket não conecta
- Verifique se a porta 8080 está aberta
- Teste: `curl http://SEU-IP:8080/health`
