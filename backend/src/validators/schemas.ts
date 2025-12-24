import { z } from 'zod';

// ===========================================
// Schemas de Validação com Zod
// ===========================================

// ===== Auth Schemas =====
export const registerSchema = z.object({
  email: z.string().email('Email inválido').max(255),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(100),
  fullName: z.string().max(200).optional(),
  phone: z.string().max(20).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token é obrigatório'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres').max(100),
});

// ===== Building Schemas =====
export const createBuildingSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  address: z.string().max(500).optional().nullable(),
  buildingType: z.string().max(50).optional().nullable(),
  internalCode: z.string().max(50).optional().nullable(),
  zipCode: z.string().max(20).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(50).optional().nullable(),
  contactName: z.string().max(200).optional().nullable(),
  contactPhone: z.string().max(30).optional().nullable(),
  contactEmail: z.string().email().max(255).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

export const updateBuildingSchema = createBuildingSchema.partial();

// ===== Floor Schemas =====
export const createFloorSchema = z.object({
  buildingId: z.string().uuid('ID do prédio inválido'),
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  floorNumber: z.number().int().optional().nullable(),
  areaSqm: z.number().positive().optional().nullable(),
  hasAccessControl: z.boolean().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateFloorSchema = createFloorSchema.partial().omit({ buildingId: true });

// ===== Room Schemas =====
export const createRoomSchema = z.object({
  floorId: z.string().uuid('ID do andar inválido'),
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  roomType: z.string().max(50).optional().nullable(),
  capacity: z.number().int().positive().optional().nullable(),
  hasAccessControl: z.boolean().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateRoomSchema = createRoomSchema.partial().omit({ floorId: true });

// ===== Rack Schemas =====
export const createRackSchema = z.object({
  roomId: z.string().uuid('ID da sala inválido'),
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  sizeU: z.number().int().min(1).max(60).default(42),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateRackSchema = createRackSchema.partial().omit({ roomId: true });

// ===== Equipment Schemas =====
const equipmentTypes = [
  'switch', 'router', 'server', 'patch_panel', 'firewall', 'storage', 'other',
  'load_balancer', 'waf', 'access_point', 'pdu', 'ups', 'dvr', 'nvr', 'pabx',
  'voip_gateway', 'modem', 'olt', 'onu', 'kvm', 'console_server', 'patch_panel_fiber',
  'cable_organizer_horizontal', 'cable_organizer_vertical', 'brush_panel', 'switch_poe',
  'poe_injector', 'poe_splitter', 'pdu_smart', 'ip_camera', 'media_converter',
  'media_converter_chassis', 'environment_sensor', 'rack_monitor', 'dslam', 'msan', 'fixed_shelf'
] as const;

const equipmentStatuses = ['active', 'planned', 'offline', 'staged', 'failed', 'decommissioning'] as const;
const mountSides = ['front', 'rear'] as const;

export const createEquipmentSchema = z.object({
  rackId: z.string().uuid('ID do rack inválido'),
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  type: z.enum(equipmentTypes, { errorMap: () => ({ message: 'Tipo inválido' }) }),
  manufacturer: z.string().max(100).optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  serialNumber: z.string().max(100).optional().nullable(),
  hostname: z.string().max(255).optional().nullable(),
  ipAddress: z.string().max(45).optional().nullable(),
  positionUStart: z.number().int().min(1).max(60).optional().nullable(),
  positionUEnd: z.number().int().min(1).max(60).optional().nullable(),
  mountSide: z.enum(mountSides).default('front'),
  powerConsumptionWatts: z.number().positive().optional().nullable(),
  poeBudgetWatts: z.number().positive().optional().nullable(),
  assetTag: z.string().max(100).optional().nullable(),
  equipmentStatus: z.enum(equipmentStatuses).default('active'),
  airflow: z.string().max(20).optional().nullable(),
  primaryMacAddress: z.string().max(17).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  ports: z.array(z.object({
    name: z.string().max(50),
    portNumber: z.number().int().positive().optional(),
    portType: z.string().max(30).optional(),
    speed: z.string().max(20).optional(),
    notes: z.string().max(500).optional(),
  })).optional(),
});

export const updateEquipmentSchema = createEquipmentSchema.partial().omit({ rackId: true });

// ===== Port Schemas =====
const portTypes = [
  'rj45', 'sfp', 'sfp_plus', 'sfp28', 'qsfp', 'qsfp28', 'fiber_lc', 'fiber_sc',
  'bnc', 'hdmi', 'vga', 'usb', 'serial', 'console_rj45', 'console_usb', 'fxo_fxs',
  'e1_t1', 'power_ac', 'power_dc', 'antenna_sma', 'rs485_rs232', 'io', 'other',
  'rj45_poe', 'rj45_poe_plus', 'rj45_poe_plus_plus', 'sensor_io'
] as const;

const portStatuses = ['available', 'in_use', 'reserved', 'disabled'] as const;

export const createPortSchema = z.object({
  equipmentId: z.string().uuid('ID do equipamento inválido'),
  name: z.string().min(1, 'Nome é obrigatório').max(50),
  portNumber: z.number().int().positive().optional().nullable(),
  portType: z.enum(portTypes).default('rj45'),
  speed: z.string().max(20).optional().nullable(),
  status: z.enum(portStatuses).default('available'),
  notes: z.string().max(500).optional().nullable(),
});

export const createPortsBatchSchema = z.object({
  prefix: z.string().max(20).optional(),
  count: z.number().int().min(1).max(100).optional(),
  portType: z.enum(portTypes).optional(),
  speed: z.string().max(20).optional(),
  ports: z.array(z.object({
    name: z.string().max(50),
    portNumber: z.number().int().positive().optional(),
    portType: z.enum(portTypes).optional(),
    speed: z.string().max(20).optional(),
  })).optional(),
});

// ===== Connection Schemas =====
const cableTypes = ['utp_cat5e', 'utp_cat6', 'utp_cat6a', 'fiber_om3', 'fiber_om4', 'fiber_os2', 'dac', 'other'] as const;
const connectionStatuses = ['active', 'inactive', 'reserved', 'testing', 'faulty'] as const;

export const createConnectionSchema = z.object({
  portAId: z.string().uuid('ID da porta A inválido'),
  portBId: z.string().uuid('ID da porta B inválido'),
  cableType: z.enum(cableTypes),
  cableColor: z.string().max(30).optional().nullable(),
  cableLengthMeters: z.number().positive().optional().nullable(),
  status: z.enum(connectionStatuses).default('active'),
  vlanId: z.number().int().min(1).max(4094).optional().nullable(),
  vlanName: z.string().max(100).optional().nullable(),
  vlanTagging: z.string().max(20).optional().nullable(),
  installedBy: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateConnectionSchema = createConnectionSchema.partial().omit({ portAId: true, portBId: true });

// ===== Ticket Schemas =====
const ticketStatuses = ['open', 'in_progress', 'pending', 'resolved', 'closed'] as const;
const ticketPriorities = ['low', 'medium', 'high', 'critical'] as const;
const ticketCategories = ['hardware', 'network', 'software', 'access', 'maintenance', 'other'] as const;

export const createTicketSchema = z.object({
  title: z.string().min(3, 'Título deve ter no mínimo 3 caracteres').max(200),
  description: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres').max(5000),
  category: z.enum(ticketCategories).default('other'),
  priority: z.enum(ticketPriorities).default('medium'),
  assignedTo: z.string().uuid().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  relatedBuildingId: z.string().uuid().optional().nullable(),
  relatedRoomId: z.string().uuid().optional().nullable(),
  relatedRackId: z.string().uuid().optional().nullable(),
  relatedEquipmentId: z.string().uuid().optional().nullable(),
  contactPhone: z.string().max(30).optional().nullable(),
});

export const updateTicketSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  category: z.enum(ticketCategories).optional(),
  priority: z.enum(ticketPriorities).optional(),
  status: z.enum(ticketStatuses).optional(),
  assignedTo: z.string().uuid().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  technicianPhone: z.string().max(30).optional().nullable(),
});

export const createTicketCommentSchema = z.object({
  comment: z.string().min(1, 'Comentário é obrigatório').max(5000),
  isInternal: z.boolean().default(false),
});

// ===== Alert Schemas =====
const alertSeverities = ['info', 'warning', 'critical'] as const;
const alertTypes = ['rack_capacity', 'port_capacity', 'equipment_failure', 'poe_capacity'] as const;

export const createAlertSchema = z.object({
  type: z.enum(alertTypes),
  severity: z.enum(alertSeverities),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  relatedEntityType: z.string().max(50).optional().nullable(),
  relatedEntityId: z.string().uuid().optional().nullable(),
  thresholdValue: z.number().optional().nullable(),
  currentValue: z.number().optional().nullable(),
});

// ===== User Schemas =====
const userRoles = ['admin', 'technician', 'viewer', 'network_viewer'] as const;

export const createUserSchema = z.object({
  email: z.string().email('Email inválido').max(255),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(100),
  fullName: z.string().max(200).optional(),
  phone: z.string().max(20).optional(),
  roles: z.array(z.enum(userRoles)).min(1, 'Pelo menos uma role é obrigatória'),
});

export const updateUserSchema = z.object({
  fullName: z.string().max(200).optional(),
  phone: z.string().max(20).optional(),
  avatarUrl: z.string().url().max(500).optional().nullable(),
});

export const updateUserRolesSchema = z.object({
  roles: z.array(z.enum(userRoles)).min(1, 'Pelo menos uma role é obrigatória'),
});

// ===== Query Params Schemas =====
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid('ID inválido'),
});

// ===== Helper Types =====
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateBuildingInput = z.infer<typeof createBuildingSchema>;
export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;
export type CreateConnectionInput = z.infer<typeof createConnectionSchema>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
