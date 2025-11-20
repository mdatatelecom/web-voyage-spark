import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Network, Cable, Server, Shield } from 'lucide-react';
const Index = () => {
  const {
    user,
    loading
  } = useAuth();
  const { isViewer, isNetworkViewer, isLoading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  useEffect(() => {
    if (user && !loading && !roleLoading) {
      // Viewers vão direto para o scanner
      if (isViewer || isNetworkViewer) {
        navigate('/scan');
      } else {
        // Admin/Technician vão para dashboard
        navigate('/dashboard');
      }
    }
  }, [user, loading, roleLoading, isViewer, isNetworkViewer, navigate]);
  if (loading || roleLoading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <Network className="h-16 w-16 text-primary mr-4" />
            <h1 className="text-6xl font-bold">InfraConnexus</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Gêmeo digital da sua infraestrutura de rede física. 
            Rastreie cada cabo, porta e conexão com tecnologia segura de QR code.
          </p>
          <div className="mt-8 flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth')}>
              Começar
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/auth')}>
              Entrar
            </Button>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto mt-20">
          <div className="text-center p-6 rounded-lg border border-border bg-card">
            <Cable className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Rastreamento Inteligente</h3>
            <p className="text-muted-foreground">
              QR codes em cada cabo para identificação instantânea do Ponto A ao Ponto B
            </p>
          </div>

          <div className="text-center p-6 rounded-lg border border-border bg-card">
            <Server className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Inventário Completo</h3>
            <p className="text-muted-foreground">
              Gerencie racks, equipamentos e portas com rastreamento de disponibilidade em tempo real
            </p>
          </div>

          <div className="text-center p-6 rounded-lg border border-border bg-card">
            <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Acesso Seguro</h3>
            <p className="text-muted-foreground">
              Permissões baseadas em funções e logs de auditoria para segurança completa
            </p>
          </div>
        </div>
      </div>
    </div>;
};
export default Index;