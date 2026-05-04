## Goals

1. Make `/tickets/metrics` SLA Compliance card consistent with the dashboard `SLAWidget` (configurable target, color thresholds, breakdown popover).
2. Replace `console.warn` for SLA inconsistencies with a visible in-app warning.
3. Add integration tests covering SLAWidget target dialog persistence, target marker, and breakdown popover.

## 1. Refactor SLA Compliance card on `/tickets/metrics`

Extract a shared component `src/components/tickets/SLAComplianceCard.tsx` containing:
- The 3xl percentage with the same `getSLAStatus()` color logic from `SLAWidget` (good/warning/critical based on configurable target).
- Info popover with the same evaluable / on-time / breached / inconsistent / invalid-dates / raw compliance breakdown.
- Settings dialog to adjust the target (via `getSlaTarget`/`setSlaTarget`), invalidating the `ticket-stats` query on save.

Update `src/components/dashboard/SLAWidget.tsx` to consume the same color helper from a small extracted util `src/lib/sla-status.ts` (`getSlaStatus(sla, target)`) so both views stay in sync. Reuse `DEFAULT_SLA_TARGET` from `sla-utils.ts`.

Update `src/pages/TicketMetrics.tsx`:
- Replace the inline green "SLA Compliance" `<Card>` (lines 81–91) with `<SLAComplianceCard stats={stats} />`.
- Card color (border/gradient) now reflects the threshold (green/amber/red), matching the widget.

## 2. In-app warning for SLA inconsistencies

Remove the two `console.warn` calls in `useTicketStats.ts` (lines 240–248). Keep `slaBreakdown.inconsistent`, `inconsistentTickets`, and `invalidDates` in the returned data.

Create `src/components/tickets/SLAInconsistencyBanner.tsx`:
- Reads `useTicketStats()` and shows an inline amber `Alert` when `inconsistent > 0` or `invalidDates > 0`.
- Message: "X chamados sem `resolved_at` e Y com `due_date` inválido foram tratados como fora do prazo."
- Includes a "Ver detalhes" button that opens a `Dialog` listing the affected ticket numbers (from `slaBreakdown.inconsistentTickets`).
- Adds a session-scoped dismiss (`sessionStorage` key `sla-inconsistency-dismissed`) and a one-time `toast.warning(...)` on first detection per session, gated by the same key, to avoid noise on every refetch.

Mount the banner:
- Inside `TicketMetrics.tsx` above the summary cards.
- Inside `Dashboard.tsx` (top of the page) so admins see it on the main dashboard too.

## 3. Integration tests for SLAWidget

New file `src/components/dashboard/__tests__/SLAWidget.test.tsx` using Vitest + React Testing Library.

Test setup:
- Mock `useTicketStats` to return a fixed `stats` object including a populated `slaBreakdown` (evaluable, onTime, breached, inconsistent with two ticket numbers, invalidDates, complianceRaw).
- Mock `react-router-dom`'s `useNavigate`.
- Wrap in `QueryClientProvider` with a fresh `QueryClient`.
- Reset `localStorage` before each test.

Cases:
1. **Target dialog persistence** — Open settings dialog, change input to `75`, click Salvar. Assert `localStorage.getItem('sla-target')` is `"75"`, dialog closes, "Meta: 75%" label renders, and re-mounting the widget reads `75` back.
2. **Progress bar target marker** — With target persisted at `80`, assert the marker `<div>` inside the progress container has inline style `left: 80%`, and the bottom scale label shows `80%`.
3. **Breakdown popover contents** — Click the Info button, assert popover contains "Avaliáveis" with the mocked count, "No prazo" / "Fora do prazo" / "Inconsistentes" / "Datas inválidas" rows with correct values, raw compliance formatted with two decimals, and the inconsistent ticket numbers from the mock are listed.

Verify `vitest.config.ts` and `src/test/setup.ts` already exist (they do from earlier work) — no config changes needed.

## Technical notes

- `setSlaTarget` already clamps to 1–100 and persists to `localStorage`; both UIs invalidate `['ticket-stats']` on save so any derived rendering refreshes.
- The shared `SLAComplianceCard` keeps `TicketMetrics.tsx`'s grid layout intact (single grid cell, same height).
- Banner uses existing `@/components/ui/alert` and `sonner` `toast` (already in the project per shadcn-toast guidance).
- No DB or edge-function changes.

## Files

Created:
- `src/components/tickets/SLAComplianceCard.tsx`
- `src/components/tickets/SLAInconsistencyBanner.tsx`
- `src/lib/sla-status.ts`
- `src/components/dashboard/__tests__/SLAWidget.test.tsx`

Edited:
- `src/pages/TicketMetrics.tsx` (replace SLA card, mount banner)
- `src/pages/Dashboard.tsx` (mount banner)
- `src/components/dashboard/SLAWidget.tsx` (use shared `getSlaStatus`)
- `src/hooks/useTicketStats.ts` (remove `console.warn` calls)