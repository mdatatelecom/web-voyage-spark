import { Request } from 'express';

// Extender tipos do Express já definidos em middleware/auth.ts

// Tipos de usuário
export interface UserPayload {
  userId: string;
  email: string;
  roles: string[];
}

// Tipos de resposta padrão
export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Tipos de paginação
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Tipos de Query
export interface QueryParams {
  search?: string;
  status?: string;
  priority?: string;
  category?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Tipos de alerta
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';
export type AlertType = 'rack_capacity' | 'port_capacity' | 'equipment_failure' | 'poe_capacity';

// Tipos de ticket
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketCategory = 'network' | 'hardware' | 'software' | 'access' | 'infrastructure' | 'security' | 'other';

// Tipos de conexão
export type ConnectionStatus = 'active' | 'inactive' | 'reserved' | 'testing' | 'faulty';
export type CableType = 'utp_cat5e' | 'utp_cat6' | 'utp_cat6a' | 'fiber_om3' | 'fiber_om4' | 'fiber_os2' | 'dac' | 'other';

// Tipos de porta
export type PortStatus = 'available' | 'in_use' | 'reserved' | 'disabled';
export type PortType = 'rj45' | 'sfp' | 'sfp_plus' | 'sfp28' | 'qsfp' | 'qsfp28' | 'fiber_lc' | 'fiber_sc' | 'other';

// Tipos de usuário/role
export type UserRole = 'admin' | 'technician' | 'viewer' | 'network_viewer';

// Tipos de equipamento
export type EquipmentType = 
  | 'switch' | 'router' | 'server' | 'patch_panel' | 'firewall' | 'storage' | 'other'
  | 'load_balancer' | 'waf' | 'access_point' | 'pdu' | 'ups' | 'dvr' | 'nvr'
  | 'pabx' | 'voip_gateway' | 'modem' | 'olt' | 'onu' | 'kvm' | 'console_server'
  | 'patch_panel_fiber' | 'cable_organizer_horizontal' | 'cable_organizer_vertical'
  | 'brush_panel' | 'switch_poe' | 'poe_injector' | 'poe_splitter' | 'pdu_smart'
  | 'ip_camera' | 'media_converter' | 'media_converter_chassis' | 'environment_sensor'
  | 'rack_monitor' | 'dslam' | 'msan' | 'fixed_shelf';

// Tipos de WhatsApp
export interface WhatsAppSettings {
  evolutionApiUrl: string;
  evolutionApiKey: string;
  evolutionInstance: string;
  isEnabled: boolean;
  defaultCountryCode: string;
}

export interface WhatsAppSession {
  phone: string;
  state: string;
  data?: Record<string, any>;
}

// Tipos de Wizard
export type WizardState = 
  | 'wizard_categoria'
  | 'wizard_titulo'
  | 'wizard_descricao'
  | 'wizard_pos_criacao'
  | 'wizard_info_adicional'
  | 'wizard_prioridade'
  | 'confirm_resolve'
  | 'confirm_close'
  | 'awaiting_description'
  | 'awaiting_due_date'
  | 'awaiting_attach_ticket';

export interface WizardData {
  ticketId?: string;
  ticketNumber?: string;
  category?: string;
  title?: string;
  description?: string;
  priority?: string;
  attachmentUrl?: string;
}
