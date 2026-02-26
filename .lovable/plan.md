

# Remover Funcionalidades de Cameras ao Vivo

## Contexto

As cameras no sistema passam a ser apenas para documentacao (fotos de localizacao, registro de instalacao). Toda funcionalidade de visualizacao ao vivo (streaming, snapshots dinamicos, indicadores LIVE) sera removida.

## Arquivos e Alteracoes

### 1. `src/components/equipment/CameraThumbnail.tsx`
- Remover props `snapshotUrl`, `liveUrl`, `refreshInterval`
- Remover estado `refreshKey` e funcao `handleRefresh`
- Remover bloco "Live indicator for streams" (badge LIVE)
- Remover botao de refresh
- Simplificar para usar apenas `fallbackImage` (foto de localizacao) como fonte de imagem
- O componente mostra apenas a foto estatica da camera ou o placeholder (icone Camera)

### 2. `src/components/equipment/EquipmentEditDialog.tsx`
- Remover estado `liveUrl` e `setLiveUrl`
- Remover campo "URL de Streaming ao Vivo" do formulario
- Remover `live_url` do objeto de notas salvas
- Manter campos de foto de localizacao e descricao (documentacao)

### 3. `src/pages/CameraMap.tsx`
- Remover props `snapshotUrl` e `liveUrl` de todas as chamadas ao `CameraThumbnail`
- Remover `refreshInterval` das chamadas
- Manter `fallbackImage` (foto de localizacao) como unica fonte visual

### 4. `src/pages/EquipmentDetails.tsx`
- Remover funcao `extractLiveUrl`
- Remover variavel `liveUrl` do bloco de camera
- Nao ha mais referencia a streaming nessa pagina

### 5. `src/hooks/useCameras.ts`
- Nenhuma alteracao necessaria - ja nao referencia live/snapshot URLs diretamente (usa `location_photo_url` de notes)

## O que permanece

- Fotos de localizacao (upload e exibicao)
- Descricao de localizacao
- Status do equipamento (active/offline/planned)
- Indicador de status (bolinha verde/vermelha)
- Toda a topologia NVR/DVR e associacao de canais
- Mapa de cameras com filtros

## Resumo Tecnico

| Arquivo | Acao |
|---------|------|
| CameraThumbnail.tsx | Simplificar - remover live/snapshot/refresh |
| EquipmentEditDialog.tsx | Remover campo live_url |
| CameraMap.tsx | Remover props live/snapshot das chamadas |
| EquipmentDetails.tsx | Remover extractLiveUrl e uso |

