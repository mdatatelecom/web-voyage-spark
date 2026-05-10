import { useParams, Link } from "react-router-dom";
import { useAIAnalysis } from "@/hooks/useAIAnalyses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, MessageCircle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const copy = (text: string, label = "Copiado") => {
  navigator.clipboard.writeText(text);
  toast({ title: label });
};

export default function AIAnalysisDetails() {
  const { id } = useParams();
  const { data: a, isLoading } = useAIAnalysis(id);

  if (isLoading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!a) return <div className="p-6">Análise não encontrada.</div>;

  const sendWhats = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(a.whatsapp_message ?? "")}`;
    window.open(url, "_blank");
  };

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-4">
      <Link to="/ai-analyses" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle>{a.trigger_name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Host: {a.host}</p>
            </div>
            <div className="flex gap-2">
              {a.severity && <Badge variant="outline">{a.severity}</Badge>}
              {a.priority && <Badge>{a.priority}</Badge>}
              {a.category && <Badge variant="secondary">{a.category}</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Section title="Resumo">{a.summary}</Section>
          <Section title="Tradução do alerta">{a.translation}</Section>

          <ListBlock title="Possíveis causas" items={a.causes} />

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Comandos de diagnóstico</h3>
              <Button size="sm" variant="ghost" onClick={() => copy((a.commands ?? []).join("\n"), "Comandos copiados")}>
                <Copy className="h-3 w-3" /> Copiar todos
              </Button>
            </div>
            <pre className="bg-muted text-sm rounded p-3 overflow-x-auto">
              {(a.commands ?? []).join("\n")}
            </pre>
          </div>

          <ListBlock title="Checklist de verificação" items={a.checklist} ordered />
          <ListBlock title="Ações recomendadas" items={a.recommendations} />

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Mensagem para WhatsApp</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => copy(a.whatsapp_message ?? "")}>
                  <Copy className="h-3 w-3" /> Copiar
                </Button>
                <Button size="sm" onClick={sendWhats}>
                  <MessageCircle className="h-3 w-3" /> Enviar
                </Button>
              </div>
            </div>
            <pre className="bg-green-500/5 border border-green-500/20 text-sm rounded p-3 whitespace-pre-wrap">
              {a.whatsapp_message}
            </pre>
          </div>

          <p className="text-xs text-muted-foreground">
            Modelo: {a.model_used} · Tokens: {a.tokens_used ?? "—"} · {new Date(a.created_at).toLocaleString("pt-BR")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{children}</p>
    </div>
  );
}

function ListBlock({ title, items, ordered }: { title: string; items: string[] | null; ordered?: boolean }) {
  if (!items?.length) return null;
  const Tag = ordered ? "ol" : "ul";
  return (
    <div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <Tag className={`text-sm space-y-1 ${ordered ? "list-decimal" : "list-disc"} pl-5`}>
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </Tag>
    </div>
  );
}
