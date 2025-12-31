import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MeasurementPoint {
  x: number;
  y: number;
}

export interface Measurement {
  id: string;
  floor_plan_id: string;
  name: string;
  description: string | null;
  points: MeasurementPoint[];
  scale: number;
  is_closed: boolean;
  total_distance: number | null;
  area: number | null;
  color: string;
  category: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaveMeasurementData {
  floor_plan_id: string;
  name: string;
  description?: string;
  points: MeasurementPoint[];
  scale: number;
  is_closed: boolean;
  total_distance?: number;
  area?: number;
  color?: string;
  category?: string;
}

export function useMeasurements(floorPlanId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: measurements, isLoading } = useQuery({
    queryKey: ['measurements', floorPlanId],
    queryFn: async () => {
      if (!floorPlanId) return [];
      
      const { data, error } = await supabase
        .from('floor_plan_measurements')
        .select('*')
        .eq('floor_plan_id', floorPlanId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        points: (Array.isArray(item.points) ? item.points : []) as unknown as MeasurementPoint[],
        category: item.category || 'geral'
      })) as Measurement[];
    },
    enabled: !!floorPlanId
  });

  const saveMutation = useMutation({
    mutationFn: async (measurement: SaveMeasurementData) => {
      const { data: user } = await supabase.auth.getUser();
      
      const insertData = {
        floor_plan_id: measurement.floor_plan_id,
        name: measurement.name,
        description: measurement.description,
        points: JSON.parse(JSON.stringify(measurement.points)),
        scale: measurement.scale,
        is_closed: measurement.is_closed,
        total_distance: measurement.total_distance,
        area: measurement.area,
        color: measurement.color,
        category: measurement.category || 'geral',
        created_by: user?.user?.id
      };
      
      const { data, error } = await supabase
        .from('floor_plan_measurements')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurements', floorPlanId] });
      toast.success('Medição salva com sucesso');
    },
    onError: (error) => {
      console.error('Error saving measurement:', error);
      toast.error('Erro ao salvar medição');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (measurementId: string) => {
      const { error } = await supabase
        .from('floor_plan_measurements')
        .delete()
        .eq('id', measurementId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurements', floorPlanId] });
      toast.success('Medição excluída');
    },
    onError: (error) => {
      console.error('Error deleting measurement:', error);
      toast.error('Erro ao excluir medição');
    }
  });

  return {
    measurements,
    isLoading,
    saveMeasurement: saveMutation.mutate,
    isSaving: saveMutation.isPending,
    deleteMeasurement: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending
  };
}
