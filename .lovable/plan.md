

## Plano: Indicador Visual para Alertas EPI sem Imagem

### Resumo

Adicionar um indicador visual discreto nos alertas EPI que não possuem screenshot anexado, informando o usuário que a captura não estava disponível.

---

### Situação Atual

Os logs confirmam:
- Webhook está funcionando corretamente
- Sistema identifica presença/ausência de imagem (`Has image: false`)
- EPI Monitor atualmente envia `"image": null`
- Alertas EPI sem imagem aparecem sem nenhum indicador visual

---

### Alteração Proposta

**Arquivo:** `src/components/notifications/AlertList.tsx`

Adicionar um badge/indicador para alertas EPI quando não há imagem:

```text
┌─────────────────────────────────────────────────────────────────┐
│ 🦺 [EPI Monitor]                                                │
│ [EPI] SEM CAPACETE detectado na Camera 2                        │
│ Alerta de segurança: SEM CAPACETE detectado...                  │
│                                                                 │
│ ┌──────────────┐                                                │
│ │ 📷 Sem       │  [Marcar como Lido] [Resolver]                 │
│ │   imagem     │                                                │
│ └──────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
```

Lógica a ser adicionada:

```typescript
// Verificar se é alerta EPI sem imagem
const isEpiWithoutImage = (alert) => {
  return alert.type === 'epi_alert' && !(alert.metadata as any)?.image_url;
};

// No JSX, após a verificação de hasEpiImage:
{isEpiWithoutImage(alert) && (
  <div className="shrink-0 flex items-center justify-center w-20 h-14 bg-muted/50 rounded border border-dashed">
    <div className="text-center">
      <ImageOff className="h-4 w-4 text-muted-foreground mx-auto" />
      <span className="text-[10px] text-muted-foreground">Sem imagem</span>
    </div>
  </div>
)}
```

---

### Arquivos a Serem Modificados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/notifications/AlertList.tsx` | Modificar | Adicionar placeholder visual para alertas EPI sem screenshot |

---

### Resultado Visual Esperado

**Com imagem:**
- Miniatura clicável + botão "Ver"

**Sem imagem:**
- Placeholder com ícone `ImageOff` e texto "Sem imagem"
- Borda tracejada e fundo discreto
- Mantém alinhamento visual consistente

---

### Benefícios

1. **Feedback claro** - usuário sabe que a imagem não está disponível (não é um erro de carregamento)
2. **Consistência visual** - todos os alertas EPI mantêm o mesmo layout
3. **Diagnóstico** - ajuda a identificar se o EPI Monitor está enviando imagens ou não

