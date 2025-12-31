import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Network, Mail, Lock } from 'lucide-react';
import { NetworkParticles } from '@/components/animations/NetworkParticles';
import { InfrastructureIllustration } from '@/components/login/InfrastructureIllustration';

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, user } = useAuth();
  const { isViewer, isNetworkViewer, isLoading: roleLoading } = useUserRole();
  const { branding, isLoading: settingsLoading } = useSystemSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && !roleLoading) {
      if (isViewer || isNetworkViewer) {
        navigate('/scan');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, roleLoading, isViewer, isNetworkViewer, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast.error('Erro ao fazer login: ' + error.message);
    } else {
      toast.success('Login realizado com sucesso!');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Side - Illustration (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary/10 via-primary/5 to-background overflow-hidden">
        {/* Network Particles Background */}
        <div className="absolute inset-0">
          <NetworkParticles />
        </div>
        
        {/* Infrastructure Illustration */}
        <InfrastructureIllustration />
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Title */}
          <div className="flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            {settingsLoading ? (
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            ) : (
              <>
                {branding.logoUrl ? (
                  <>
                    <img 
                      src={branding.logoUrl} 
                      alt={branding.systemName} 
                      className="h-16 w-auto object-contain"
                    />
                    <h1 className="text-xl font-semibold text-foreground mt-4">{branding.systemName}</h1>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Network className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mt-4">{branding.systemName}</h1>
                  </>
                )}
              </>
            )}
          </div>
          
          {/* Login Card */}
          <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both border-border/50 shadow-lg">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl">Bem-vindo de volta</CardTitle>
              <CardDescription>
                Entre com suas credenciais para acessar o sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    E-mail
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="voce@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-11 font-medium" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground animate-in fade-in duration-500 delay-300 fill-mode-both">
            Sistema de Gerenciamento de Infraestrutura
          </p>
        </div>
      </div>
    </div>
  );
}
