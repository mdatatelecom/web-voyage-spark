export type SLAStatusKey = 'good' | 'warning' | 'critical';

export interface SLAStatus {
  status: SLAStatusKey;
  label: string;
  color: string;
  bgColor: string;
  borderClass: string;
  gradientClass: string;
}

/**
 * Color/severity helper shared by SLAWidget and SLAComplianceCard.
 * `target` is the configurable goal (e.g. 90).
 */
export const getSlaStatus = (sla: number, target: number): SLAStatus => {
  const warningThreshold = Math.max(1, target - 10);
  if (sla >= target) {
    return {
      status: 'good',
      label: 'Excelente',
      color: 'text-green-500',
      bgColor: 'bg-green-500',
      borderClass: 'border-green-500/20',
      gradientClass: 'bg-gradient-to-br from-green-500/10 to-green-500/5',
    };
  }
  if (sla >= warningThreshold) {
    return {
      status: 'warning',
      label: 'Atenção',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500',
      borderClass: 'border-amber-500/20',
      gradientClass: 'bg-gradient-to-br from-amber-500/10 to-amber-500/5',
    };
  }
  return {
    status: 'critical',
    label: 'Crítico',
    color: 'text-red-500',
    bgColor: 'bg-red-500',
    borderClass: 'border-red-500/30',
    gradientClass: 'bg-gradient-to-br from-red-500/10 to-red-500/5',
  };
};
