import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ParsedNVR, inferCameraModel } from '@/lib/csv-parser';
import { Database } from '@/integrations/supabase/types';

type EquipmentType = Database['public']['Enums']['equipment_type'];

interface ImportOptions {
  rackId: string;
  positionUStart: number;
  createNvrs: boolean;
  importCameras: boolean;
  trackVacantChannels: boolean;
}

interface ImportResult {
  nvrsCreated: number;
  camerasImported: number;
  vacantChannelsTracked: number;
  errors: string[];
}

export const useCameraImport = () => {
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async ({ 
      nvrs, 
      options 
    }: { 
      nvrs: ParsedNVR[]; 
      options: ImportOptions 
    }): Promise<ImportResult> => {
      const result: ImportResult = {
        nvrsCreated: 0,
        camerasImported: 0,
        vacantChannelsTracked: 0,
        errors: []
      };

      let currentPosition = options.positionUStart;

      for (const nvr of nvrs) {
        try {
          let nvrEquipmentId: string | null = null;

          // Check if NVR already exists by IP
          const { data: existingNvr } = await supabase
            .from('equipment')
            .select('id')
            .eq('ip_address', nvr.ip)
            .eq('type', 'nvr' as EquipmentType)
            .maybeSingle();

          if (existingNvr) {
            nvrEquipmentId = existingNvr.id;
          } else if (options.createNvrs) {
            // Create NVR equipment
            const nvrData = {
              name: nvr.name || `NVR ${nvr.ip}`,
              type: 'nvr' as EquipmentType,
              rack_id: options.rackId,
              position_u_start: currentPosition,
              position_u_end: currentPosition + 1, // NVR typically 2U
              ip_address: nvr.ip,
              notes: JSON.stringify({
                totalChannels: nvr.totalChannels,
                usedChannels: nvr.usedChannels,
                vacantChannels: nvr.vacantChannels
              }),
              equipment_status: 'active'
            };

            const { data: newNvr, error: nvrError } = await supabase
              .from('equipment')
              .insert([nvrData])
              .select()
              .single();

            if (nvrError) {
              result.errors.push(`Erro ao criar NVR ${nvr.ip}: ${nvrError.message}`);
              continue;
            }

            nvrEquipmentId = newNvr.id;
            result.nvrsCreated++;
            currentPosition += 2; // Move position for next equipment

            // Create ports for NVR channels
            const ports = [];
            for (let i = 1; i <= nvr.totalChannels; i++) {
              const isUsed = nvr.usedChannels.includes(i);
              ports.push({
                equipment_id: newNvr.id,
                name: `CH${i}`,
                port_number: i,
                port_type: 'rj45' as const,
                speed: '100Mbps',
                status: isUsed ? 'in_use' as const : 'available' as const
              });
            }

            if (ports.length > 0) {
              const { error: portsError } = await supabase
                .from('ports')
                .insert(ports);

              if (portsError) {
                result.errors.push(`Erro ao criar portas do NVR ${nvr.ip}: ${portsError.message}`);
              }
            }
          }

          // Track vacant channels in result
          if (options.trackVacantChannels) {
            result.vacantChannelsTracked += nvr.vacantChannels.length;
          }

          // Import cameras as notes/metadata (cameras are typically not rack-mounted)
          if (options.importCameras && nvrEquipmentId) {
            const camerasData = nvr.cameras
              .filter(c => c.status === 'cadastrado')
              .map(camera => {
                const modelInfo = inferCameraModel(camera.location);
                return {
                  channel: camera.channel,
                  ip: camera.cameraIp,
                  location: camera.location,
                  model: modelInfo.modelName,
                  templateId: modelInfo.templateId
                };
              });

            // Update NVR notes with camera info
            const { error: updateError } = await supabase
              .from('equipment')
              .update({
                notes: JSON.stringify({
                  totalChannels: nvr.totalChannels,
                  usedChannels: nvr.usedChannels,
                  vacantChannels: nvr.vacantChannels,
                  cameras: camerasData
                })
              })
              .eq('id', nvrEquipmentId);

            if (updateError) {
              result.errors.push(`Erro ao atualizar câmeras do NVR ${nvr.ip}: ${updateError.message}`);
            } else {
              result.camerasImported += camerasData.length;
            }
          }
        } catch (error) {
          result.errors.push(`Erro ao processar NVR ${nvr.ip}: ${error}`);
        }
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['racks'] });
      queryClient.invalidateQueries({ queryKey: ['ports'] });
      
      const messages = [];
      if (result.nvrsCreated > 0) messages.push(`${result.nvrsCreated} NVR(s) criado(s)`);
      if (result.camerasImported > 0) messages.push(`${result.camerasImported} câmera(s) importada(s)`);
      if (result.vacantChannelsTracked > 0) messages.push(`${result.vacantChannelsTracked} canal(is) vago(s) registrado(s)`);
      
      toast.success(`Importação concluída: ${messages.join(', ')}`);
      
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} erro(s) durante importação`);
        console.warn('Import errors:', result.errors);
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro na importação: ${error.message}`);
    }
  });

  return {
    importCameras: importMutation.mutate,
    isImporting: importMutation.isPending,
    importResult: importMutation.data
  };
};
