import { pool } from '../config/database';

export interface WhatsAppSettings {
  evolutionApiUrl: string;
  evolutionApiKey: string;
  evolutionInstance: string;
  isEnabled: boolean;
  defaultCountryCode: string;
}

export interface WhatsAppInstance {
  name: string;
  displayName: string;
  state: string;
  rawState: string;
  disconnectionReasonCode: number;
  profileName: string | null;
  profilePictureUrl: string | null;
}

export interface WhatsAppGroup {
  id: string;
  subject: string;
  size: number;
  creation: number;
  owner: string;
  desc: string;
}

// Helper function to format phone number with country code
export function formatPhoneNumber(phone: string, defaultCountryCode: string = '55'): string {
  let cleanedCountryCode = defaultCountryCode.replace(/\D/g, '');
  
  if (cleanedCountryCode.length > 3) {
    if (cleanedCountryCode.startsWith('55')) {
      cleanedCountryCode = '55';
    } else if (cleanedCountryCode.startsWith('1')) {
      cleanedCountryCode = '1';
    } else {
      cleanedCountryCode = cleanedCountryCode.slice(0, 2);
    }
    console.warn(`Country code was too long, cleaned to: ${cleanedCountryCode}`);
  }
  
  cleanedCountryCode = cleanedCountryCode || '55';
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length > 15) {
    console.warn(`Phone number too long (${cleaned.length} digits), truncating: ${cleaned}`);
    cleaned = cleaned.slice(0, 15);
  }
  
  if (cleaned.length < 8) {
    console.warn(`Phone number too short (${cleaned.length} digits): ${cleaned}`);
  }
  
  if (!cleaned.startsWith(cleanedCountryCode)) {
    cleaned = cleanedCountryCode + cleaned;
  }
  
  if (cleaned.length > 15) {
    cleaned = cleaned.slice(0, 15);
  }
  
  console.log(`formatPhoneNumber: input="${phone}", countryCode="${defaultCountryCode}" -> result="${cleaned}"`);
  
  return cleaned;
}

export class WhatsAppService {
  private settings: WhatsAppSettings | null = null;

  async getSettings(): Promise<WhatsAppSettings | null> {
    if (this.settings) return this.settings;

    const result = await pool.query(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'whatsapp_settings'`
    );

    if (result.rows.length > 0) {
      this.settings = result.rows[0].setting_value as WhatsAppSettings;
    }

    return this.settings;
  }

  private getApiUrl(settings: WhatsAppSettings): string {
    return settings.evolutionApiUrl.replace(/\/$/, '');
  }

  // List all instances
  async listInstances(): Promise<{ success: boolean; instances?: WhatsAppInstance[]; message?: string }> {
    const settings = await this.getSettings();
    if (!settings?.evolutionApiUrl || !settings?.evolutionApiKey) {
      return { success: false, message: 'Configurações incompletas' };
    }

    const apiUrl = this.getApiUrl(settings);

    try {
      const response = await fetch(`${apiUrl}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'apikey': settings.evolutionApiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, message: `Erro ao listar instâncias: ${response.status}`, instances: [] };
      }

      const instances = await response.json();
      
      const instanceList: WhatsAppInstance[] = Array.isArray(instances) 
        ? instances.map((inst: any) => ({
            name: inst.instance?.instanceName || inst.instanceName || inst.name,
            displayName: inst.instance?.instanceName || inst.instanceName || inst.name,
            state: inst.connectionStatus || inst.instance?.state || inst.state || 'unknown',
            rawState: inst.connectionStatus || inst.instance?.state || inst.state || 'unknown',
            disconnectionReasonCode: inst.instance?.disconnectionReasonCode ?? inst.disconnectionReasonCode ?? 0,
            profileName: inst.instance?.profileName || inst.profileName || null,
            profilePictureUrl: inst.profilePicUrl || inst.instance?.profilePictureUrl || null
          }))
        : [];

      return { success: true, instances: instanceList };
    } catch (error) {
      console.error('List instances error:', error);
      return { success: false, message: 'Erro de conexão', instances: [] };
    }
  }

  // Create new instance
  async createInstance(instanceName: string): Promise<{ success: boolean; message: string; qrcode?: string; instance?: any }> {
    const settings = await this.getSettings();
    if (!settings?.evolutionApiUrl || !settings?.evolutionApiKey) {
      return { success: false, message: 'Configurações incompletas' };
    }

    const apiUrl = this.getApiUrl(settings);

    try {
      const response = await fetch(`${apiUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'apikey': settings.evolutionApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
          rejectCall: false,
          groupsIgnore: false,
          alwaysOnline: false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMsg = `Erro ${response.status}`;
        if (data?.response?.message) {
          errorMsg = Array.isArray(data.response.message) 
            ? data.response.message.join(', ') 
            : String(data.response.message);
        } else if (data?.message) {
          errorMsg = String(data.message);
        }
        return { success: false, message: errorMsg };
      }

      const qrcode = data?.qrcode?.base64 || data?.qrcode?.pairingCode || data?.qrcode || null;

      return { 
        success: true, 
        message: 'Instância criada com sucesso',
        instance: data.instance,
        qrcode
      };
    } catch (error) {
      console.error('Create instance error:', error);
      return { success: false, message: 'Erro de conexão' };
    }
  }

  // Delete instance
  async deleteInstance(instanceName: string): Promise<{ success: boolean; message: string }> {
    const settings = await this.getSettings();
    if (!settings?.evolutionApiUrl || !settings?.evolutionApiKey) {
      return { success: false, message: 'Configurações incompletas' };
    }

    const apiUrl = this.getApiUrl(settings);

    try {
      const response = await fetch(`${apiUrl}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: {
          'apikey': settings.evolutionApiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData?.response?.message?.[0] || errorData?.message || `Erro ${response.status}`;
        return { success: false, message: errorMsg };
      }

      return { success: true, message: 'Instância excluída com sucesso' };
    } catch (error) {
      console.error('Delete instance error:', error);
      return { success: false, message: 'Erro de conexão' };
    }
  }

  // Logout instance (disconnect WhatsApp)
  async logoutInstance(instanceName: string): Promise<{ success: boolean; message: string }> {
    const settings = await this.getSettings();
    if (!settings?.evolutionApiUrl || !settings?.evolutionApiKey) {
      return { success: false, message: 'Configurações incompletas' };
    }

    const apiUrl = this.getApiUrl(settings);

    try {
      const response = await fetch(`${apiUrl}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: {
          'apikey': settings.evolutionApiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData?.response?.message?.[0] || errorData?.message || `Erro ${response.status}`;
        return { success: false, message: errorMsg };
      }

      return { success: true, message: 'WhatsApp desconectado com sucesso' };
    } catch (error) {
      console.error('Logout instance error:', error);
      return { success: false, message: 'Erro de conexão' };
    }
  }

  // Connect instance (get QR code)
  async connectInstance(instanceName: string): Promise<{ success: boolean; message: string; qrcode?: string; pairingCode?: string }> {
    const settings = await this.getSettings();
    if (!settings?.evolutionApiUrl || !settings?.evolutionApiKey) {
      return { success: false, message: 'Configurações incompletas' };
    }

    const apiUrl = this.getApiUrl(settings);

    try {
      const response = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: {
          'apikey': settings.evolutionApiKey,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMsg = `Erro ${response.status}`;
        if (data?.response?.message) {
          errorMsg = Array.isArray(data.response.message) 
            ? data.response.message.join(', ') 
            : String(data.response.message);
        } else if (data?.message) {
          errorMsg = String(data.message);
        }
        return { success: false, message: errorMsg };
      }

      const qrcode = data?.base64 || data?.code || data?.qrcode?.base64 || data?.qrcode || null;
      const pairingCode = data?.pairingCode || null;

      return { 
        success: true, 
        message: 'QR Code gerado com sucesso',
        qrcode,
        pairingCode
      };
    } catch (error) {
      console.error('Connect instance error:', error);
      return { success: false, message: 'Erro de conexão' };
    }
  }

  // Configure webhook
  async configureWebhook(instanceName: string, webhookUrl: string): Promise<{ success: boolean; message: string; webhookUrl?: string }> {
    const settings = await this.getSettings();
    if (!settings?.evolutionApiUrl || !settings?.evolutionApiKey) {
      return { success: false, message: 'Configurações incompletas' };
    }

    const apiUrl = this.getApiUrl(settings);

    try {
      const response = await fetch(`${apiUrl}/webhook/set/${instanceName}`, {
        method: 'POST',
        headers: {
          'apikey': settings.evolutionApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhook: {
            url: webhookUrl,
            enabled: true,
            webhookByEvents: false,
            events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE"]
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMsg = `Erro ${response.status}`;
        if (data?.response?.message) {
          errorMsg = Array.isArray(data.response.message) 
            ? data.response.message.join(', ') 
            : String(data.response.message);
        } else if (data?.message) {
          errorMsg = String(data.message);
        }
        return { success: false, message: errorMsg };
      }

      return { 
        success: true, 
        message: 'Webhook configurado com sucesso!',
        webhookUrl
      };
    } catch (error) {
      console.error('Configure webhook error:', error);
      return { success: false, message: 'Erro de conexão' };
    }
  }

  // Test connection
  async testConnection(): Promise<{ success: boolean; message: string; needsReconnect?: boolean; state?: string }> {
    const settings = await this.getSettings();
    if (!settings?.evolutionApiUrl || !settings?.evolutionApiKey || !settings?.evolutionInstance) {
      return { success: false, message: 'Configurações incompletas' };
    }

    const apiUrl = this.getApiUrl(settings);

    try {
      const response = await fetch(`${apiUrl}/instance/connectionState/${settings.evolutionInstance}`, {
        method: 'GET',
        headers: {
          'apikey': settings.evolutionApiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, message: `Erro da API: ${response.status}`, needsReconnect: false };
      }

      const data = await response.json();
      const state = data?.instance?.state || data?.state || 'unknown';
      const disconnectionReasonCode = data?.instance?.disconnectionReasonCode ?? data?.disconnectionReasonCode ?? 0;
      
      const isReallyConnected = (state === 'open' || state === 'connected');
      
      if (isReallyConnected) {
        return { 
          success: true, 
          message: `WhatsApp conectado (${settings.evolutionInstance})`,
          needsReconnect: false,
          state
        };
      } else {
        let reasonMessage = `Estado: ${state}`;
        
        if (disconnectionReasonCode === 401) {
          reasonMessage = 'Dispositivo removido do WhatsApp. Reconexão necessária.';
        } else if (disconnectionReasonCode === 408) {
          reasonMessage = 'Conexão expirou. Reconexão necessária.';
        } else if (disconnectionReasonCode === 411) {
          reasonMessage = 'Sessão encerrada pelo usuário. Reconexão necessária.';
        } else if (disconnectionReasonCode === 428) {
          reasonMessage = 'Conexão fechada. Reconexão necessária.';
        } else if (disconnectionReasonCode === 440) {
          reasonMessage = 'Conta deslogada em outro dispositivo. Reconexão necessária.';
        } else if (disconnectionReasonCode === 515) {
          reasonMessage = 'Reinicialização necessária. Reconexão necessária.';
        } else if (disconnectionReasonCode !== 0) {
          reasonMessage = `Desconectado (código ${disconnectionReasonCode}). Reconexão necessária.`;
        } else if (state === 'close') {
          reasonMessage = 'WhatsApp desconectado. Reconexão necessária.';
        }
        
        return { 
          success: false, 
          message: reasonMessage,
          needsReconnect: true,
          state
        };
      }
    } catch (error) {
      console.error('Test connection error:', error);
      return { success: false, message: 'Erro de conexão', needsReconnect: false };
    }
  }

  // Send message to phone number
  async sendMessage(phone: string, message: string, ticketId?: string): Promise<{ success: boolean; message: string; data?: any }> {
    const settings = await this.getSettings();
    if (!settings?.evolutionApiUrl || !settings?.evolutionApiKey || !settings?.evolutionInstance) {
      return { success: false, message: 'Configurações incompletas' };
    }

    const apiUrl = this.getApiUrl(settings);
    const formattedPhone = formatPhoneNumber(phone, settings.defaultCountryCode || '55');

    try {
      const response = await fetch(`${apiUrl}/message/sendText/${settings.evolutionInstance}`, {
        method: 'POST',
        headers: {
          'apikey': settings.evolutionApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: formattedPhone,
          text: message,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorMsg = `Erro ${response.status}`;
        
        if (response.status === 401) {
          errorMsg = 'Erro de autenticação (401)';
        } else if (errorData?.response?.message) {
          const messages = errorData.response.message;
          if (Array.isArray(messages)) {
            const notExistsEntry = messages.find((m: any) => m.exists === false);
            if (notExistsEntry) {
              errorMsg = `O número ${notExistsEntry.number || formattedPhone} não está registrado no WhatsApp`;
            } else {
              errorMsg = messages.map((m: any) => m.message || JSON.stringify(m)).join(', ');
            }
          } else {
            errorMsg = String(messages);
          }
        }

        // Log failed message
        await this.logNotification(ticketId || null, formattedPhone, message, 'notification', 'error', errorMsg);
        
        return { success: false, message: errorMsg };
      }

      const data = await response.json();
      
      // Log successful message
      await this.logNotification(ticketId || null, formattedPhone, message, 'notification', 'sent', null, data?.key?.id);

      return { success: true, message: 'Mensagem enviada com sucesso', data };
    } catch (error) {
      console.error('Send message error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      await this.logNotification(ticketId || null, formattedPhone, message, 'notification', 'error', errorMessage);
      return { success: false, message: errorMessage };
    }
  }

  // Send message to group
  async sendToGroup(groupId: string, message: string, ticketId?: string): Promise<{ success: boolean; message: string; data?: any }> {
    const settings = await this.getSettings();
    if (!settings?.evolutionApiUrl || !settings?.evolutionApiKey || !settings?.evolutionInstance) {
      return { success: false, message: 'Configurações incompletas' };
    }

    const apiUrl = this.getApiUrl(settings);

    try {
      const response = await fetch(`${apiUrl}/message/sendText/${settings.evolutionInstance}`, {
        method: 'POST',
        headers: {
          'apikey': settings.evolutionApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: groupId,
          text: message,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorMsg = `Erro ao enviar para grupo: ${response.status}`;
        
        if (response.status === 401) {
          errorMsg = 'Erro de autenticação (401)';
        } else if (errorData?.response?.message) {
          const messages = errorData.response.message;
          if (Array.isArray(messages)) {
            errorMsg = messages.map((m: any) => m.message || JSON.stringify(m)).join(', ');
          } else {
            errorMsg = String(messages);
          }
        }

        await this.logNotification(ticketId || null, groupId, message, 'group_notification', 'error', errorMsg);
        
        return { success: false, message: errorMsg };
      }

      const data = await response.json();
      
      await this.logNotification(ticketId || null, groupId, message, 'group_notification', 'sent', null, data?.key?.id);

      return { success: true, message: 'Mensagem enviada para o grupo com sucesso', data };
    } catch (error) {
      console.error('Send to group error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      await this.logNotification(ticketId || null, groupId, message, 'group_notification', 'error', errorMessage);
      return { success: false, message: errorMessage };
    }
  }

  // List groups
  async listGroups(): Promise<{ success: boolean; groups?: WhatsAppGroup[]; message?: string; needsReconnect?: boolean }> {
    const settings = await this.getSettings();
    if (!settings?.evolutionApiUrl || !settings?.evolutionApiKey || !settings?.evolutionInstance) {
      return { success: false, message: 'Configurações incompletas', groups: [] };
    }

    const apiUrl = this.getApiUrl(settings);

    // First check connection state
    try {
      const stateResponse = await fetch(`${apiUrl}/instance/connectionState/${settings.evolutionInstance}`, {
        method: 'GET',
        headers: {
          'apikey': settings.evolutionApiKey,
          'Content-Type': 'application/json',
        },
      });

      if (stateResponse.ok) {
        const stateData = await stateResponse.json();
        const state = stateData?.instance?.state || stateData?.state || 'unknown';
        const isReallyConnected = (state === 'open' || state === 'connected');
        
        if (!isReallyConnected) {
          return { 
            success: false, 
            message: `Instância desconectada (${state}). Clique em reconectar.`,
            groups: [],
            needsReconnect: true
          };
        }
      }
    } catch (error) {
      console.log('Could not check state before listing groups:', error);
    }

    try {
      const response = await fetch(`${apiUrl}/group/fetchAllGroups/${settings.evolutionInstance}?getParticipants=false`, {
        method: 'GET',
        headers: {
          'apikey': settings.evolutionApiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return { success: false, message: `Erro ao listar grupos: ${response.status}`, groups: [] };
      }

      const groupsData = await response.json();
      
      let rawGroups: any[] = [];
      if (Array.isArray(groupsData)) {
        rawGroups = groupsData;
      } else if (groupsData?.groups && Array.isArray(groupsData.groups)) {
        rawGroups = groupsData.groups;
      } else if (groupsData?.data && Array.isArray(groupsData.data)) {
        rawGroups = groupsData.data;
      }

      const groupList: WhatsAppGroup[] = rawGroups.map((group: any) => ({
        id: group.id || group.jid,
        subject: group.subject || group.name || 'Grupo sem nome',
        size: group.size || group.participants?.length || 0,
        creation: group.creation || 0,
        owner: group.owner || '',
        desc: group.desc || group.description || '',
      }));

      return { success: true, groups: groupList };
    } catch (error) {
      console.error('List groups error:', error);
      return { success: false, message: 'Erro de conexão', groups: [] };
    }
  }

  // Sync groups to database
  async syncGroups(): Promise<{ success: boolean; message: string; count?: number }> {
    const result = await this.listGroups();
    
    if (!result.success || !result.groups) {
      return { success: false, message: result.message || 'Erro ao listar grupos' };
    }

    let syncedCount = 0;

    for (const group of result.groups) {
      try {
        await pool.query(
          `INSERT INTO whatsapp_groups (id, subject, size, owner, description, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (id) DO UPDATE SET
           subject = EXCLUDED.subject,
           size = EXCLUDED.size,
           owner = EXCLUDED.owner,
           description = EXCLUDED.description,
           updated_at = NOW()`,
          [group.id, group.subject, group.size, group.owner, group.desc]
        );
        syncedCount++;
      } catch (error) {
        console.error('Error syncing group:', group.id, error);
      }
    }

    return { success: true, message: `${syncedCount} grupos sincronizados`, count: syncedCount };
  }

  // Get profile picture
  async getProfilePicture(phone: string): Promise<{ success: boolean; pictureUrl?: string | null; message?: string }> {
    const settings = await this.getSettings();
    if (!settings?.evolutionApiUrl || !settings?.evolutionApiKey || !settings?.evolutionInstance) {
      return { success: false, message: 'Configurações incompletas' };
    }

    const apiUrl = this.getApiUrl(settings);
    const formattedPhone = formatPhoneNumber(phone, settings.defaultCountryCode || '55');

    const extractPictureUrl = (data: any): string | null => {
      const possibleFields = ['profilePictureUrl', 'pictureUrl', 'picture', 'imgUrl', 'profilePic', 'profilePicUrl', 'photo', 'avatar', 'imageUrl'];
      
      for (const field of possibleFields) {
        if (data?.[field] && typeof data[field] === 'string') {
          return data[field];
        }
      }
      return null;
    };

    try {
      const response = await fetch(`${apiUrl}/chat/fetchProfilePictureUrl/${settings.evolutionInstance}`, {
        method: 'POST',
        headers: {
          'apikey': settings.evolutionApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ number: formattedPhone }),
      });

      let pictureUrl: string | null = null;

      if (response.ok) {
        const data = await response.json();
        pictureUrl = extractPictureUrl(data);
      }

      // Try fallback endpoint
      if (!pictureUrl) {
        try {
          const fallbackResponse = await fetch(`${apiUrl}/chat/fetchProfile/${settings.evolutionInstance}`, {
            method: 'POST',
            headers: {
              'apikey': settings.evolutionApiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ number: formattedPhone }),
          });

          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            pictureUrl = extractPictureUrl(fallbackData);
          }
        } catch (fallbackError) {
          console.warn('Fallback endpoint error:', fallbackError);
        }
      }

      return { success: true, pictureUrl };
    } catch (error) {
      console.error('Get profile picture error:', error);
      return { success: false, message: 'Erro de conexão' };
    }
  }

  // Helper to log notification
  private async logNotification(
    ticketId: string | null,
    phoneNumber: string,
    messageContent: string,
    messageType: string,
    status: string,
    errorMessage: string | null,
    externalId?: string | null
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO whatsapp_notifications 
         (ticket_id, phone_number, message_content, message_type, status, error_message, sent_at, external_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          ticketId,
          phoneNumber,
          messageContent,
          messageType,
          status,
          errorMessage,
          status === 'sent' ? new Date().toISOString() : null,
          externalId || null
        ]
      );
    } catch (error) {
      console.error('Error logging notification:', error);
    }
  }
}

export const whatsAppService = new WhatsAppService();
