import { describe, it, expect, beforeEach, beforeAll } from 'vitest';

// Minimal window/localStorage shim for node test env (must run before importing module under test)
beforeAll(() => {
  if (typeof (globalThis as any).window === 'undefined') {
    const store = new Map<string, string>();
    (globalThis as any).window = {
      localStorage: {
        getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
        setItem: (k: string, v: string) => void store.set(k, String(v)),
        removeItem: (k: string) => void store.delete(k),
        clear: () => store.clear(),
      },
    };
  }
});

import {
  computeSLA,
  getSlaTarget,
  setSlaTarget,
  DEFAULT_SLA_TARGET,
  SLA_TARGET_STORAGE_KEY,
} from '../sla-utils';

const NOW = new Date('2026-05-04T12:00:00Z');
const past = (h: number) => new Date(NOW.getTime() - h * 3600_000).toISOString();
const future = (h: number) => new Date(NOW.getTime() + h * 3600_000).toISOString();

describe('computeSLA', () => {
  it('100% when no tickets', () => {
    const r = computeSLA([], NOW);
    expect(r.compliance).toBe(100);
    expect(r.evaluable).toBe(0);
  });

  it('counts resolved on time', () => {
    const r = computeSLA(
      [
        { status: 'resolved', due_date: future(2), resolved_at: past(1) },
        { status: 'closed', due_date: future(5), resolved_at: past(2) },
      ],
      NOW,
    );
    expect(r.evaluable).toBe(2);
    expect(r.onTime).toBe(2);
    expect(r.breached).toBe(0);
    expect(r.compliance).toBe(100);
  });

  it('mix on-time and late', () => {
    const r = computeSLA(
      [
        { status: 'resolved', due_date: past(2), resolved_at: past(1) }, // late
        { status: 'resolved', due_date: future(2), resolved_at: past(1) }, // on time
      ],
      NOW,
    );
    expect(r.evaluable).toBe(2);
    expect(r.onTime).toBe(1);
    expect(r.breached).toBe(1);
    expect(r.compliance).toBe(50);
  });

  it('open + overdue counts as breach', () => {
    const r = computeSLA(
      [{ status: 'open', due_date: past(3), resolved_at: null }],
      NOW,
    );
    expect(r.evaluable).toBe(1);
    expect(r.breached).toBe(1);
    expect(r.compliance).toBe(0);
  });

  it('open within deadline is ignored', () => {
    const r = computeSLA(
      [{ status: 'in_progress', due_date: future(5), resolved_at: null }],
      NOW,
    );
    expect(r.evaluable).toBe(0);
    expect(r.compliance).toBe(100);
  });

  it('resolved without resolved_at marked inconsistent + breach', () => {
    const r = computeSLA(
      [
        {
          id: 'a',
          ticket_number: 'TKT-2026-00001',
          status: 'resolved',
          due_date: future(1),
          resolved_at: null,
        },
      ],
      NOW,
    );
    expect(r.inconsistent).toBe(1);
    expect(r.breached).toBe(1);
    expect(r.evaluable).toBe(1);
    expect(r.inconsistentTickets[0].ticket_number).toBe('TKT-2026-00001');
  });

  it('invalid due_date is ignored and counted', () => {
    const r = computeSLA(
      [
        { status: 'resolved', due_date: 'not-a-date', resolved_at: past(1) },
        { status: 'resolved', due_date: future(2), resolved_at: past(1) },
      ],
      NOW,
    );
    expect(r.invalidDates).toBe(1);
    expect(r.evaluable).toBe(1);
    expect(r.compliance).toBe(100);
  });

  it('tickets without due_date are ignored', () => {
    const r = computeSLA(
      [{ status: 'open', due_date: null, resolved_at: null }],
      NOW,
    );
    expect(r.evaluable).toBe(0);
    expect(r.invalidDates).toBe(0);
  });

  it('rounds compliance', () => {
    const r = computeSLA(
      [
        { status: 'resolved', due_date: future(1), resolved_at: past(1) },
        { status: 'resolved', due_date: future(1), resolved_at: past(1) },
        { status: 'resolved', due_date: past(2), resolved_at: past(1) },
      ],
      NOW,
    );
    // 2/3 = 66.66... → 67
    expect(r.compliance).toBe(67);
  });
});

describe('SLA target persistence', () => {
  beforeEach(() => {
    try {
      window.localStorage.removeItem(SLA_TARGET_STORAGE_KEY);
    } catch {}
  });

  it('returns default when not set', () => {
    expect(getSlaTarget()).toBe(DEFAULT_SLA_TARGET);
  });

  it('clamps and persists value', () => {
    expect(setSlaTarget(150)).toBe(100);
    expect(getSlaTarget()).toBe(100);
    expect(setSlaTarget(0)).toBe(1);
    expect(getSlaTarget()).toBe(1);
    expect(setSlaTarget(85.6)).toBe(86);
    expect(getSlaTarget()).toBe(86);
  });

  it('falls back to default for invalid stored value', () => {
    window.localStorage.setItem(SLA_TARGET_STORAGE_KEY, 'abc');
    expect(getSlaTarget()).toBe(DEFAULT_SLA_TARGET);
  });
});
