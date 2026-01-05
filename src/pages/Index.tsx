import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useLandingScreenshots } from '@/hooks/useLandingScreenshots';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Network, Cable, Server, Shield, Map, Camera, Headset, X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TypewriterText } from '@/components/animations/TypewriterText';
import { NetworkParticles } from '@/components/animations/NetworkParticles';
import { LandingFooter } from '@/components/layout/LandingFooter';
import { ScrollReveal } from '@/components/animations/ScrollReveal';
import { useParallax } from '@/hooks/useParallax';
import Autoplay from "embla-carousel-autoplay";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious,
  CarouselDots
} from "@/components/ui/carousel";

const features = [
  {
    icon: Cable,
    title: "Rastreamento Inteligente",
    description: "Geração automática de QR codes com etiquetas personalizadas. Escaneie e identifique instantaneamente origem, destino, tipo de cabo e histórico de cada conexão"
  },
  {
    icon: Server,
    title: "Inventário Completo",
    description: "Cadastro hierárquico de prédios, salas, racks e equipamentos. Controle de portas, slots e ocupação com alertas de capacidade"
  },
  {
    icon: Map,
    title: "Plantas Interativas",
    description: "Upload de plantas baixas com posicionamento drag-and-drop. Ferramenta de medição, escala configurável e comparação de versões"
  },
  {
    icon: Network,
    title: "Topologia de Rede",
    description: "Visualização em grafo das conexões de rede. Identifique pontos únicos de falha, trace rotas e analise dependências"
  },
  {
    icon: Camera,
    title: "Monitoramento Visual",
    description: "Integração com câmeras IP, NVRs e go2rtc. Streaming HLS/WebRTC, mapa de câmeras e relatórios de canais"
  },
  {
    icon: Headset,
    title: "Gestão de Tickets",
    description: "Abertura de chamados com prioridade e SLA configurável. Notificações automáticas via WhatsApp e métricas de desempenho"
  }
];

const highlights = [
  "Tempo Real", 
  "IPAM Integrado",
  "Relatórios PDF",
  "Visualização 3D",
  "QR Codes",
  "OAM",
  "CFTV",
  "WhatsApp"
];

// Fallback screenshots for when database is empty
const defaultScreenshots = [
  {
    src: "/placeholder.svg",
    title: "Dashboard Principal",
    description: "Visão geral com gráficos de ocupação, conexões e alertas"
  },
  {
    src: "/placeholder.svg",
    title: "Visualização 3D de Racks",
    description: "Explore seus racks em 3D com detalhes de cada equipamento"
  },
  {
    src: "/placeholder.svg",
    title: "Mapa de Topologia",
    description: "Visualize conexões de rede em formato de grafo interativo"
  },
  {
    src: "/placeholder.svg",
    title: "Plantas Interativas",
    description: "Posicione equipamentos em plantas baixas com drag-and-drop"
  },
  {
    src: "/placeholder.svg",
    title: "Gestão de Câmeras",
    description: "Mapa de câmeras com streaming ao vivo integrado"
  }
];

const Index = () => {
  const { user, loading } = useAuth();
  const { isViewer, isNetworkViewer, isLoading: roleLoading } = useUserRole();
  const { branding, isLoading: settingsLoading } = useSystemSettings();
  const { activeScreenshots } = useLandingScreenshots();
  const navigate = useNavigate();
  const parallaxOffset = useParallax(0.3);
  
  // Lightbox state
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  
  // Use active screenshots from database or fallback to defaults
  const screenshots = activeScreenshots.length > 0 
    ? activeScreenshots.map(s => ({ src: s.image_url, title: s.title, description: s.description || '' }))
    : defaultScreenshots;
  
  const autoplayPlugin = useRef(
    Autoplay({ 
      delay: 4000, 
      stopOnInteraction: false,
      stopOnMouseEnter: true
    })
  );

  // Keyboard navigation for lightbox
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (selectedIndex === null) return;
    
    switch (e.key) {
      case 'Escape':
        setSelectedIndex(null);
        break;
      case 'ArrowLeft':
        setSelectedIndex(prev => 
          prev !== null ? (prev - 1 + screenshots.length) % screenshots.length : null
        );
        break;
      case 'ArrowRight':
        setSelectedIndex(prev => 
          prev !== null ? (prev + 1) % screenshots.length : null
        );
        break;
    }
  }, [selectedIndex, screenshots.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (user && !loading && !roleLoading) {
      if (isViewer || isNetworkViewer) {
        navigate('/scan');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, loading, roleLoading, isViewer, isNetworkViewer, navigate]);

  const navigatePrev = () => {
    setSelectedIndex(prev => 
      prev !== null ? (prev - 1 + screenshots.length) % screenshots.length : null
    );
  };

  const navigateNext = () => {
    setSelectedIndex(prev => 
      prev !== null ? (prev + 1) % screenshots.length : null
    );
  };

  if (loading || roleLoading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
              text="Mapa Digital da Infraestrutura de Rede Física e CFTV. Rastreamento completo de cabos, portas, conexões e pontos de CFTV com identificação segura via QR Code."
              speed={25}
              delay={800}
            />
          </p>
          <div className="mt-8 flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-both">
            <Button size="lg" onClick={() => navigate('/auth')}>
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
      </div>

      {/* Screenshots Preview Section - Full Width with Gradient Background */}
      <div className="relative w-full overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
        
        {/* Decorative blurred elements with inverse parallax */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute -top-20 left-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl"
            style={{ transform: `translateY(${-parallaxOffset * 0.4}px)` }}
          />
          <div 
            className="absolute -bottom-20 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl"
            style={{ transform: `translateY(${parallaxOffset * 0.3}px)` }}
          />
        </div>
        
        <ScrollReveal animation="fade-up" duration={700} distance={50}>
          <section className="py-16 border-t border-border/30 w-full relative z-10">
            <div className="text-center px-4 sm:px-8 mb-10">
              <h2 className="text-3xl font-bold mb-4">Conheça a Plataforma</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Interface moderna e intuitiva para gestão completa da sua infraestrutura
              </p>
            </div>
            
            <Carousel 
              className="w-full px-4 sm:px-8 lg:px-16"
              style={{ transform: `translateY(${parallaxOffset * 0.2}px)` }}
              plugins={[autoplayPlugin.current]}
              opts={{
                loop: true,
                align: "center"
              }}
            >
            <CarouselContent className="-ml-4">
              {screenshots.map((screenshot, index) => (
                <CarouselItem key={index} className="pl-4 md:basis-4/5 lg:basis-3/4">
                  <div className="p-2">
                    <div 
                      className="relative rounded-xl overflow-hidden border border-border/50 shadow-2xl bg-card/50 backdrop-blur-sm group cursor-pointer"
                      onClick={() => setSelectedIndex(index)}
                    >
                      <img 
                        src={screenshot.src}
                        alt={screenshot.title}
                        loading="lazy"
                        className="w-full h-auto aspect-video object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                      {/* Zoom indicator on hover */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Maximize2 className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                        <h3 className="text-white font-semibold text-lg">{screenshot.title}</h3>
                        <p className="text-white/80 text-sm">{screenshot.description}</p>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2 sm:left-6 lg:left-12" />
            <CarouselNext className="right-2 sm:right-6 lg:right-12" />
            <CarouselDots />
          </Carousel>
          </section>
        </ScrollReveal>
      </div>

      {/* Highlights Section - Back to container */}
      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal animation="fade-up" duration={700} distance={50}>
          <section className="py-16 border-t border-border/30">
            <div className="max-w-4xl mx-auto text-center">
              <ScrollReveal animation="zoom-in" delay={100} duration={500}>
                <div className="inline-flex items-center gap-2 mb-4">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-primary uppercase tracking-wider">Plataforma Completa</span>
                </div>
                <h2 className="text-3xl font-bold mb-4">Mapa Operacional da Infraestrutura</h2>
                <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Solução completa para gestão de datacenter, cabeamento estruturado, OAM, 
                  controle de IPs e monitoramento de rede e CFTV em uma única plataforma.
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

      {/* Lightbox Modal */}
      <Dialog open={selectedIndex !== null} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-black/95">
          {/* Close button */}
          <button
            onClick={() => setSelectedIndex(null)}
            className="absolute top-4 right-4 z-50 text-white/70 hover:text-white transition-colors p-2"
          >
            <X className="h-8 w-8" />
          </button>

          {/* Position indicator */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm z-50">
            {selectedIndex !== null && `${selectedIndex + 1} / ${screenshots.length}`}
          </div>

          {/* Navigation buttons */}
          <button
            onClick={navigatePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white/70 hover:text-white transition-colors p-2 bg-black/30 rounded-full"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button
            onClick={navigateNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white/70 hover:text-white transition-colors p-2 bg-black/30 rounded-full"
          >
            <ChevronRight className="h-8 w-8" />
          </button>

          {selectedIndex !== null && screenshots[selectedIndex] && (
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <img
                src={screenshots[selectedIndex].src}
                alt={screenshots[selectedIndex].title}
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
              />
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center bg-black/50 px-6 py-3 rounded-lg">
                <h3 className="text-white font-semibold text-xl mb-1">
                  {screenshots[selectedIndex].title}
                </h3>
                <p className="text-white/70 text-sm">
                  {screenshots[selectedIndex].description}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
