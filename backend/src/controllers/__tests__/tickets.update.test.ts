/**
 * Integration test: garante que ao atualizar um ticket para status
 * 'resolved' ou 'closed', o controller SEMPRE preenche resolved_at.
 */
import { update } from '../tickets.controller';
import * as db from '../../config/database';

jest.mock('../../config/database', () => ({
  query: jest.fn(),
  transaction: jest.fn(),
}));

const mockedQuery = db.query as unknown as jest.Mock;

function mockReqRes(body: any, params: any = { id: 'ticket-1' }) {
  const req: any = { body, params, user: { userId: 'user-1' } };
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: any) { this.body = payload; return this; },
  };
  return { req, res };
}

// Layout do array de parâmetros enviado ao UPDATE no controller:
// [id, title, description, category, priority, status, assignedTo,
//  contactPhone, technicianPhone, dueDate, attachments, resolvedAt, closedAt]
const RESOLVED_AT_IDX = 11;
const CLOSED_AT_IDX = 12;

describe('tickets.controller.update — resolved_at autofill', () => {
  beforeEach(() => {
    mockedQuery.mockReset();
    mockedQuery.mockResolvedValue({ rows: [{ id: 'ticket-1' }] });
  });

  it('preenche resolved_at quando status vira resolved', async () => {
    const { req, res } = mockReqRes({ status: 'resolved' });
    await update(req, res);

    expect(mockedQuery).toHaveBeenCalledTimes(1);
    const params = mockedQuery.mock.calls[0][1] as any[];
    const resolvedAt = params[RESOLVED_AT_IDX];
    expect(resolvedAt).not.toBeNull();
    expect(typeof resolvedAt).toBe('string');
    expect(() => new Date(resolvedAt as string).toISOString()).not.toThrow();
  });

  it('preenche resolved_at E closed_at quando status vira closed', async () => {
    const { req, res } = mockReqRes({ status: 'closed' });
    await update(req, res);

    const params = mockedQuery.mock.calls[0][1] as any[];
    expect(params[RESOLVED_AT_IDX]).not.toBeNull();
    expect(params[CLOSED_AT_IDX]).not.toBeNull();
  });

  it('NÃO altera resolved_at em status não terminal (in_progress)', async () => {
    const { req, res } = mockReqRes({ status: 'in_progress' });
    await update(req, res);

    const params = mockedQuery.mock.calls[0][1] as any[];
    expect(params[RESOLVED_AT_IDX]).toBeNull();
    expect(params[CLOSED_AT_IDX]).toBeNull();
  });

  it('NÃO altera resolved_at quando status não é enviado', async () => {
    const { req, res } = mockReqRes({ title: 'novo título' });
    await update(req, res);

    const params = mockedQuery.mock.calls[0][1] as any[];
    expect(params[RESOLVED_AT_IDX]).toBeNull();
    expect(params[CLOSED_AT_IDX]).toBeNull();
  });

  it('retorna 404 quando o ticket não existe', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [] });
    const { req, res } = mockReqRes({ status: 'resolved' });
    await update(req, res);
    expect(res.statusCode).toBe(404);
  });
});
