import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { requireRole, requireAdmin } from '../middleware/role';
import { validateBody, validateParams } from '../middleware/validate';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  createBuildingSchema,
  updateBuildingSchema,
  createFloorSchema,
  updateFloorSchema,
  createRoomSchema,
  updateRoomSchema,
  createRackSchema,
  updateRackSchema,
  createEquipmentSchema,
  updateEquipmentSchema,
  createConnectionSchema,
  updateConnectionSchema,
  createTicketSchema,
  updateTicketSchema,
  createTicketCommentSchema,
  createUserSchema,
  updateUserSchema,
  updateUserRolesSchema,
  uuidParamSchema,
} from '../validators/schemas';
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

// ===========================================
// Auth Routes (com validação Zod)
// ===========================================
router.post('/auth/register', validateBody(registerSchema), authController.register);
router.post('/auth/login', validateBody(loginSchema), authController.login);
router.post('/auth/logout', authMiddleware, authController.logout);
router.get('/auth/me', authMiddleware, authController.me);
router.post('/auth/refresh', validateBody(refreshTokenSchema), authController.refresh);

// ===========================================
// Buildings (com validação Zod)
// ===========================================
router.get('/buildings', authMiddleware, buildingsController.list);
router.get('/buildings/hierarchy', authMiddleware, buildingsController.getHierarchy);
router.get('/buildings/:id', authMiddleware, validateParams(uuidParamSchema), buildingsController.getById);
router.post('/buildings', authMiddleware, requireTechnician, validateBody(createBuildingSchema), buildingsController.create);
router.put('/buildings/:id', authMiddleware, requireTechnician, validateParams(uuidParamSchema), validateBody(updateBuildingSchema), buildingsController.update);
router.delete('/buildings/:id', authMiddleware, requireAdmin, validateParams(uuidParamSchema), buildingsController.remove);

// ===========================================
// Floors (com validação Zod)
// ===========================================
router.get('/floors', authMiddleware, floorsController.list);
router.get('/floors/:id', authMiddleware, validateParams(uuidParamSchema), floorsController.getById);
router.post('/floors', authMiddleware, requireTechnician, validateBody(createFloorSchema), floorsController.create);
router.put('/floors/:id', authMiddleware, requireTechnician, validateParams(uuidParamSchema), validateBody(updateFloorSchema), floorsController.update);
router.delete('/floors/:id', authMiddleware, requireAdmin, validateParams(uuidParamSchema), floorsController.remove);

// ===========================================
// Rooms (com validação Zod)
// ===========================================
router.get('/rooms', authMiddleware, roomsController.list);
router.get('/rooms/:id', authMiddleware, validateParams(uuidParamSchema), roomsController.getById);
router.post('/rooms', authMiddleware, requireTechnician, validateBody(createRoomSchema), roomsController.create);
router.put('/rooms/:id', authMiddleware, requireTechnician, validateParams(uuidParamSchema), validateBody(updateRoomSchema), roomsController.update);
router.delete('/rooms/:id', authMiddleware, requireAdmin, validateParams(uuidParamSchema), roomsController.remove);

// ===========================================
// Racks (com validação Zod)
// ===========================================
router.get('/racks', authMiddleware, racksController.list);
router.get('/racks/:id', authMiddleware, validateParams(uuidParamSchema), racksController.getById);
router.get('/racks/:id/occupancy', authMiddleware, validateParams(uuidParamSchema), racksController.getOccupancy);
router.post('/racks', authMiddleware, requireTechnician, validateBody(createRackSchema), racksController.create);
router.put('/racks/:id', authMiddleware, requireTechnician, validateParams(uuidParamSchema), validateBody(updateRackSchema), racksController.update);
router.delete('/racks/:id', authMiddleware, requireAdmin, validateParams(uuidParamSchema), racksController.remove);

// ===========================================
// Equipment (com validação Zod)
// ===========================================
router.get('/equipment', authMiddleware, equipmentController.list);
router.get('/equipment/:id', authMiddleware, validateParams(uuidParamSchema), equipmentController.getById);
router.post('/equipment', authMiddleware, requireTechnician, validateBody(createEquipmentSchema), equipmentController.create);
router.put('/equipment/:id', authMiddleware, requireTechnician, validateParams(uuidParamSchema), validateBody(updateEquipmentSchema), equipmentController.update);
router.delete('/equipment/:id', authMiddleware, requireAdmin, validateParams(uuidParamSchema), equipmentController.remove);
router.post('/equipment/:id/ports', authMiddleware, requireTechnician, validateParams(uuidParamSchema), equipmentController.createPorts);

// ===========================================
// Connections (com validação Zod)
// ===========================================
router.get('/connections', authMiddleware, connectionsController.list);
router.get('/connections/:id', authMiddleware, validateParams(uuidParamSchema), connectionsController.getById);
router.post('/connections', authMiddleware, requireTechnician, validateBody(createConnectionSchema), connectionsController.create);
router.put('/connections/:id', authMiddleware, requireTechnician, validateParams(uuidParamSchema), validateBody(updateConnectionSchema), connectionsController.update);
router.delete('/connections/:id', authMiddleware, requireTechnician, validateParams(uuidParamSchema), connectionsController.remove);

// ===========================================
// Tickets (com validação Zod)
// ===========================================
router.get('/tickets', authMiddleware, ticketsController.list);
router.get('/tickets/stats', authMiddleware, ticketsController.getStats);
router.get('/tickets/:id', authMiddleware, validateParams(uuidParamSchema), ticketsController.getById);
router.post('/tickets', authMiddleware, validateBody(createTicketSchema), ticketsController.create);
router.put('/tickets/:id', authMiddleware, validateParams(uuidParamSchema), validateBody(updateTicketSchema), ticketsController.update);
router.delete('/tickets/:id', authMiddleware, requireAdmin, validateParams(uuidParamSchema), ticketsController.remove);
router.post('/tickets/:id/comments', authMiddleware, validateParams(uuidParamSchema), validateBody(createTicketCommentSchema), ticketsController.addComment);

// ===========================================
// Alerts
// ===========================================
router.get('/alerts', authMiddleware, alertsController.list);
router.get('/alerts/stats', authMiddleware, alertsController.getStats);
router.get('/alerts/:id', authMiddleware, validateParams(uuidParamSchema), alertsController.getById);
router.post('/alerts/:id/acknowledge', authMiddleware, requireTechnician, validateParams(uuidParamSchema), alertsController.acknowledge);
router.post('/alerts/:id/resolve', authMiddleware, requireTechnician, validateParams(uuidParamSchema), alertsController.resolve);
router.post('/alerts/check-capacity', authMiddleware, requireAdmin, alertsController.checkCapacity);

// ===========================================
// Users (com validação Zod)
// ===========================================
router.get('/users', authMiddleware, requireAdmin, usersController.list);
router.get('/users/technicians', authMiddleware, usersController.listTechnicians);
router.get('/users/:id', authMiddleware, requireAdmin, validateParams(uuidParamSchema), usersController.getById);
router.post('/users', authMiddleware, requireAdmin, validateBody(createUserSchema), usersController.create);
router.put('/users/:id', authMiddleware, validateParams(uuidParamSchema), validateBody(updateUserSchema), usersController.update);
router.put('/users/:id/roles', authMiddleware, requireAdmin, validateParams(uuidParamSchema), validateBody(updateUserRolesSchema), usersController.updateRoles);
router.delete('/users/:id', authMiddleware, requireAdmin, validateParams(uuidParamSchema), usersController.remove);

// ===========================================
// WhatsApp
// ===========================================
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

// ===========================================
// Webhook (público - Evolution API envia aqui)
// ===========================================
router.post('/webhook/whatsapp', webhookController.handleWebhook);

export default router;
