## Problemas identificados

1. **Nome "Mdata Telecom" aparece** (imagem 1): o fallback padrão em `useSystemSettings.ts` e o cache do localStorage usam `"Mdata Telecom"`. Quando não há configuração salva no banco (ou o cache antigo é lido), aparece esse nome em vez de "IW Telecom".

2. **"Duas telas de login" / cabeçalho duplicado** (imagem 2): em `src/pages/Auth.tsx` o componente exibe **a logo (imagem)** e logo abaixo **o `systemName` em texto**. Como a logo enviada (Guarulhos) já contém texto próprio, visualmente parece dois títulos empilhados antes do card de login.

## Correções propostas

### 1. `src/hooks/useSystemSettings.ts`
- Trocar o fallback padrão de `systemName` de `"Mdata Telecom"` para `"IW Telecom"` (nas duas funções: `getBrandingFromCache` e o objeto retornado quando não há cache).
- Manter `document.title` usando o nome do branding (já correto).

### 2. `src/pages/Auth.tsx`
Ajustar o bloco do cabeçalho para evitar duplicação:
- **Se houver `logoUrl`**: mostrar **apenas a imagem da logo** (sem repetir o `systemName` abaixo, já que muitas logos já contêm o nome da empresa).
- **Se não houver `logoUrl`**: manter o ícone padrão + texto `systemName`.

### 3. Atualizar branding salvo no banco
Executar um update em `system_settings` (chave `branding`) para definir `systemName = "IW Telecom"`, garantindo que instâncias que já têm registro recebam o nome correto. (Migration de UPDATE no jsonb `setting_value`.)

### 4. Limpar cache local
Após o deploy, o usuário deve dar refresh; o listener já existente atualiza o `document.title` quando o cache muda. Sem mudança de código adicional.

## Arquivos afetados
- `src/hooks/useSystemSettings.ts` (default fallback)
- `src/pages/Auth.tsx` (não exibir nome duplicado quando há logo)
- Nova migration SQL para atualizar `system_settings.setting_value->>'systemName'` para `"IW Telecom"`
