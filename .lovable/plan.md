

# Corrigir Graficos Cortados no Dashboard

## Problema Identificado

Cada grafico no Dashboard esta sendo renderizado dentro de **dois Cards aninhados**:
- O Dashboard cria um Card externo com altura fixa (`h-[250px]` ou `h-[200px]`)
- Cada componente de grafico (RackOccupancyChart, EquipmentTypeChart, etc.) cria seu proprio Card interno com `h-[300px]`

Resultado: os graficos ficam cortados porque o container externo e menor que o conteudo interno.

## Solucao

Remover os Cards externos do Dashboard e deixar cada componente de grafico renderizar seu proprio Card completo. Isso elimina o aninhamento e permite que cada grafico ocupe o espaco necessario.

## Alteracoes

### Arquivo: `src/pages/Dashboard.tsx`

**Secao "Analise de Infraestrutura" (linhas 219-267):**
- Remover os Cards externos que envolvem cada grafico
- Manter o grid `md:grid-cols-2` mas com os componentes diretamente dentro
- Cada componente (RackOccupancyChart, EquipmentTypeChart, ConnectionStatusChart, PortUsageChart) ja possui seu proprio Card com header e conteudo

**Secao "Centro de Suporte" - graficos de tickets (linhas 298-325):**
- Mesmo problema: Cards externos com `h-[200px]` envolvendo TicketsByCategoryChart, TicketsByTechnicianChart e TicketTrendChart
- Remover os Cards externos e deixar os componentes renderizarem seus proprios Cards
- Manter o grid `md:grid-cols-3`

### Resultado esperado
- Graficos de infraestrutura: 4 cards em grid 2x2, cada um com altura adequada para visualizar o conteudo completo
- Graficos de tickets: 3 cards em linha, sem corte de conteudo
- Labels dos eixos, legendas e tooltips totalmente visiveis

