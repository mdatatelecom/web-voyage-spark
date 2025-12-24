import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { requireRole, requireAdmin } from '../middleware/role';
import { authController } from '../controllers/auth.controller';
import { buildingsController } from '../controllers/buildings.controller';
import { floorsController } from '../controllers/floors.controller';
import { roomsController } from '../controllers/rooms.controller';
import { racksController } from '../controllers/racks.controller';
import { equipmentController } from '../controllers/equipment.controller';
import { connectionsController } from '../controllers/connections.controller';
import { alertsController } from '../controllers/alerts.controller';
import { usersController } from '../controllers/users.controller';
import { ticketsController } from '../controllers/tickets.controller';
import { whatsAppController } from '../controllers/whatsapp.controller';
import { webhookController } from '../controllers/webhook.controller';

const router = Router();

const requireTechnician = requireRole(['admin', 'technician']);

// Auth routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/logout', authMiddleware, authController.logout);
router.get('/auth/me', authMiddleware, authController.me);
router.post('/auth/refresh', authController.refresh);

// Buildings
router.get('/buildings', authMiddleware, buildingsController.list);
router.get('/buildings/:id', authMiddleware, buildingsController.getById);
router.post('/buildings', authMiddleware, requireTechnician, buildingsController.create);
router.put('/buildings/:id', authMiddleware, requireTechnician, buildingsController.update);
router.delete('/buildings/:id', authMiddleware, requireAdmin, buildingsController.remove);

// Floors
router.get('/floors', authMiddleware, floorsController.list);
router.get('/floors/:id', authMiddleware, floorsController.getById);
router.post('/floors', authMiddleware, requireTechnician, floorsController.create);
router.put('/floors/:id', authMiddleware, requireTechnician, floorsController.update);
router.delete('/floors/:id', authMiddleware, requireAdmin, floorsController.remove);

// Rooms
router.get('/rooms', authMiddleware, roomsController.list);
router.get('/rooms/:id', authMiddleware, roomsController.getById);
router.post('/rooms', authMiddleware, requireTechnician, roomsController.create);
router.put('/rooms/:id', authMiddleware, requireTechnician, roomsController.update);
router.delete('/rooms/:id', authMiddleware, requireAdmin, roomsController.remove);

// Racks
router.get('/racks', authMiddleware, racksController.list);
router.get('/racks/:id', authMiddleware, racksController.getById);
router.post('/racks', authMiddleware, requireTechnician, racksController.create);
router.put('/racks/:id', authMiddleware, requireTechnician, racksController.update);
router.delete('/racks/:id', authMiddleware, requireAdmin, racksController.remove);

// Equipment
router.get('/equipment', authMiddleware, equipmentController.list);
router.get('/equipment/:id', authMiddleware, equipmentController.getById);
router.post('/equipment', authMiddleware, requireTechnician, equipmentController.create);
router.put('/equipment/:id', authMiddleware, requireTechnician, equipmentController.update);
router.delete('/equipment/:id', authMiddleware, requireAdmin, equipmentController.remove);

// Connections
router.get('/connections', authMiddleware, connectionsController.list);
router.get('/connections/:id', authMiddleware, connectionsController.getById);
router.post('/connections', authMiddleware, requireTechnician, connectionsController.create);
router.put('/connections/:id', authMiddleware, requireTechnician, connectionsController.update);
router.delete('/connections/:id', authMiddleware, requireTechnician, connectionsController.remove);

// Tickets
router.get('/tickets', authMiddleware, ticketsController.list);
router.get('/tickets/stats', authMiddleware, ticketsController.getStats);
router.get('/tickets/:id', authMiddleware, ticketsController.getById);
router.post('/tickets', authMiddleware, ticketsController.create);
router.put('/tickets/:id', authMiddleware, ticketsController.update);
router.delete('/tickets/:id', authMiddleware, requireAdmin, ticketsController.remove);
router.post('/tickets/:id/comments', authMiddleware, ticketsController.addComment);

// Alerts
router.get('/alerts', authMiddleware, alertsController.list);
router.get('/alerts/stats', authMiddleware, alertsController.getStats);
router.get('/alerts/:id', authMiddleware, alertsController.getById);
router.post('/alerts/:id/acknowledge', authMiddleware, requireTechnician, alertsController.acknowledge);
router.post('/alerts/:id/resolve', authMiddleware, requireTechnician, alertsController.resolve);
router.post('/alerts/check-capacity', authMiddleware, requireAdmin, alertsController.checkCapacity);

// Users
router.get('/users', authMiddleware, requireAdmin, usersController.list);
router.get('/users/technicians', authMiddleware, usersController.listTechnicians);
router.get('/users/:id', authMiddleware, requireAdmin, usersController.getById);
router.post('/users', authMiddleware, requireAdmin, usersController.create);
router.put('/users/:id', authMiddleware, usersController.update);
router.put('/users/:id/roles', authMiddleware, requireAdmin, usersController.updateRoles);
router.delete('/users/:id', authMiddleware, requireAdmin, usersController.remove);

// WhatsApp
router.get('/whatsapp/test', authMiddleware, whatsAppController.testConnection);
router.get('/whatsapp/instances', authMiddleware, requireAdmin, whatsAppController.listInstances);
router.post('/whatsapp/instances', authMiddleware, requireAdmin, whatsAppController.createInstance);
router.delete('/whatsapp/instances/:name', authMiddleware, requireAdmin, whatsAppController.deleteInstance);
router.post('/whatsapp/instances/:name/connect', authMiddleware, requireAdmin, whatsAppController.connectInstance);
router.post('/whatsapp/instances/:name/logout', authMiddleware, requireAdmin, whatsAppController.logoutInstance);
router.post('/whatsapp/instances/:name/webhook', authMiddleware, requireAdmin, whatsAppController.configureWebhook);
router.post('/whatsapp/send', authMiddleware, whatsAppController.sendMessage);
router.post('/whatsapp/send-group', authMiddleware, whatsAppController.sendToGroup);
router.get('/whatsapp/groups', authMiddleware, whatsAppController.listGroups);
router.post('/whatsapp/groups/sync', authMiddleware, whatsAppController.syncGroups);
router.get('/whatsapp/profile-picture', authMiddleware, whatsAppController.getProfilePicture);

// Webhook (público - Evolution API envia aqui)
router.post('/webhook/whatsapp', webhookController.handleWebhook);

export default router;
