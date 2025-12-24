# ================================
# Stage 1: Dependencies
# ================================
FROM node:20-alpine AS deps

WORKDIR /app

# Copiar apenas package files para cache de dependências
COPY package*.json ./

# Instalar todas as dependências
RUN npm ci

# ================================
# Stage 2: Build
# ================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar dependências do stage anterior
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./

# Copiar código fonte
COPY tsconfig.json ./
COPY src ./src

# Build do TypeScript
RUN npm run build

# Remover devDependencies após build
RUN npm prune --production

# ================================
# Stage 3: Production
# ================================
FROM node:20-alpine AS production

WORKDIR /app

# Instalar apenas dependências de runtime necessárias para sharp
RUN apk add --no-cache \
    vips-dev \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Copiar package.json para referência
COPY package.json ./

# Copiar node_modules já prunados
COPY --from=builder /app/node_modules ./node_modules

# Copiar build
COPY --from=builder /app/dist ./dist

# Criar diretórios necessários com permissões corretas
RUN mkdir -p /app/uploads /app/logs && \
    chown -R nodejs:nodejs /app

# Usar usuário não-root
USER nodejs

# Variáveis de ambiente padrão
ENV NODE_ENV=production \
    PORT=3001 \
    HOST=0.0.0.0

# Expor porta
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Usar dumb-init para gerenciar sinais corretamente
ENTRYPOINT ["dumb-init", "--"]

# Comando de inicialização
CMD ["node", "dist/index.js"]
