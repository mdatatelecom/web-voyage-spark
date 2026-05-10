import { useState } from "react";
import { Link } from "react-router-dom";
import { useAIAnalyses } from "@/hooks/useAIAnalyses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Server, Network, Wifi, Camera, Database, Box, MonitorSmartphone, HelpCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const CATEGORY_ICONS: Record<string, any> = {
  linux: Server, rede: Network, mikrotik: Wifi, camera: Camera,
  banco_dados: Database, docker: Box, vmware: Box, windows: MonitorSmartphone, outro: HelpCircle,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  info: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
};

const PRIORITY_COLORS: Record<string, string> = {
  critica: "bg-red-500 text-white",
  alta: "bg-orange-500 text-white",
  media: "bg-yellow-500 text-black",
  baixa: "bg-green-500 text-white",
};

export default function AIAnalyses() {
  const [host, setHost] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [severity, setSeverity] = useState<string>("all");
  const { data, isLoading } = useAIAnalyses({
    host: host || undefined,
    category: category === "all" ? undefined : category,
    severity: severity === "all" ? undefined : severity,
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Análises IA — Alertas Zabbix</h1>
          <p className="text-muted-foreground text-sm">Diagnósticos automáticos com Gemini</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input placeholder="Filtrar por host..." value={host} onChange={(e) => setHost(e.target.value)} />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {Object.keys(CATEGORY_ICONS).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger><SelectValue placeholder="Severidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas severidades</SelectItem>
              <SelectItem value="critical">Crítico</SelectItem>
              <SelectItem value="warning">Aviso</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}
      {!isLoading && data?.length === 0 && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          Nenhuma análise gerada ainda.
        </CardContent></Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {data?.map((a) => {
          const Icon = CATEGORY_ICONS[a.category ?? "outro"] ?? HelpCircle;
          return (
            <Link key={a.id} to={`/ai-analyses/${a.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="h-5 w-5 text-primary shrink-0" />
                      <CardTitle className="text-base truncate">{a.host || "—"}</CardTitle>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {a.severity && (
                        <Badge variant="outline" className={SEVERITY_COLORS[a.severity] ?? ""}>
                          {a.severity}
                        </Badge>
                      )}
                      {a.priority && (
                        <Badge className={PRIORITY_COLORS[a.priority] ?? ""}>{a.priority}</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm font-medium line-clamp-1">{a.trigger_name}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{a.summary}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(a.created_at), { locale: ptBR, addSuffix: true })}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
