## Problema

As notificações de alertas Zabbix no WhatsApp usam um **template fixo no código** (`zabbix-webhook/index.ts` linha 897), e não a mensagem `whatsapp_message` gerada pela IA seguindo o prompt configurado em `/system/ai`.

A análise IA até é disparada (linha 818-838), mas roda em background, sem aguardar resposta, e o resultado nunca é usado para o envio do WhatsApp.

## Solução

Alterar `supabase/functions/zabbix-webhook/index.ts` para, quando IA estiver habilitada e `auto_analyze = true`:

1. **Aguardar** o retorno de `analyze-zabbix-alert` (em vez de fire-and-forget).
2. Usar `analysis.whatsapp_message` como conteúdo da notificação WhatsApp (em vez do template hardcoded da linha 897).
3. **Fallback**: se a IA falhar, demorar muito (timeout ~12s), estiver desabilitada, ou retornar mensagem vazia, manter o template atual como backup, garantindo que o alerta nunca deixe de ser enviado.

Aplicar a mesma lógica para o caminho de **recovery** (linha 659) é opcional — sugiro manter o template fixo de recuperação por enquanto, pois recovery não passa pela IA hoje.

## Detalhes técnicos

Trecho a alterar (resumido):

```ts
// Após inserir o alerta, ANTES do envio WhatsApp:
let aiWhatsAppMessage: string | null = null;
if (aiSettings?.enabled && aiSettings?.auto_analyze) {
  try {
    const { data: aiResp } = await supabase.functions.invoke(
      'analyze-zabbix-alert',
      { body: { alert_id: alertData.id, host, trigger_name: trigger,
                severity: String(severity), last_value: itemValue,
                message: detailedMessage, payload } }
    );
    aiWhatsAppMessage = aiResp?.analysis?.whatsapp_message ?? null;
  } catch (e) { console.error('AI analyze failed, using fallback:', e); }
}

const notificationMessage = aiWhatsAppMessage?.trim()
  || `${emoji} *ALERTA ZABBIX (...)*\n...`; // template atual como fallback
```

Risco: aguardar IA aumenta o tempo da requisição do webhook (~3-10s típico Gemini Flash). Aceitável já que o Zabbix faz retry e a função tem timeout adequado. Caso o usuário queira velocidade máxima, oferecer alternativa: continuar em background mas só enviar WhatsApp depois (em duas mensagens), porém isso é mais complexo e fora deste escopo.

## Verificação

- Após implementação, disparar um alerta de teste do Zabbix (ou simular via curl no webhook) e confirmar nos logs que a mensagem enviada contém os separadores `━━━` e blocos do template do prompt.
- Build e lint são validados automaticamente pela plataforma após o edit.
