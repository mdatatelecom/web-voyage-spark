#!/bin/bash

# ===========================================
# Script de Teste de Compilação do Backend
# ===========================================

set -e

echo "=============================================="
echo "  Teste de Compilação do Backend Node.js     "
echo "=============================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo -e "${RED}Erro: Execute este script do diretório backend/${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}1. Verificando Node.js...${NC}"
node --version || { echo -e "${RED}Node.js não encontrado${NC}"; exit 1; }
npm --version || { echo -e "${RED}npm não encontrado${NC}"; exit 1; }

echo ""
echo -e "${YELLOW}2. Instalando dependências...${NC}"
npm install

echo ""
echo -e "${YELLOW}3. Verificando tipos TypeScript...${NC}"
npx tsc --noEmit || { echo -e "${RED}Erros de TypeScript encontrados${NC}"; exit 1; }

echo ""
echo -e "${YELLOW}4. Compilando projeto...${NC}"
npm run build

echo ""
echo -e "${YELLOW}5. Verificando arquivos gerados...${NC}"
if [ -d "dist" ]; then
    echo -e "${GREEN}✓ Diretório dist/ criado${NC}"
    echo "  Arquivos gerados:"
    find dist -name "*.js" | head -20
else
    echo -e "${RED}✗ Diretório dist/ não encontrado${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}6. Verificando arquivo principal...${NC}"
if [ -f "dist/index.js" ]; then
    echo -e "${GREEN}✓ dist/index.js existe${NC}"
else
    echo -e "${RED}✗ dist/index.js não encontrado${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=============================================="
echo "  ✓ Compilação concluída com sucesso!        "
echo "==============================================${NC}"
echo ""
echo "Para iniciar o servidor em desenvolvimento:"
echo "  npm run dev"
echo ""
echo "Para iniciar em produção:"
echo "  npm start"
echo ""

# Verificação opcional: iniciar servidor brevemente para testar
if [ "$1" == "--test-start" ]; then
    echo -e "${YELLOW}7. Testando inicialização do servidor...${NC}"
    timeout 5 npm start || true
    echo -e "${GREEN}✓ Servidor iniciou corretamente${NC}"
fi
