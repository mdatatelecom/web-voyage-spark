

## Plano: Proteção contra DevTools e Código Fonte

### Objetivo
Implementar proteção para dificultar o acesso ao código fonte da aplicação através de:
- Bloqueio do menu de contexto (clique direito)
- Bloqueio de teclas de atalho (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U)
- Configuração via painel de administração para ativar/desativar

---

### Nova Estrutura

```text
Configurações do Sistema (System.tsx)
├── Aba "Segurança" ou dentro de "Status"
│   ├── Toggle: Desabilitar Menu de Contexto (clique direito)
│   ├── Toggle: Desabilitar Teclas de Desenvolvedor (F12, Ctrl+Shift+I)
│   └── Descrição informativa sobre as limitações
```

---

### Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/hooks/useDevToolsProtection.ts` | Criar | Hook que gerencia proteção de DevTools |
| `src/hooks/useSystemSettings.ts` | Modificar | Adicionar interface e lógica para security_settings |
| `src/pages/System.tsx` | Modificar | Adicionar seção de configuração de segurança |
| `src/App.tsx` | Modificar | Aplicar proteção global via hook |

---

### Detalhes Técnicos

#### 1. Novo Hook: useDevToolsProtection.ts

Este hook irá:
- Carregar configurações de segurança do banco/cache
- Adicionar listeners para eventos de teclado e contexto
- Bloquear atalhos: F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
- Bloquear menu de contexto (clique direito)
- Limpar listeners ao desmontar

```typescript
// Estrutura básica do hook
interface SecuritySettings {
  disableContextMenu: boolean;
  disableDevToolsShortcuts: boolean;
}

export const useDevToolsProtection = () => {
  // Carregar configurações do localStorage/banco
  // Adicionar event listeners condicionalmente
  // Retornar estado atual
};
```

#### 2. Event Listeners

**Teclado (keydown):**
```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  // F12
  if (e.key === 'F12') {
    e.preventDefault();
    return false;
  }
  
  // Ctrl+Shift+I (DevTools)
  if (e.ctrlKey && e.shiftKey && e.key === 'I') {
    e.preventDefault();
    return false;
  }
  
  // Ctrl+Shift+J (Console)
  if (e.ctrlKey && e.shiftKey && e.key === 'J') {
    e.preventDefault();
    return false;
  }
  
  // Ctrl+Shift+C (Inspect)
  if (e.ctrlKey && e.shiftKey && e.key === 'C') {
    e.preventDefault();
    return false;
  }
  
  // Ctrl+U (View Source)
  if (e.ctrlKey && e.key === 'u') {
    e.preventDefault();
    return false;
  }
};
```

**Menu de Contexto:**
```typescript
const handleContextMenu = (e: MouseEvent) => {
  e.preventDefault();
  return false;
};
```

#### 3. Armazenamento

Utilizará a tabela `system_settings` existente com uma nova chave:
```json
{
  "setting_key": "security_settings",
  "setting_value": {
    "disableContextMenu": true,
    "disableDevToolsShortcuts": true
  }
}
```

#### 4. Interface de Configuração (System.tsx)

Adicionar dentro da aba de configurações ou criar nova aba "Segurança":

- **Toggle "Desabilitar Clique Direito"**
  - Impede menu de contexto do navegador
  
- **Toggle "Desabilitar Atalhos de Desenvolvedor"**
  - Bloqueia F12, Ctrl+Shift+I/J/C, Ctrl+U

- **Aviso informativo:**
  > "Estas proteções dificultam mas não impedem totalmente o acesso ao código fonte. Usuários avançados podem contorná-las. São úteis para prevenir acesso casual."

---

### Fluxo de Funcionamento

1. Usuário acessa Sistema → Configurações de Segurança
2. Ativa os toggles desejados
3. Configuração salva no banco de dados
4. Hook `useDevToolsProtection` carrega configurações
5. Listeners são adicionados globalmente no App
6. Tentativas de usar F12/clique direito são bloqueadas

---

### Integração no App.tsx

```typescript
import { useDevToolsProtection } from '@/hooks/useDevToolsProtection';

const App = () => {
  // Aplicar proteção globalmente
  useDevToolsProtection();
  
  return (
    // ... resto do app
  );
};
```

---

### Considerações de Segurança

**Limitações importantes:**
- Esta proteção é apenas uma barreira visual/casual
- DevTools pode ser aberto de outras formas (menu do navegador, linha de comando)
- Código fonte sempre pode ser acessado via Network tab
- É uma medida de "security through obscurity"

**Benefícios:**
- Impede acesso casual por usuários não técnicos
- Dificulta cópia rápida de conteúdo
- Profissionaliza a aparência do sistema

---

### Estimativa de Alterações

- **Novo hook**: ~80 linhas
- **System.tsx**: ~50 linhas adicionais
- **App.tsx**: ~5 linhas
- **useSystemSettings.ts**: ~30 linhas

