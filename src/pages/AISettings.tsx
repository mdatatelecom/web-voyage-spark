import { useState, useEffect } from "react";
import { useAISettings } from "@/hooks/useAISettings";
import { useTestAIConnection } from "@/hooks/useAIAnalyses";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const DEFAULT_PROMPT = `Você é um especialista em Infraestrutura Linux, Redes, CFTV, Câmeras IP, Mikrotik, Zabbix e monitoramento corporativo.

Analise o alerta recebido do Zabbix de forma técnica, clara e totalmente em português do Brasil.

Regras obrigatórias:
- NUNCA responda em inglês.
- Traduza automaticamente mensagens, erros, eventos e alertas para português do Brasil.
- Explique o problema de forma simples e também técnica.
- Identifique possíveis causas do incidente.
- Sugira comandos Linux, rede e diagnóstico.
- Sugira verificações específicas no Zabbix.
- Quando envolver CFTV, câmeras IP, NVR ou DVR: analisar conectividade, RTSP, perda de vídeo, latência, consumo de banda, autenticação, PoE, switch, gravação, armazenamento.
- Quando envolver Mikrotik: sugerir testes de rota, firewall, NAT, DNS, VPN, CPU, memória, perda de pacotes, interfaces (torch, profile, interface monitor, teste de banda, filas).
- Quando envolver Linux: sugerir análise de CPU, memória, disco, serviços, logs, rede, processos (dmesg, syslog, journalctl, iostat, vmstat, netstat).
- Em alertas de câmera: sugerir teste RTSP via VLC, validar ONVIF, verificar bitrate, codec H264/H265.
- Sempre gerar: tradução do alerta, explicação técnica, possíveis causas, diagnóstico recomendado, comandos sugeridos, verificações no Zabbix, checklist passo a passo, resumo curto para WhatsApp.

Regras adicionais:
- Nunca invente informações. Se o alerta estiver incompleto, informe quais dados adicionais seriam úteis.
- Priorize ações críticas primeiro.
- Classifique o nível do incidente: Baixo, Médio, Alto ou Crítico.
- Informe o impacto operacional provável.
- Sempre sugerir a causa raiz provável.
- Quando possível, correlacione: perda de pacote, CPU alta, falha de link, timeout, indisponibilidade de serviço, armazenamento cheio, falha de gravação, queda de energia, problema de DNS, lentidão de rede.

FORMATO OBRIGATÓRIO do campo whatsapp_message (use exatamente este template, com emojis e separadores):

━━━━━━━━━━━━━━━━━━━
🚨 ALERTA ZABBIX
━━━━━━━━━━━━━━━━━━━
🕒 Data/Hora: ...
🌐 Host: ...
📍 IP: ...
🔥 Severidade: ...
📡 Serviço Afetado: ...
📈 Impacto: ...

📌 Tradução do alerta:
...

📖 Explicação técnica:
...

⚠️ Possível causa raiz:
...

🔍 Diagnóstico recomendado:
...

💻 Comandos sugeridos:
...

📊 Verificações no Zabbix:
...

🎥 Análise CFTV/Rede:
...

✅ Plano de ação:
1. ...
2. ...
3. ...

📲 Resumo:
...`;

export default function AISettings() {
  const { data, isLoading, update } = useAISettings();
  const test = useTestAIConnection();
  const [form, setForm] = useState({
    model: "google/gemini-2.5-flash",
    temperature: 0.3,
    max_tokens: 2048,
    prompt_template: DEFAULT_PROMPT,
    enabled: true,
    auto_analyze: false,
  });
  const [testResult, setTestResult] = useState<null | { ok: boolean; msg: string }>(null);

  useEffect(() => {
    if (data) {
      setForm({
        model: data.model,
        temperature: Number(data.temperature),
        max_tokens: data.max_tokens,
        prompt_template: data.prompt_template,
        enabled: data.enabled,
        auto_analyze: data.auto_analyze,
      });
    }
  }, [data]);

  const handleSave = () => update.mutate(form);

  const handleTest = async () => {
    setTestResult(null);
    try {
      const r = await test.mutateAsync(form.model);
      setTestResult({ ok: r.ok, msg: r.ok ? `OK — resposta: ${r.sample}` : `Falha: ${r.error}` });
    } catch (e: any) {
      setTestResult({ ok: false, msg: e.message });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Configurações de IA</h1>
          <p className="text-muted-foreground text-sm">Análise inteligente de alertas Zabbix com Gemini via Lovable AI</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provedor</CardTitle>
          <CardDescription>
            Conectado via <Badge variant="secondary">Lovable AI Gateway</Badge> — sem necessidade de chave de API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Modelo</Label>
            <Select value={form.model} onValueChange={(v) => setForm({ ...form, model: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash (recomendado)</SelectItem>
                <SelectItem value="google/gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (econômico)</SelectItem>
                <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro (mais capaz)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Temperatura ({form.temperature})</Label>
              <Input type="number" step="0.1" min="0" max="2" value={form.temperature}
                onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })} />
            </div>
            <div className="grid gap-2">
              <Label>Limite de tokens</Label>
              <Input type="number" min="256" max="8192" value={form.max_tokens}
                onChange={(e) => setForm({ ...form, max_tokens: parseInt(e.target.value) })} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Habilitar IA</Label>
              <p className="text-xs text-muted-foreground">Permite gerar análises sob demanda</p>
            </div>
            <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Análise automática de alertas</Label>
              <p className="text-xs text-muted-foreground">Analisa cada novo alerta Zabbix recebido (consome créditos)</p>
            </div>
            <Switch checked={form.auto_analyze} onCheckedChange={(v) => setForm({ ...form, auto_analyze: v })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prompt do sistema</CardTitle>
          <CardDescription>Instruções enviadas à IA antes de cada alerta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea rows={14} value={form.prompt_template}
            onChange={(e) => setForm({ ...form, prompt_template: e.target.value })} />
          <Button variant="ghost" size="sm" onClick={() => setForm({ ...form, prompt_template: DEFAULT_PROMPT })}>
            Restaurar padrão
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave} disabled={update.isPending}>
          {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar
        </Button>
        <Button variant="outline" onClick={handleTest} disabled={test.isPending}>
          {test.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Testar conexão
        </Button>
        {testResult && (
          <div className={`flex items-center gap-2 text-sm ${testResult.ok ? "text-green-600" : "text-destructive"}`}>
            {testResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {testResult.msg}
          </div>
        )}
      </div>
    </div>
  );
}
