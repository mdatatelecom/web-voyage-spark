

# Corrigir Logica de Alertas NVR - Canais Proximo do Limite

## Problemas Identificados

### Bug 1: Tipo `nvr_poe` nao incluido na query
Na linha 316 do `check-capacity-alerts`, a query filtra `.in('type', ['nvr', 'dvr'])` mas **ignora `nvr_poe`**. Equipamentos do tipo NVR com PoE integrado nunca sao verificados.

Mesmo problema na auto-resolucao (linha 810): `.in('type', ['nvr', 'dvr'])`.

### Bug 2: Contagem de canais inclui portas de rede (Uplink/LAN)
A logica conta **todos** os ports do equipamento como canais:
```
const totalChannels = nvr.ports?.length || 0;
```
Porem NVRs possuem portas auxiliares (Uplink port_number=0, LAN/IPC port_number=-1) que **nao sao canais de video**. Isso infla o total e distorce a porcentagem.

- NVR padrao: tem 2 portas extras (Uplink + LAN/IPC) que nao sao canais
- NVR PoE: tem 1 porta extra (Uplink) + portas PoE que **sao** canais
- DVR: tem 1 porta extra (Uplink) + portas BNC que sao canais

### Bug 3: NVR padrao nao tem portas de canal
Para NVRs padrao (tipo `nvr`), a funcao `generateNvrPorts` cria apenas Uplink + LAN/IPC. **Nao cria portas de canal** porque cameras IP se conectam via switch externo. Portanto `totalChannels` sera 2 (portas de rede) e `usedChannels` sera 0 ou 1 -- nunca vai atingir o limite real.

Para NVR padrao, o total de canais deve vir do campo `notes` (JSON com `total_channels`) e os canais usados devem ser contados a partir das `cameras` registradas no notes.

## Plano de Correcao

### Arquivo: `supabase/functions/check-capacity-alerts/index.ts`

**Secao de verificacao NVR (linhas 305-383):**

1. Incluir `nvr_poe` na query: `.in('type', ['nvr', 'nvr_poe', 'dvr'])`
2. Tambem buscar o campo `notes` do equipamento para obter `total_channels`
3. Calcular canais corretamente por tipo:
   - **DVR**: contar portas BNC (`port_number > 0`) como total; status `in_use` como usados
   - **NVR PoE**: contar portas PoE (`port_number > 0`) como total; status `in_use` como usados
   - **NVR padrao**: usar `total_channels` do JSON em `notes`; contar `cameras` do notes como usados
4. Ignorar portas com `port_number <= 0` (Uplink, LAN/IPC)

**Secao de auto-resolucao NVR (linhas 771-798):**

5. Incluir `nvr_poe` na query da linha 810
6. Usar a mesma logica corrigida para calcular porcentagem

**Secao de cameras orfas (linha 810):**

7. Incluir `nvr_poe`: `.in('type', ['nvr', 'nvr_poe', 'dvr'])`

### Logica corrigida (pseudocodigo):

```text
Para cada NVR/DVR:
  Se tipo = 'dvr' ou 'nvr_poe':
    totalChannels = portas com port_number > 0
    usedChannels = portas com port_number > 0 E status = 'in_use'
  Se tipo = 'nvr' (padrao):
    parsedNotes = JSON.parse(notes)
    totalChannels = parsedNotes.total_channels || 16
    usedChannels = parsedNotes.cameras?.length || 0
  
  usagePercentage = (usedChannels / totalChannels) * 100
  -- continua logica existente de threshold
```

### Resumo de alteracoes

| Local | Alteracao |
|-------|----------|
| Linha 316 | Adicionar `nvr_poe` ao filtro de tipos |
| Linha 310 | Adicionar `notes` ao select |
| Linhas 325-329 | Reescrever calculo de canais por tipo |
| Linha 781-783 | Aplicar mesma logica corrigida na auto-resolucao |
| Linha 810 | Adicionar `nvr_poe` ao filtro de tipos |

