import { Request, Response } from 'express';
import { whatsAppService } from '../services/whatsapp.service';

export class WhatsAppController {
  // Test connection
  async testConnection(req: Request, res: Response) {
    try {
      const result = await whatsAppService.testConnection();
      res.json(result);
    } catch (error) {
      console.error('Test connection error:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  // List instances
  async listInstances(req: Request, res: Response) {
    try {
      const result = await whatsAppService.listInstances();
      res.json(result);
    } catch (error) {
      console.error('List instances error:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', instances: [] });
    }
  }

  // Create instance
  async createInstance(req: Request, res: Response) {
    try {
      const { instanceName } = req.body;
      
      if (!instanceName) {
        return res.status(400).json({ success: false, message: 'Nome da instância é obrigatório' });
      }

      const result = await whatsAppService.createInstance(instanceName);
      res.json(result);
    } catch (error) {
      console.error('Create instance error:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  // Delete instance
  async deleteInstance(req: Request, res: Response) {
    try {
      const { name } = req.params;
      
      if (!name) {
        return res.status(400).json({ success: false, message: 'Nome da instância é obrigatório' });
      }

      const result = await whatsAppService.deleteInstance(name);
      res.json(result);
    } catch (error) {
      console.error('Delete instance error:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  // Connect instance (get QR code)
  async connectInstance(req: Request, res: Response) {
    try {
      const { name } = req.params;
      
      if (!name) {
        return res.status(400).json({ success: false, message: 'Nome da instância é obrigatório' });
      }

      const result = await whatsAppService.connectInstance(name);
      res.json(result);
    } catch (error) {
      console.error('Connect instance error:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  // Logout instance
  async logoutInstance(req: Request, res: Response) {
    try {
      const { name } = req.params;
      
      if (!name) {
        return res.status(400).json({ success: false, message: 'Nome da instância é obrigatório' });
      }

      const result = await whatsAppService.logoutInstance(name);
      res.json(result);
    } catch (error) {
      console.error('Logout instance error:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  // Configure webhook
  async configureWebhook(req: Request, res: Response) {
    try {
      const { name } = req.params;
      const webhookUrl = `${process.env.API_URL}/api/webhook/whatsapp`;
      
      if (!name) {
        return res.status(400).json({ success: false, message: 'Nome da instância é obrigatório' });
      }

      const result = await whatsAppService.configureWebhook(name, webhookUrl);
      res.json(result);
    } catch (error) {
      console.error('Configure webhook error:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  // Send message
  async sendMessage(req: Request, res: Response) {
    try {
      const { phone, message, ticketId } = req.body;
      
      if (!phone || !message) {
        return res.status(400).json({ success: false, message: 'Telefone e mensagem são obrigatórios' });
      }

      const result = await whatsAppService.sendMessage(phone, message, ticketId);
      res.json(result);
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  // Send to group
  async sendToGroup(req: Request, res: Response) {
    try {
      const { groupId, message, ticketId } = req.body;
      
      if (!groupId || !message) {
        return res.status(400).json({ success: false, message: 'ID do grupo e mensagem são obrigatórios' });
      }

      const result = await whatsAppService.sendToGroup(groupId, message, ticketId);
      res.json(result);
    } catch (error) {
      console.error('Send to group error:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  // List groups
  async listGroups(req: Request, res: Response) {
    try {
      const result = await whatsAppService.listGroups();
      res.json(result);
    } catch (error) {
      console.error('List groups error:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor', groups: [] });
    }
  }

  // Sync groups
  async syncGroups(req: Request, res: Response) {
    try {
      const result = await whatsAppService.syncGroups();
      res.json(result);
    } catch (error) {
      console.error('Sync groups error:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  // Get profile picture
  async getProfilePicture(req: Request, res: Response) {
    try {
      const { phone } = req.query;
      
      if (!phone || typeof phone !== 'string') {
        return res.status(400).json({ success: false, message: 'Telefone é obrigatório' });
      }

      const result = await whatsAppService.getProfilePicture(phone);
      res.json(result);
    } catch (error) {
      console.error('Get profile picture error:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }
}

export const whatsAppController = new WhatsAppController();
