import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@datacenter.local';

let resend: Resend | null = null;

if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('Email service not configured (missing RESEND_API_KEY)');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Templates de email
export const emailTemplates = {
  alertNotification: (alert: { title: string; message: string; severity: string }) => ({
    subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${alert.severity === 'critical' ? '#dc2626' : alert.severity === 'warning' ? '#f59e0b' : '#3b82f6'}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Alerta do Sistema</h1>
        </div>
        <div style="padding: 20px; background: #f9fafb;">
          <h2 style="color: #111827; margin-top: 0;">${alert.title}</h2>
          <p style="color: #4b5563;">${alert.message}</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
            Este é um email automático do Sistema de Gestão de Datacenter.
          </p>
        </div>
      </div>
    `,
  }),

  ticketCreated: (ticket: { number: string; title: string; description: string }) => ({
    subject: `[${ticket.number}] Novo Chamado: ${ticket.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #3b82f6; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Novo Chamado Criado</h1>
        </div>
        <div style="padding: 20px; background: #f9fafb;">
          <p><strong>Número:</strong> ${ticket.number}</p>
          <p><strong>Título:</strong> ${ticket.title}</p>
          <p><strong>Descrição:</strong></p>
          <p style="background: white; padding: 15px; border-radius: 5px;">${ticket.description}</p>
        </div>
      </div>
    `,
  }),

  ticketUpdated: (ticket: { number: string; title: string; status: string; updatedBy: string }) => ({
    subject: `[${ticket.number}] Chamado Atualizado: ${ticket.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #10b981; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Chamado Atualizado</h1>
        </div>
        <div style="padding: 20px; background: #f9fafb;">
          <p><strong>Número:</strong> ${ticket.number}</p>
          <p><strong>Título:</strong> ${ticket.title}</p>
          <p><strong>Novo Status:</strong> ${ticket.status}</p>
          <p><strong>Atualizado por:</strong> ${ticket.updatedBy}</p>
        </div>
      </div>
    `,
  }),
};

export default { sendEmail, emailTemplates };
