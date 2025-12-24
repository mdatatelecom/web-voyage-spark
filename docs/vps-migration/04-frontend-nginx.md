# 🌐 Frontend e Nginx

## 1. Ajustes no Frontend

### 1.1 Criar arquivo de configuração de API

```typescript
// src/config/api.ts
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws';
```

### 1.2 Criar cliente HTTP

```typescript
// src/lib/api-client.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface RequestOptions extends RequestInit {
  token?: string;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { token, ...fetchOptions } = options;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    const authToken = token || this.getToken();
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    if (response.status === 401) {
      // Tentar refresh token
      const refreshed = await this.refreshToken();
      if (refreshed) {
        return this.request<T>(endpoint, options);
      }
      // Redirecionar para login
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/auth';
      throw new Error('Sessão expirada');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(error.error || error.message || 'Erro na requisição');
    }

    return response.json();
  }

  private async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      return true;
    } catch {
      return false;
    }
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();
```

### 1.3 Atualizar hook de autenticação

```typescript
// src/hooks/useAuth.tsx (versão para VPS)
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api-client';

interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }

      const userData = await api.get<User>('/auth/me');
      setUser(userData);
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const response = await api.post<{ user: User; accessToken: string; refreshToken: string }>(
      '/auth/login',
      { email, password }
    );
    
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    setUser(response.user);
  };

  const signUp = async (email: string, password: string, fullName: string, phone?: string) => {
    const response = await api.post<{ user: User; accessToken: string; refreshToken: string }>(
      '/auth/register',
      { email, password, fullName, phone }
    );
    
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    setUser(response.user);
  };

  const signOut = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // Ignorar erros no logout
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  const hasRole = (role: string) => {
    return user?.roles.includes(role) || user?.roles.includes('admin') || false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### 1.4 Variáveis de ambiente para produção

```env
# .env.production
VITE_API_URL=https://api.seudominio.com/api
VITE_WS_URL=wss://api.seudominio.com/ws
```

### 1.5 Build de produção

```bash
# Na pasta do frontend
npm run build

# O output estará em dist/
```

## 2. Configuração do Nginx

### 2.1 nginx.conf principal

```nginx
# /opt/datacenter-app/nginx/nginx.conf

user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 50M;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript 
               application/rss+xml application/atom+xml image/svg+xml;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    # Upstream para backend
    upstream backend {
        server backend:3000;
        keepalive 32;
    }

    # Redirect HTTP para HTTPS
    server {
        listen 80;
        listen [::]:80;
        server_name seudominio.com www.seudominio.com;
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name seudominio.com www.seudominio.com;

        # SSL
        ssl_certificate /etc/letsencrypt/live/seudominio.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/seudominio.com/privkey.pem;
        ssl_session_timeout 1d;
        ssl_session_cache shared:SSL:50m;
        ssl_session_tickets off;
        
        # Modern SSL configuration
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # HSTS
        add_header Strict-Transport-Security "max-age=63072000" always;

        # Frontend (React SPA)
        root /usr/share/nginx/html;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
            
            # Cache para assets estáticos
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }

        # API Backend
        location /api {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Connection "";
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Rate limiting mais restritivo para login
        location /api/auth/login {
            limit_req zone=login burst=5 nodelay;
            
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket para terminal
        location /ws {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts para WebSocket
            proxy_read_timeout 86400s;
            proxy_send_timeout 86400s;
        }

        # Uploads (servidos diretamente)
        location /uploads {
            alias /app/uploads;
            expires 7d;
            add_header Cache-Control "public";
        }

        # Health check
        location /health {
            proxy_pass http://backend/health;
            access_log off;
        }

        # Bloquear arquivos sensíveis
        location ~ /\. {
            deny all;
        }
    }

    # API subdomain (opcional)
    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name api.seudominio.com;

        ssl_certificate /etc/letsencrypt/live/seudominio.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/seudominio.com/privkey.pem;
        ssl_session_timeout 1d;
        ssl_session_cache shared:SSL:50m;
        ssl_protocols TLSv1.2 TLSv1.3;

        location / {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Connection "";
        }

        location /ws {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_read_timeout 86400s;
        }
    }
}
```

### 2.2 Dockerfile do Frontend

```dockerfile
# frontend/Dockerfile

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build arguments para URLs
ARG VITE_API_URL
ARG VITE_WS_URL

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

RUN npm run build

# Production stage
FROM nginx:alpine

# Copiar build
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuração customizada (opcional)
# COPY nginx.conf /etc/nginx/nginx.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

## 3. Configurar SSL com Let's Encrypt

### 3.1 Primeira vez (sem SSL)

```bash
# Criar diretório para certbot
mkdir -p /opt/datacenter-app/certbot/www
mkdir -p /opt/datacenter-app/certbot/conf

# Iniciar nginx temporário sem SSL
# Use uma configuração simplificada primeiro

# Obter certificado
docker run --rm -v /opt/datacenter-app/certbot/conf:/etc/letsencrypt \
  -v /opt/datacenter-app/certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  -d seudominio.com -d www.seudominio.com \
  --email seu@email.com --agree-tos --no-eff-email
```

### 3.2 Renovação automática

```bash
# scripts/renew-ssl.sh
#!/bin/bash

docker run --rm \
  -v /opt/datacenter-app/certbot/conf:/etc/letsencrypt \
  -v /opt/datacenter-app/certbot/www:/var/www/certbot \
  certbot/certbot renew --quiet

# Recarregar nginx
docker exec datacenter-nginx nginx -s reload
```

```bash
# Adicionar ao cron (2x por dia)
crontab -e
# 0 0,12 * * * /opt/datacenter-app/scripts/renew-ssl.sh >> /var/log/ssl-renew.log 2>&1
```

---

## ✅ Checklist de Conclusão

- [ ] Cliente API criado
- [ ] Hook de autenticação atualizado
- [ ] Variáveis de ambiente configuradas
- [ ] Build de produção gerado
- [ ] nginx.conf configurado
- [ ] Dockerfile do frontend criado
- [ ] SSL configurado
- [ ] Renovação automática de SSL

---

## 🔜 Próximo Passo

[Docker e Deploy →](./05-docker-deploy.md)
