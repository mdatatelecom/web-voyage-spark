

## Analise e Ajustes na Logica de Provisionamento CFTV

### Comparacao: Regras do Usuario vs Implementacao Atual

| Regra | Status Atual | Acao Necessaria |
|-------|-------------|-----------------|
| **NVR Padrao**: 1 Uplink + 1 LAN, sem PoE, cameras no switch | Parcial - NVR gera apenas 1 Uplink | Adicionar porta LAN/IPC extra |
| **NVR PoE**: 1 Uplink + portas PoE dedicadas | OK - `generateNvrPorts` ja faz isso | Nenhuma |
| **DVR**: 1 Uplink + entradas BNC | INCORRETO - DVR gera apenas 1 Uplink, sem portas BNC | Gerar portas BNC conforme canais |
| **Cam Analogica so DVR** | PARCIAL - wizard exige NVR/DVR mas nao filtra apenas DVR | Filtrar para mostrar apenas DVRs |
| **Cam Analogica exige tipo de fonte** | NAO IMPLEMENTADO | Adicionar step de fonte para analogicas |
| **Cam IP + NVR PoE: validar portas PoE** | PARCIAL - valida canais mas nao valida portas PoE especificamente | Verificar porta PoE disponivel + criar conexao |
| **Cam IP + NVR Padrao: exigir switch + fonte** | NAO IMPLEMENTADO - wizard nao exige switch quando NVR padrao | Tornar step de Power Source obrigatorio |
| **Cam IP sem vinculo: marcar "Nao Gravando"** | NAO IMPLEMENTADO | Definir `equipment_status: 'standalone'` ou flag nos notes |

### Plano de Implementacao

**1. Corrigir geracao de portas para DVR** (`src/hooks/useEquipment.ts`)
- Na funcao `generateNvrPorts`, quando `equipmentType === 'dvr'`, gerar portas BNC (tipo `bnc`) para cada canal alem da porta Uplink
- Usar `port_type: 'bnc'` para as entradas de video

**2. Corrigir geracao de portas para NVR Padrao** (`src/hooks/useEquipment.ts`)
- Adicionar uma segunda porta LAN/IPC (Ethernet) alem do Uplink, conforme regra do usuario

**3. Filtrar NVR/DVR por tipo de camera** (`src/components/equipment/CameraWizard.tsx`)
- Camera Analogica: mostrar **apenas DVRs** no step 5 (bloquear NVR)
- Camera IP: mostrar **apenas NVRs** (padrao e PoE) no step 5

**4. Adicionar selecao de fonte para cameras analogicas** (`src/components/equipment/CameraWizard.tsx`)
- Novo conteudo no step final (atual step 5 para analogicas) ou adicionar step 6 para analogicas
- Opcoes: Fonte 12V individual, Fonte 12V chaveada centralizada, Fonte multi-saida rack
- Campo obrigatorio

**5. Validacao IP + NVR Padrao** (`src/components/equipment/CameraWizard.tsx`)
- Quando camera IP seleciona NVR Padrao (nao PoE): obrigar preenchimento do step Power Source (switch PoE ou injetor ou fonte externa)
- Adicionar alerta explicando que NVR padrao nao alimenta cameras

**6. Validacao IP + NVR PoE** (`src/components/equipment/CameraWizard.tsx`)
- Ao selecionar NVR PoE: verificar portas PoE disponiveis (nao apenas canais)
- Ao confirmar: criar conexao automatica entre porta da camera e porta PoE do NVR
- Pular step de Power Source (PoE integrado)

**7. Camera IP standalone** (`src/components/equipment/CameraWizard.tsx`)
- Quando IP sem NVR: salvar `equipment_status: 'not_recording'` e adicionar flag `recording: false` nos notes
- Mostrar alerta "Camera nao estara gravando"

**8. Ajustar fluxo de steps**
- Camera IP + NVR PoE: Tipo -> Fabricante -> Specs/Rede -> Localizacao -> NVR PoE -> (sem power, pula)
- Camera IP + NVR Padrao: Tipo -> Fabricante -> Specs/Rede -> Localizacao -> NVR -> Power Source
- Camera IP + Standalone: Tipo -> Fabricante -> Specs/Rede -> Localizacao -> (sem NVR) -> Power Source
- Camera Analogica: Tipo -> Fabricante -> Specs -> Localizacao -> DVR -> Fonte DC

### Detalhes Tecnicos

**Constante nova para fontes analogicas** (`src/constants/cameraSpecs.ts`):
```typescript
export const ANALOG_POWER_SOURCE_TYPES = [
  { value: 'individual_12v', label: 'Fonte 12V Individual', icon: '🔋' },
  { value: 'centralized_12v', label: 'Fonte 12V Chaveada Centralizada', icon: '⚡' },
  { value: 'rack_multi', label: 'Fonte Multi-Saida Rack', icon: '🔌' },
];
```

**Geracao de portas DVR corrigida** (`src/hooks/useEquipment.ts`):
```typescript
if (equipmentType === 'dvr') {
  for (let i = 1; i <= totalChannels; i++) {
    ports.push({
      equipment_id: equipmentId,
      name: `BNC${i}`,
      port_number: i,
      port_type: 'bnc',
      speed: null,
      status: 'available',
      notes: `Entrada BNC - Canal ${i}`
    });
  }
}
```

**Arquivos a modificar:**
- `src/hooks/useEquipment.ts` - corrigir `generateNvrPorts` para DVR (BNC) e NVR (2a porta LAN)
- `src/components/equipment/CameraWizard.tsx` - filtros, validacoes, fonte analogica, standalone
- `src/constants/cameraSpecs.ts` - adicionar `ANALOG_POWER_SOURCE_TYPES`

