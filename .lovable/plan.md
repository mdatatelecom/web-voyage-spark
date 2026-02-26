

## Plano: Limpeza do Projeto - Remover Funcionalidades Desnecessarias

### Resumo

Remover completamente 4 funcionalidades do projeto e limpar as tabelas do banco de dados associadas:

1. **Cameras ao vivo (tempo real)** - Dialog de live streaming, proxies go2rtc/WebRTC
2. **Chat com IA** - Botao flutuante, dialog, hook, edge function
3. **Base de Conhecimento** - Pagina, dialog, hook, tabela
4. **CLI (Terminal)** - Dialog do terminal, componente de autocomplete

---

### Detalhes Tecnicos

#### 1. Remover Camera ao Vivo

**Arquivos a deletar:**
- `src/components/equipment/CameraLiveDialog.tsx`
- `supabase/functions/go2rtc-proxy/index.ts`
- `supabase/functions/go2rtc-hls-proxy/index.ts`
- `supabase/functions/go2rtc-webrtc-proxy/index.ts`
- `supabase/functions/go2rtc-snapshot-proxy/index.ts`
- `supabase/functions/hls-proxy/index.ts`

**Arquivos a editar:**
- `src/pages/CameraMap.tsx` - Remover import e uso do CameraLiveDialog, botao "Ao Vivo"
- `src/pages/EquipmentDetails.tsx` - Remover import e uso do CameraLiveDialog, botao "Play"
- `src/components/equipment/CameraThumbnail.tsx` - Remover snapshot via go2rtc (manter thumbnail estatico ou placeholder)
- `supabase/config.toml` - Remover entradas das 5 functions de proxy

**Hooks a deletar:**
- `src/hooks/useGo2rtcSettings.ts`

**Arquivos a editar (referencias ao go2rtc):**
- `src/pages/System.tsx` - Remover secao de configuracao go2RTC

#### 2. Remover Chat com IA

**Arquivos a deletar:**
- `src/components/ai/SystemChatButton.tsx`
- `src/components/ai/SystemChatDialog.tsx`
- `src/components/ai/ChatMessage.tsx`
- `src/hooks/useSystemChat.ts`
- `supabase/functions/system-chat/index.ts`

**Arquivos a editar:**
- `src/components/layout/AppLayout.tsx` - Remover import e uso do `SystemChatButton`
- `supabase/config.toml` - Remover entrada `[functions.system-chat]`

#### 3. Remover Base de Conhecimento

**Arquivos a deletar:**
- `src/pages/KnowledgeBase.tsx`
- `src/components/ai/KnowledgeDialog.tsx`
- `src/components/ai/ImportPreviewDialog.tsx`
- `src/hooks/useKnowledgeBase.ts`

**Arquivos a editar:**
- `src/App.tsx` - Remover rota `/knowledge-base` e import
- `src/components/layout/AppLayout.tsx` - Remover item "Base de Conhecimento" do menu (linha 198)

#### 4. Remover CLI (Terminal)

**Arquivos a deletar:**
- `src/components/cli/TerminalDialog.tsx`
- `src/components/cli/AutocompleteDropdown.tsx`

**Arquivos a editar:**
- `src/components/layout/AppLayout.tsx` - Remover import do TerminalDialog, estado `terminalOpen`, item "CLI" do menu, e `<TerminalDialog>` do JSX
- `supabase/config.toml` - Remover entrada `[functions.terminal-proxy]` (se aplicavel)

**Edge function a deletar:**
- `supabase/functions/terminal-proxy/index.ts`

#### 5. Limpeza do Banco de Dados

Executar migracao SQL para:
- `DROP TABLE IF EXISTS chat_messages CASCADE;` - Mensagens do chat IA
- `DROP TABLE IF EXISTS system_knowledge CASCADE;` - Base de conhecimento
- Remover dados de `system_settings` relacionados ao go2rtc (`DELETE FROM system_settings WHERE setting_key = 'go2rtc_server'`)

#### 6. Limpeza de Configuracao

- `supabase/config.toml` - Remover todas as entradas das functions deletadas:
  - `system-chat`
  - `terminal-proxy`
  - `go2rtc-proxy`
  - `go2rtc-hls-proxy`
  - `go2rtc-webrtc-proxy`
  - `go2rtc-snapshot-proxy`
  - `hls-proxy`

---

### Dependencias npm que podem ser removidas apos limpeza

- `hls.js` - Usado apenas pelo CameraLiveDialog (verificar se nao ha outro uso)

### O que permanece intacto

- Sistema de cameras (cadastro, mapa, thumbnails estaticos, NVR report)
- WhatsApp integration
- Tickets/Chamados
- Toda infraestrutura (Buildings, Floors, Rooms, Racks, Equipment, Connections)
- IPAM, VLANs, Alertas, Monitoramento
- QR Scanner, Labels, Audit

