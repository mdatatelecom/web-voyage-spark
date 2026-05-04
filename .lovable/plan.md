## Substituir "Mdata Telecom" por "IW TELECOM"

### Onde aparece hoje
1. **`index.html`** — meta tag `twitter:site` contém `@Mdata Telecom`. (O `<title>` já está "IW Telecom" — será padronizado para "IW TELECOM".)
2. **Tela de login** (`/auth`) — exibe `branding.systemName` vindo do banco, hoje setado como **"Guarulhos Sucatas"** (tabela `system_settings`, chave `branding`). Não há literal "Mdata Telecom" no código da tela.
3. **Banco** — `whatsapp_settings.evolutionApiUrl = https://chat.mdatatelecom.com.br` é a URL real do servidor Evolution API (infra), **não será alterado** para não quebrar o WhatsApp.

### Mudanças
1. **`index.html`**
   - `<title>` → `IW TELECOM - Gestão de Infraestrutura de Rede`
   - `og:title` → `IW TELECOM`
   - `twitter:site` → `@IWTelecom`
   - `meta author` → `IW TELECOM`

2. **Banco (`system_settings.branding`)** via migration:
   - `systemName`: `"Guarulhos Sucatas"` → `"IW TELECOM"`
   - Mantém `logoUrl` e `faviconUrl` atuais.
   - Isso atualiza automaticamente o nome exibido na tela de login, no header e no `<title>` dinâmico (quando aplicável).

### Fora do escopo
- URL da Evolution API (`chat.mdatatelecom.com.br`) e domínio customizado (`redesgs.mdatatelecom.com.br`) — são infraestrutura externa, não textos de UI.

Confirma para aplicar?