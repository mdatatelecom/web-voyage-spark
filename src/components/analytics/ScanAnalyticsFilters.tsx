import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AnalyticsPeriod } from '@/hooks/useScanAnalytics';

interface ScanAnalyticsFiltersProps {
  period: AnalyticsPeriod;
  onPeriodChange: (period: AnalyticsPeriod) => void;
}

export const ScanAnalyticsFilters = ({
  period,
  onPeriodChange,
}: ScanAnalyticsFiltersProps) => {
  return (
    <div className="flex gap-4 items-center">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Período:</span>
        <Select value={period} onValueChange={(value) => onPeriodChange(value as AnalyticsPeriod)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
