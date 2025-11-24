import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertEmailRequest {
  email: string;
  alert: {
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
    type: string;
    related_entity_type?: string;
    related_entity_id?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, alert }: AlertEmailRequest = await req.json();

    console.log("Sending alert email to:", email);
    console.log("Alert details:", alert);

    // Determine icon and color based on severity
    const severityConfig = {
      info: { icon: 'ℹ️', color: '#3b82f6', label: 'INFORMAÇÃO' },
      warning: { icon: '⚠️', color: '#f59e0b', label: 'AVISO' },
      critical: { icon: '🚨', color: '#ef4444', label: 'CRÍTICO' },
    };

    const config = severityConfig[alert.severity];
    const appUrl = Deno.env.get('VITE_SUPABASE_URL')?.replace('/supabase.co', '.lovable.app') || 'https://app.exemplo.com';

    const emailResponse = await resend.emails.send({
      from: "Alertas Sistema <onboarding@resend.dev>",
      to: [email],
      subject: `${config.icon} [${config.label}] ${alert.title}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${alert.title}</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <div style="background-color: ${config.color}; color: #ffffff; padding: 30px 20px; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 10px;">${config.icon}</div>
                <div style="font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
                  ${config.label}
                </div>
              </div>

              <!-- Content -->
              <div style="padding: 30px 20px;">
                <h2 style="color: #333; margin-top: 0; margin-bottom: 15px; font-size: 24px;">
                  ${alert.title}
                </h2>
                
                <p style="color: #666; line-height: 1.6; margin-bottom: 20px; font-size: 16px;">
                  ${alert.message}
                </p>

                ${alert.related_entity_type ? `
                  <div style="background-color: #f9f9f9; border-left: 4px solid ${config.color}; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                    <div style="font-size: 14px; color: #666; margin-bottom: 5px;">
                      <strong>Tipo:</strong> ${alert.related_entity_type}
                    </div>
                    <div style="font-size: 14px; color: #666;">
                      <strong>Categoria:</strong> ${alert.type}
                    </div>
                  </div>
                ` : ''}

                <!-- Action Button -->
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${appUrl}/alerts" 
                     style="display: inline-block; background-color: ${config.color}; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                    Ver Alerta no Sistema
                  </a>
                </div>

                <p style="color: #999; font-size: 14px; line-height: 1.5; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
                  Esta é uma notificação automática do sistema de gerenciamento de infraestrutura.<br>
                  Você está recebendo este email porque está configurado para receber alertas de ${alert.severity}.
                </p>
              </div>

              <!-- Footer -->
              <div style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #e5e5e5;">
                <p style="margin: 0; color: #666; font-size: 12px;">
                  © ${new Date().getFullYear()} Sistema de Gerenciamento. Todos os direitos reservados.
                </p>
                <p style="margin: 10px 0 0 0; color: #999; font-size: 12px;">
                  <a href="${appUrl}/settings/notifications" style="color: #666; text-decoration: none;">
                    Gerenciar preferências de notificação
                  </a>
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-alert-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
