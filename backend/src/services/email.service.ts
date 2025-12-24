import { Resend } from 'resend';

interface AlertEmailData {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  type: string;
  related_entity_type?: string;
  related_entity_id?: string;
}

export class EmailService {
  private resend: Resend | null = null;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  async sendAlertEmail(email: string, alert: AlertEmailData): Promise<boolean> {
    if (!this.resend) {
      console.error('Resend API key not configured');
      return false;
    }

    const severityConfig = {
      info: { icon: 'ℹ️', color: '#3b82f6', label: 'INFORMAÇÃO' },
      warning: { icon: '⚠️', color: '#f59e0b', label: 'AVISO' },
      critical: { icon: '🚨', color: '#ef4444', label: 'CRÍTICO' },
    };

    const config = severityConfig[alert.severity];
    const appUrl = process.env.APP_URL || 'https://app.exemplo.com';

    try {
      const result = await this.resend.emails.send({
        from: process.env.EMAIL_FROM || 'Alertas Sistema <onboarding@resend.dev>',
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

      console.log('Email sent successfully:', result);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  async sendTicketNotification(
    email: string,
    ticketNumber: string,
    title: string,
    action: string,
    details?: string
  ): Promise<boolean> {
    if (!this.resend) {
      console.error('Resend API key not configured');
      return false;
    }

    const appUrl = process.env.APP_URL || 'https://app.exemplo.com';

    try {
      await this.resend.emails.send({
        from: process.env.EMAIL_FROM || 'Sistema de Tickets <onboarding@resend.dev>',
        to: [email],
        subject: `[${ticketNumber}] ${action}: ${title}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
              <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div style="background-color: #3b82f6; color: #ffffff; padding: 20px; text-align: center;">
                  <h1 style="margin: 0; font-size: 20px;">${action}</h1>
                </div>
                <div style="padding: 30px 20px;">
                  <p style="color: #333; font-size: 16px; margin-bottom: 10px;">
                    <strong>Ticket:</strong> ${ticketNumber}
                  </p>
                  <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
                    <strong>Título:</strong> ${title}
                  </p>
                  ${details ? `<p style="color: #666; font-size: 14px;">${details}</p>` : ''}
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${appUrl}/tickets" 
                       style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold;">
                      Ver Ticket
                    </a>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      return true;
    } catch (error) {
      console.error('Error sending ticket notification:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
