import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SLAWidget } from '../SLAWidget';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

const mockStats = {
  slaCompliance: 82,
  slaBreakdown: {
    evaluable: 50,
    onTime: 41,
    breached: 9,
    inconsistent: 2,
    invalidDates: 1,
    inconsistentTickets: [
      { id: 'a', ticket_number: 'CHM-0001', status: 'resolved' },
      { id: 'b', ticket_number: 'CHM-0002', status: 'closed' },
    ],
    complianceRaw: 82.4567,
    compliance: 82,
  },
  overdueTickets: 3,
  urgentTickets: [],
};

vi.mock('@/hooks/useTicketStats', () => ({
  useTicketStats: () => ({ data: mockStats, isLoading: false }),
}));

const renderWidget = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <SLAWidget />
    </QueryClientProvider>,
  );
};

describe('SLAWidget integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists target via dialog and shows it on the meta label', async () => {
    const { unmount } = renderWidget();

    fireEvent.click(screen.getByTitle('Ajustar meta'));
    const input = await screen.findByLabelText('Meta (%)');
    fireEvent.change(input, { target: { value: '75' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(localStorage.getItem('sla_target_percent')).toBe('75');
    expect(screen.getByText('Meta: 75%')).toBeInTheDocument();

    unmount();
    renderWidget();
    expect(screen.getByText('Meta: 75%')).toBeInTheDocument();
  });

  it('renders the progress bar target marker at the configured target', () => {
    localStorage.setItem('sla_target_percent', '80');
    const { container } = renderWidget();

    const marker = container.querySelector('div[aria-hidden]') as HTMLElement | null;
    expect(marker).not.toBeNull();
    expect(marker!.style.left).toBe('80%');

    // Bottom scale label
    expect(screen.getAllByText('80%').length).toBeGreaterThan(0);
  });

  it('shows full breakdown contents in the popover', async () => {
    renderWidget();

    fireEvent.click(screen.getByTitle('Detalhes do cálculo'));

    const popover = await screen.findByText('Detalhes do cálculo');
    const root = popover.closest('div')!.parentElement!;

    expect(within(root).getByText('Avaliáveis')).toBeInTheDocument();
    expect(within(root).getByText('50')).toBeInTheDocument();
    expect(within(root).getByText('No prazo')).toBeInTheDocument();
    expect(within(root).getByText('41')).toBeInTheDocument();
    expect(within(root).getByText('Fora do prazo')).toBeInTheDocument();
    expect(within(root).getByText('9')).toBeInTheDocument();
    expect(within(root).getByText('Inconsistentes')).toBeInTheDocument();
    expect(within(root).getByText('Datas inválidas')).toBeInTheDocument();
    expect(within(root).getByText('82.46%')).toBeInTheDocument();
    expect(within(root).getByText('CHM-0001')).toBeInTheDocument();
    expect(within(root).getByText('CHM-0002')).toBeInTheDocument();
  });
});
