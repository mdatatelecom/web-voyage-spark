import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Bell, Mail, Save } from 'lucide-react';

export default function NotificationSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [alertCritical, setAlertCritical] = useState(true);
  const [alertWarning, setAlertWarning] = useState(true);
  const [alertInfo, setAlertInfo] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');

  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['notification-settings', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    },
    enabled: !!user,
  });

  // Update local state when settings load
  useEffect(() => {
    if (settings) {
      setEmailEnabled(settings.email_enabled);
      setAlertCritical(settings.alert_critical);
      setAlertWarning(settings.alert_warning);
      setAlertInfo(settings.alert_info);
      setEmailAddress(settings.email_address || '');
    }
  }, [settings]);

  // Save settings mutation
  const { mutate: saveSettings, isPending } = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const settingsData = {
        user_id: user.id,
        email_enabled: emailEnabled,
        alert_critical: alertCritical,
        alert_warning: alertWarning,
        alert_info: alertInfo,
        email_address: emailAddress || null,
        updated_at: new Date().toISOString(),
      };

      if (settings) {
        // Update existing
        const { error } = await supabase
          .from('notification_settings')
          .update(settingsData)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('notification_settings')
          .insert(settingsData);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Configurações salvas com sucesso');
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar configurações', {
        description: error.message,
      });
    },
  });

  // Send test email mutation
  const { mutate: sendTestEmail, isPending: isSendingTest } = useMutation({
    mutationFn: async () => {
      const targetEmail = emailAddress || user?.email;
      if (!targetEmail) throw new Error('Email não configurado');

      const { error } = await supabase.functions.invoke('send-alert-email', {
        body: {
          email: targetEmail,
          alert: {
            title: 'Teste de Notificação',
            message: 'Este é um email de teste do sistema de alertas',
            severity: 'info',
            type: 'test',
          },
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Email de teste enviado');
    },
    onError: (error: any) => {
      toast.error('Erro ao enviar email de teste', {
        description: error.message,
      });
    },
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="text-center py-12">Carregando...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold">Preferências de Notificação</h1>
          <p className="text-muted-foreground">
            Configure como deseja receber notificações de alertas
          </p>
        </div>

        <Card className="p-6 space-y-6">
          {/* Email Notifications */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-enabled" className="text-base flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Notificações por Email
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receber alertas importantes por email
                </p>
              </div>
              <Switch
                id="email-enabled"
                checked={emailEnabled}
                onCheckedChange={setEmailEnabled}
              />
            </div>

            {emailEnabled && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="email-address">Email Alternativo (opcional)</Label>
                <Input
                  id="email-address"
                  type="email"
                  placeholder={user?.email || 'email@exemplo.com'}
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Se vazio, será usado o email da sua conta
                </p>
              </div>
            )}
          </div>

          {/* Alert Severity Settings */}
          {emailEnabled && (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <Label className="text-base flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Tipos de Alertas
                </Label>
                <p className="text-sm text-muted-foreground">
                  Escolha quais severidades de alertas deseja receber
                </p>
              </div>

              <div className="space-y-3 pl-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="alert-critical" className="font-normal">
                      Alertas Críticos
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Problemas graves que requerem ação imediata
                    </p>
                  </div>
                  <Switch
                    id="alert-critical"
                    checked={alertCritical}
                    onCheckedChange={setAlertCritical}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="alert-warning" className="font-normal">
                      Alertas de Aviso
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Situações que precisam de atenção
                    </p>
                  </div>
                  <Switch
                    id="alert-warning"
                    checked={alertWarning}
                    onCheckedChange={setAlertWarning}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="alert-info" className="font-normal">
                      Alertas Informativos
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Informações gerais do sistema
                    </p>
                  </div>
                  <Switch
                    id="alert-info"
                    checked={alertInfo}
                    onCheckedChange={setAlertInfo}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={() => saveSettings()} disabled={isPending}>
              <Save className="w-4 h-4 mr-2" />
              {isPending ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
            {emailEnabled && (
              <Button
                variant="outline"
                onClick={() => sendTestEmail()}
                disabled={isSendingTest}
              >
                <Mail className="w-4 h-4 mr-2" />
                {isSendingTest ? 'Enviando...' : 'Enviar Email de Teste'}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
