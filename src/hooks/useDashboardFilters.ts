import { useState } from 'react';

export interface DashboardFilters {
  dateRange: {
    from?: Date;
    to?: Date;
  };
  location: {
    buildingId?: string;
    floorId?: string;
    roomId?: string;
    rackId?: string;
  };
  connectionStatus?: string;
  portStatus?: string;
  equipmentType?: string;
}

export const useDashboardFilters = () => {
  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: {},
    location: {},
  });

  const updateDateRange = (from?: Date, to?: Date) => {
    setFilters((prev) => ({
      ...prev,
      dateRange: { from, to },
    }));
  };

  const updateLocation = (location: DashboardFilters['location']) => {
    setFilters((prev) => ({
      ...prev,
      location,
    }));
  };

  const updateConnectionStatus = (status?: string) => {
    setFilters((prev) => ({
      ...prev,
      connectionStatus: status,
    }));
  };

  const updatePortStatus = (status?: string) => {
    setFilters((prev) => ({
      ...prev,
      portStatus: status,
    }));
  };

  const updateEquipmentType = (type?: string) => {
    setFilters((prev) => ({
      ...prev,
      equipmentType: type,
    }));
  };

  const clearFilters = () => {
    setFilters({
      dateRange: {},
      location: {},
    });
  };

  const hasActiveFilters = () => {
    return (
      !!filters.dateRange.from ||
      !!filters.dateRange.to ||
      !!filters.location.buildingId ||
      !!filters.connectionStatus ||
      !!filters.portStatus ||
      !!filters.equipmentType
    );
  };

  return {
    filters,
    updateDateRange,
    updateLocation,
    updateConnectionStatus,
    updatePortStatus,
    updateEquipmentType,
    clearFilters,
    hasActiveFilters: hasActiveFilters(),
  };
};
