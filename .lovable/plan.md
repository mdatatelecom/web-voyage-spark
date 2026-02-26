

## Revisao do Wizard "Adicionar Camera" - Associar a NVR/DVR sem exigir Rack

### Problema Atual
- O campo `rack_id` na tabela `equipment` e `NOT NULL`, forcando toda camera a estar vinculada a um rack
- O wizard atual busca um rack (do switch PoE ou da sala) para inserir a camera
- Cameras nao ficam em racks -- elas ficam em paredes, tetos, postes, etc. O que importa e saber a qual NVR/DVR elas estao conectadas

### Solucao Proposta

**1. Migracao de Banco de Dados**
- Tornar `equipment.rack_id` nullable (`ALTER TABLE equipment ALTER COLUMN rack_id DROP NOT NULL`)
- Remover `ON DELETE CASCADE` e trocar por `ON DELETE SET NULL` para que ao deletar um rack, equipamentos nao-rack (cameras) nao sejam deletados
- Cameras passarao a ter `rack_id = NULL`

**2. Adicionar Step "Associar a NVR/DVR" no CameraWizard**
- Novo passo no wizard (entre Location e Power Source) para selecionar o NVR ou DVR destino
- Listar todos os NVRs/DVRs cadastrados, mostrando: nome, IP, canais totais vs ocupados, localizacao
- Ao selecionar um NVR, mostrar os canais disponiveis para associar a camera
- Para cameras analogicas (HD-TVI/CVI), a associacao e obrigatoria (sempre conectam a um DVR)
- Para cameras IP, a associacao e opcional (podem ser standalone conectadas ao switch)

**3. Refatorar a Mutacao de Criacao**
- Remover a logica que busca rack obrigatorio
- Ao criar a camera: `rack_id: null`, `position_u_start: null`, `position_u_end: null`
- Ao associar a NVR/DVR: atualizar o campo `notes` do NVR com os dados da nova camera no canal selecionado, e atualizar o status da porta (canal) do NVR para `in_use`

**4. Ajustar fluxo de steps**
- Camera IP: Tipo -> Fabricante -> Specs/Rede -> Localizacao -> NVR (opcional) -> Fonte PoE
- Camera Analogica: Tipo -> Fabricante -> Specs -> Localizacao -> DVR/NVR (obrigatorio)

### Detalhes Tecnicos

**Migracao SQL:**
```sql
ALTER TABLE public.equipment ALTER COLUMN rack_id DROP NOT NULL;
ALTER TABLE public.equipment DROP CONSTRAINT IF EXISTS equipment_rack_id_fkey;
ALTER TABLE public.equipment ADD CONSTRAINT equipment_rack_id_fkey 
  FOREIGN KEY (rack_id) REFERENCES public.racks(id) ON DELETE SET NULL;
```

**Arquivos a modificar:**
- `src/components/equipment/CameraWizard.tsx` -- adicionar step de NVR/DVR, remover exigencia de rack
- `src/hooks/useEquipment.ts` -- ajustar validacao de posicao (skip quando rack_id null)

**Novo fetch de NVRs/DVRs no wizard:**
- Query: `equipment` WHERE `type IN ('nvr', 'nvr_poe', 'dvr')` com join em racks/rooms para mostrar localizacao
- Parse `notes` de cada NVR para mostrar canais ocupados/vagos
- Ao selecionar canal, buscar a porta correspondente (`ports` WHERE `equipment_id = nvrId AND port_number = channel`)

