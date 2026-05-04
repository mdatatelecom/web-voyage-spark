import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the supabase client so importing useTickets.ts doesn't try to connect
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

// Mock react-router-dom (only useNavigate used at module load via hooks)
vi.mock('react-router-dom', () => ({
  useNavigate: () => () => undefined,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import {
  buildTicketMessage,
  buildTechnicianAssignmentMessage,
} from '@/hooks/useTickets';

const baseTicket = {
  id: 't1',
  ticket_number: 'TKT-2026-00001',
  title: 'Falha de rede no rack 5',
  description: 'Switch parou de responder após reboot.',
  category: 'network',
  priority: 'high',
  status: 'open',
  contact_phone: '11987654321',
  due_date: null,
  created_by: 'u1',
  assigned_to: null,
  technician_phone: null,
  related_building_id: null,
  related_room_id: null,
  related_rack_id: null,
  related_equipment_id: null,
  whatsapp_group_id: null,
  subcategory_id: null,
  attachments: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  resolved_at: null,
  closed_at: null,
} as any;

describe('buildTicketMessage — criação', () => {
  it('inclui "Criado por: <Nome>" quando creatorName é fornecido', () => {
    const msg = buildTicketMessage(baseTicket, 'new', undefined, '', '', 'João Silva');
    expect(msg).toContain('👤 Criado por: João Silva');
    expect(msg).toContain('🔔 *Novo Chamado Aberto*');
    expect(msg).toContain('TKT-2026-00001');
  });

  it('cai para "Sistema" quando creatorName é vazio/nulo', () => {
    const msg = buildTicketMessage(baseTicket, 'new', undefined, '', '', '');
    expect(msg).toContain('👤 Criado por: Sistema');
  });

  it('não quebra com title vazio e categoria nula', () => {
    const broken = { ...baseTicket, title: '', category: null, priority: null };
    const msg = buildTicketMessage(broken, 'new', undefined, '', '', 'Maria');
    expect(msg).toContain('(sem título)');
    expect(msg).toContain('Categoria:');
    expect(msg).toContain('Prioridade:');
    expect(msg).toContain('Criado por: Maria');
  });
});

describe('buildTicketMessage — atualização', () => {
  it('inclui Criado por e statusText', () => {
    const msg = buildTicketMessage(
      baseTicket,
      'update',
      '🔄 Status alterado para: Em andamento',
      undefined,
      undefined,
      'Carlos'
    );
    expect(msg).toContain('🔔 *Atualização de Chamado*');
    expect(msg).toContain('👤 Criado por: Carlos');
    expect(msg).toContain('Status alterado para: Em andamento');
  });
});

describe('buildTechnicianAssignmentMessage', () => {
  it('inclui Criado por, prioridade e contato', () => {
    const msg = buildTechnicianAssignmentMessage(baseTicket, 'Ana');
    expect(msg).toContain('🔧 *Chamado Atribuído a Você!*');
    expect(msg).toContain('👤 Criado por: Ana');
    expect(msg).toContain('Prioridade:');
    expect(msg).toContain('📞 Contato: 11987654321');
  });

  it('usa fallback Sistema se creatorName ausente', () => {
    const msg = buildTechnicianAssignmentMessage(baseTicket);
    expect(msg).toContain('👤 Criado por: Sistema');
  });
});
