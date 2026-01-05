import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Network, Cable, Server, Shield, Map, Camera, Headset } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TypewriterText } from '@/components/animations/TypewriterText';
import { NetworkParticles } from '@/components/animations/NetworkParticles';
import { LandingFooter } from '@/components/layout/LandingFooter';
import { ScrollReveal } from '@/components/animations/ScrollReveal';
import { useParallax } from '@/hooks/useParallax';

const features = [
  {
    icon: Cable,
    title: "Rastreamento Inteligente",
    description: "QR codes em cada cabo para identificação instantânea do Ponto A ao Ponto B"
  },
  {
    icon: Server,
    title: "Inventário Completo",
    description: "Gerencie racks, equipamentos e portas com rastreamento em tempo real"
  },
  {
    icon: Map,
    title: "Plantas Interativas",
    description: "Visualize e posicione equipamentos em plantas baixas com drag-and-drop"
  },
  {
    icon: Network,
    title: "Topologia de Rede",
    description: "Mapa interativo de conexões com detecção de pontos únicos de falha"
  },
  {
    icon: Camera,
    title: "Monitoramento Visual",
    description: "Integração com câmeras IP e NVRs para vigilância da infraestrutura"
  },
  {
    icon: Headset,
    title: "Gestão de Tickets",
    description: "Sistema completo de chamados com métricas SLA e integração WhatsApp"
  }
];

const highlights = [
  "Multi-site",
  "Tempo Real", 
  "IPAM Integrado",
  "Relatórios PDF",
  "Visualização 3D",
  "QR Codes"
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

  const parallaxOffset = useParallax(0.3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden flex flex-col">
      {/* Parallax Background */}
      <div 
        className="parallax-layer"
        style={{ transform: `translateY(${parallaxOffset * 0.5}px)` }}
      >
        <NetworkParticles />
      </div>
      
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 relative z-10 flex-1">
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

        {/* Features Grid with Scroll Reveal */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto mt-16">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <ScrollReveal
                key={feature.title}
                animation="fade-up"
                delay={index * 100}
                duration={600}
                distance={40}
              >
                <div 
                  className={cn(
                    "text-center p-6 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm h-full",
                    "hover:shadow-lg hover:scale-[1.02] hover:border-primary/50 hover:bg-card/80 transition-all cursor-default",
                    "group"
                  )}
                >
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 text-primary mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        {/* Highlights Section with Scroll Reveal */}
        <ScrollReveal animation="fade-up" duration={700} distance={50}>
          <section className="py-16 mt-12 border-t border-border/30">
            <div className="max-w-4xl mx-auto text-center">
              <ScrollReveal animation="zoom-in" delay={100} duration={500}>
                <div className="inline-flex items-center gap-2 mb-4">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-primary uppercase tracking-wider">Plataforma Completa</span>
                </div>
                <h2 className="text-3xl font-bold mb-4">Gêmeo Digital da Sua Infraestrutura</h2>
                <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Solução completa para gestão de datacenter, cabeamento estruturado e 
                  monitoramento de rede em uma única plataforma.
                </p>
              </ScrollReveal>
              <div className="flex flex-wrap justify-center gap-3">
                {highlights.map((item, index) => (
                  <ScrollReveal
                    key={item}
                    animation="fade-up"
                    delay={200 + index * 80}
                    duration={500}
                    distance={20}
                  >
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "px-4 py-2 text-sm",
                        "hover:bg-primary/10 transition-colors cursor-default"
                      )}
                    >
                      {item}
                    </Badge>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>
        </ScrollReveal>
      </div>

      {/* Footer */}
      <LandingFooter className="relative z-10 mt-auto" />
    </div>
  );
};

export default Index;
