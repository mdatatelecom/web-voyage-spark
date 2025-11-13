import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Network, Cable, Server, Shield } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <Network className="h-16 w-16 text-primary mr-4" />
            <h1 className="text-6xl font-bold">InfraTrack</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Digital twin of your physical network infrastructure. 
            Track every cable, port, and connection with secure QR code technology.
          </p>
          <div className="mt-8 flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth')}>
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto mt-20">
          <div className="text-center p-6 rounded-lg border border-border bg-card">
            <Cable className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Smart Tracking</h3>
            <p className="text-muted-foreground">
              QR codes on every cable for instant identification from Point A to Point B
            </p>
          </div>

          <div className="text-center p-6 rounded-lg border border-border bg-card">
            <Server className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Complete Inventory</h3>
            <p className="text-muted-foreground">
              Manage racks, equipment, and ports with real-time availability tracking
            </p>
          </div>

          <div className="text-center p-6 rounded-lg border border-border bg-card">
            <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Secure Access</h3>
            <p className="text-muted-foreground">
              Role-based permissions and audit logs for complete security
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
