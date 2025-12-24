# ================================
# Stage 1: Build
# ================================
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependências de build
RUN apk add --no-cache python3 make g++

# Copiar package files
COPY package*.json ./

# Instalar todas as dependências (incluindo dev)
RUN npm ci

# Copiar código fonte
COPY . .

# Build do TypeScript
RUN npm run build

# ================================
# Stage 2: Production
# ================================
FROM node:20-alpine AS production

WORKDIR /app

# Instalar apenas dependências de runtime necessárias para sharp
RUN apk add --no-cache vips-dev

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copiar package files
COPY package*.json ./

# Instalar apenas dependências de produção
RUN npm ci --only=production && npm cache clean --force

# Copiar build do stage anterior
COPY --from=builder /app/dist ./dist

# Criar diretórios necessários
RUN mkdir -p /app/uploads /app/logs && \
    chown -R nodejs:nodejs /app

# Usar usuário não-root
USER nodejs

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Comando de inicialização
CMD ["node", "dist/index.js"]
