import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface ConfigSnapshot {
  id: string;
  device_uuid: string;
  config_type: string;
  config_data: Json;
  collected_at: string;
  created_at: string;
}

export interface InterfaceSnapshot {
  name: string;
  type: string;
  status: string;
  speed: string;
  mac: string;
}

export interface VlanSnapshot {
  id: number;
  name: string;
  ports: string[];
}

export function useConfigSnapshots(deviceUuid: string | null, limit: number = 10) {
  return useQuery({
    queryKey: ['config-snapshots', deviceUuid, limit],
    queryFn: async () => {
      if (!deviceUuid) return [];

      const { data, error } = await supabase
        .from('device_config_snapshots')
        .select('*')
        .eq('device_uuid', deviceUuid)
        .order('collected_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as ConfigSnapshot[];
    },
    enabled: !!deviceUuid,
  });
}

export function compareSnapshots(
  snapshot1: ConfigSnapshot | null,
  snapshot2: ConfigSnapshot | null
): {
  interfaces: { added: string[]; removed: string[]; changed: Array<{ name: string; before: string; after: string }> };
  vlans: { added: number[]; removed: number[]; changed: Array<{ id: number; before: string; after: string }> };
} {
  if (!snapshot1 || !snapshot2) {
    return {
      interfaces: { added: [], removed: [], changed: [] },
      vlans: { added: [], removed: [], changed: [] },
    };
  }

  const data1 = snapshot1.config_data as { interfaces?: InterfaceSnapshot[]; vlans?: VlanSnapshot[] };
  const data2 = snapshot2.config_data as { interfaces?: InterfaceSnapshot[]; vlans?: VlanSnapshot[] };

  // Compare interfaces
  const interfaces1 = new Map((data1.interfaces || []).map(i => [i.name, i]));
  const interfaces2 = new Map((data2.interfaces || []).map(i => [i.name, i]));

  const addedInterfaces = Array.from(interfaces2.keys()).filter(name => !interfaces1.has(name));
  const removedInterfaces = Array.from(interfaces1.keys()).filter(name => !interfaces2.has(name));
  const changedInterfaces: Array<{ name: string; before: string; after: string }> = [];

  for (const [name, iface1] of interfaces1) {
    const iface2 = interfaces2.get(name);
    if (iface2) {
      if (iface1.status !== iface2.status) {
        changedInterfaces.push({ name, before: `status: ${iface1.status}`, after: `status: ${iface2.status}` });
      }
      if (iface1.speed !== iface2.speed) {
        changedInterfaces.push({ name, before: `speed: ${iface1.speed}`, after: `speed: ${iface2.speed}` });
      }
    }
  }

  // Compare VLANs
  const vlans1 = new Map((data1.vlans || []).map(v => [v.id, v]));
  const vlans2 = new Map((data2.vlans || []).map(v => [v.id, v]));

  const addedVlans = Array.from(vlans2.keys()).filter(id => !vlans1.has(id));
  const removedVlans = Array.from(vlans1.keys()).filter(id => !vlans2.has(id));
  const changedVlans: Array<{ id: number; before: string; after: string }> = [];

  for (const [id, vlan1] of vlans1) {
    const vlan2 = vlans2.get(id);
    if (vlan2) {
      if (vlan1.name !== vlan2.name) {
        changedVlans.push({ id, before: vlan1.name, after: vlan2.name });
      }
      const ports1 = (vlan1.ports || []).sort().join(',');
      const ports2 = (vlan2.ports || []).sort().join(',');
      if (ports1 !== ports2) {
        changedVlans.push({ id, before: `ports: ${ports1}`, after: `ports: ${ports2}` });
      }
    }
  }

  return {
    interfaces: { added: addedInterfaces, removed: removedInterfaces, changed: changedInterfaces },
    vlans: { added: addedVlans, removed: removedVlans, changed: changedVlans },
  };
}
