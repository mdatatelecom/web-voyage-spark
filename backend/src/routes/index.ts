import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin, requireTechnician } from '../middleware/role';

import * as authController from '../controllers/auth.controller';
import * as buildingsController from '../controllers/buildings.controller';
import * as floorsController from '../controllers/floors.controller';
import * as roomsController from '../controllers/rooms.controller';
import * as racksController from '../controllers/racks.controller';
import * as equipmentController from '../controllers/equipment.controller';
import * as connectionsController from '../controllers/connections.controller';
import * as ticketsController from '../controllers/tickets.controller';
import * as alertsController from '../controllers/alerts.controller';
import * as usersController from '../controllers/users.controller';

const router = Router();

// Auth (público)
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/refresh', authController.refreshToken);
router.post('/auth/logout', authMiddleware, authController.logout);
router.get('/auth/me', authMiddleware, authController.getMe);
router.post('/auth/change-password', authMiddleware, authController.changePassword);

// Buildings
router.get('/buildings', authMiddleware, buildingsController.list);
router.get('/buildings/hierarchy', authMiddleware, buildingsController.getHierarchy);
router.get('/buildings/:id', authMiddleware, buildingsController.getById);
router.post('/buildings', authMiddleware, requireAdmin, buildingsController.create);
router.put('/buildings/:id', authMiddleware, requireAdmin, buildingsController.update);
router.delete('/buildings/:id', authMiddleware, requireAdmin, buildingsController.remove);

// Floors
router.get('/floors', authMiddleware, floorsController.list);
router.get('/floors/:id', authMiddleware, floorsController.getById);
router.post('/floors', authMiddleware, requireAdmin, floorsController.create);
router.put('/floors/:id', authMiddleware, requireAdmin, floorsController.update);
router.delete('/floors/:id', authMiddleware, requireAdmin, floorsController.remove);

// Rooms
router.get('/rooms', authMiddleware, roomsController.list);
router.get('/rooms/:id', authMiddleware, roomsController.getById);
router.post('/rooms', authMiddleware, requireAdmin, roomsController.create);
router.put('/rooms/:id', authMiddleware, requireAdmin, roomsController.update);
router.delete('/rooms/:id', authMiddleware, requireAdmin, roomsController.remove);

// Racks
router.get('/racks', authMiddleware, racksController.list);
router.get('/racks/:id', authMiddleware, racksController.getById);
router.get('/racks/:id/occupancy', authMiddleware, racksController.getOccupancy);
router.post('/racks', authMiddleware, requireAdmin, racksController.create);
router.put('/racks/:id', authMiddleware, requireAdmin, racksController.update);
router.delete('/racks/:id', authMiddleware, requireAdmin, racksController.remove);

// Equipment
router.get('/equipment', authMiddleware, equipmentController.list);
router.get('/equipment/:id', authMiddleware, equipmentController.getById);
router.post('/equipment', authMiddleware, requireTechnician, equipmentController.create);
router.put('/equipment/:id', authMiddleware, requireTechnician, equipmentController.update);
router.delete('/equipment/:id', authMiddleware, requireTechnician, equipmentController.remove);
router.post('/equipment/:id/ports', authMiddleware, requireTechnician, equipmentController.createPorts);

// Connections
router.get('/connections', authMiddleware, connectionsController.list);
router.get('/connections/:id', authMiddleware, connectionsController.getById);
router.get('/connections/code/:code', authMiddleware, connectionsController.getByCode);
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

export default router;
