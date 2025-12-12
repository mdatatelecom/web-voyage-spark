import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { Button } from '@/components/ui/button';
import { Network, Cable, Server, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TypewriterText } from '@/components/animations/TypewriterText';
import { NetworkParticles } from '@/components/animations/NetworkParticles';

const features = [
  {
    icon: Cable,
    title: "Rastreamento Inteligente",
    description: "QR codes em cada cabo para identificação instantânea do Ponto A ao Ponto B"
  },
  {
    icon: Server,
    title: "Inventário Completo",
    description: "Gerencie racks, equipamentos e portas com rastreamento de disponibilidade em tempo real"
  },
  {
    icon: Shield,
    title: "Acesso Seguro",
    description: "Permissões baseadas em funções e logs de auditoria para segurança completa"
  }
];
const Index = () => {
  const { user, loading } = useAuth();
  const { isViewer, isNetworkViewer, isLoading: roleLoading } = useUserRole();
  const { branding, isLoading: settingsLoading } = useSystemSettings();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading && !roleLoading) {
      if (isViewer || isNetworkViewer) {
        navigate('/scan');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, loading, roleLoading, isViewer, isNetworkViewer, navigate]);

  if (loading || roleLoading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      <NetworkParticles />
      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col items-center justify-center mb-6">
            {branding.logoUrl ? (
              <>
                <img 
                  src={branding.logoUrl} 
                  alt={branding.systemName} 
                  className="h-20 w-auto object-contain"
                />
                <h1 className="text-5xl font-bold text-primary mt-4">{branding.systemName}</h1>
              </>
            ) : (
              <div className="flex items-center">
                <Network className="h-16 w-16 text-primary mr-4" />
                <h1 className="text-6xl font-bold">{branding.systemName}</h1>
              </div>
            )}
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto min-h-[60px]">
            <TypewriterText 
              text="Gêmeo digital da sua infraestrutura de rede física. Rastreie cada cabo, porta e conexão com tecnologia segura de QR code."
              speed={25}
              delay={800}
            />
          </p>
          <div className="mt-8 flex gap-4 justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-both">
            <Button size="lg" onClick={() => navigate('/auth')}>
              Começar
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/auth')}>
              Entrar
            </Button>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto mt-20">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={feature.title}
                className={cn(
                  "text-center p-6 rounded-lg border border-border bg-card",
                  "animate-in fade-in slide-in-from-bottom-6 duration-500 fill-mode-both",
                  "hover:shadow-lg hover:scale-105 hover:border-primary/50 transition-all cursor-default",
                  index === 0 && "delay-300",
                  index === 1 && "delay-500",
                  index === 2 && "delay-700"
                )}
              >
                <Icon className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Index;