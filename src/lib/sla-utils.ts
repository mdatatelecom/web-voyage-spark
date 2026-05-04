import { isBefore, parseISO, isValid } from 'date-fns';

export interface SLATicketLike {
  id?: string;
  ticket_number?: string;
  status: string;
  due_date?: string | null;
  resolved_at?: string | null;
}

export interface SLABreakdown {
  /** Total de tickets considerados no cálculo (denominador). */
  evaluable: number;
  /** Resolvidos/fechados dentro do prazo (numerador). */
  onTime: number;
  /** Resolvidos fora do prazo OU abertos com prazo já vencido. */
  breached: number;
  /** Tickets resolvidos/fechados sem `resolved_at` (dado inconsistente). */
  inconsistent: number;
  /** Tickets com `due_date` em formato inválido — ignorados. */
  invalidDates: number;
  /** Lista resumida dos inconsistentes para depuração. */
  inconsistentTickets: SLATicketLike[];
  /** Percentual arredondado (0-100). 100 quando não há tickets avaliáveis. */
  compliance: number;
  /** Percentual sem arredondar. */
  complianceRaw: number;
}

const safeParse = (value?: string | null): Date | null => {
  if (!value) return null;
  try {
    const d = parseISO(value);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
};

const isClosedStatus = (status: string) =>
  status === 'resolved' || status === 'closed';

/**
 * Calcula o SLA compliance considerando apenas tickets *avaliáveis*:
 *  - resolvidos/fechados com due_date válido; ou
 *  - abertos/in_progress com due_date já vencido (breach garantido).
 *
 * Tickets sem due_date ou com data inválida são ignorados.
 * Resolvidos/fechados sem resolved_at são contados como breach (dado inconsistente)
 * e reportados em `inconsistent` para depuração.
 */
export const computeSLA = (
  tickets: SLATicketLike[],
  now: Date = new Date(),
): SLABreakdown => {
  let evaluable = 0;
  let onTime = 0;
  let breached = 0;
  let inconsistent = 0;
  let invalidDates = 0;
  const inconsistentTickets: SLATicketLike[] = [];

  for (const t of tickets) {
    if (!t.due_date) continue;
    const due = safeParse(t.due_date);
    if (!due) {
      invalidDates += 1;
      continue;
    }

    const closed = isClosedStatus(t.status);

    if (closed) {
      evaluable += 1;
      const resolved = safeParse(t.resolved_at);
      if (!resolved) {
        inconsistent += 1;
        breached += 1;
        if (inconsistentTickets.length < 20) inconsistentTickets.push(t);
        continue;
      }
      if (isBefore(resolved, due)) onTime += 1;
      else breached += 1;
    } else if (isBefore(due, now)) {
      evaluable += 1;
      breached += 1;
    }
  }

  const complianceRaw = evaluable > 0 ? (onTime / evaluable) * 100 : 100;
  return {
    evaluable,
    onTime,
    breached,
    inconsistent,
    invalidDates,
    inconsistentTickets,
    complianceRaw,
    compliance: Math.round(complianceRaw),
  };
};

export const SLA_TARGET_STORAGE_KEY = 'sla_target_percent';
export const DEFAULT_SLA_TARGET = 90;

export const getSlaTarget = (): number => {
  if (typeof window === 'undefined') return DEFAULT_SLA_TARGET;
  try {
    const raw = window.localStorage.getItem(SLA_TARGET_STORAGE_KEY);
    const n = raw ? Number(raw) : NaN;
    if (!Number.isFinite(n) || n < 1 || n > 100) return DEFAULT_SLA_TARGET;
    return Math.round(n);
  } catch {
    return DEFAULT_SLA_TARGET;
  }
};

export const setSlaTarget = (value: number): number => {
  const clamped = Math.min(100, Math.max(1, Math.round(value)));
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(SLA_TARGET_STORAGE_KEY, String(clamped));
    } catch {
      // ignore
    }
  }
  return clamped;
};
