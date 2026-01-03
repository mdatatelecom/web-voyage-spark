import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VlanIPStats {
  vlan_id: string;
  vlan_name: string;
  vlan_number: number;
  category: string;
  color: string;
  total_ips: number;
  used_ips: number;
  available_ips: number;
  reserved_ips: number;
  usage_percent: number;
}

export interface SubnetIPStats {
  subnet_id: string;
  subnet_name: string;
  cidr: string;
  vlan_id: string | null;
  vlan_name: string | null;
  vlan_number: number | null;
  total_ips: number;
  used_ips: number;
  available_ips: number;
  reserved_ips: number;
  usage_percent: number;
}

export interface IPAMSummary {
  total_vlans: number;
  total_subnets: number;
  total_ips: number;
  used_ips: number;
  available_ips: number;
  reserved_ips: number;
  overall_usage_percent: number;
}

export function useIPAMStats() {
  // Get summary stats
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['ipam-summary'],
    queryFn: async () => {
      const [vlansRes, subnetsRes, ipsRes] = await Promise.all([
        supabase.from('vlans').select('id', { count: 'exact', head: true }),
        supabase.from('subnets').select('id', { count: 'exact', head: true }),
        supabase.from('ip_addresses').select('status')
      ]);

      const ips = ipsRes.data || [];
      const used = ips.filter(ip => ip.status === 'used').length;
      const available = ips.filter(ip => ip.status === 'available').length;
      const reserved = ips.filter(ip => ip.status === 'reserved').length;
      const total = ips.length;

      return {
        total_vlans: vlansRes.count || 0,
        total_subnets: subnetsRes.count || 0,
        total_ips: total,
        used_ips: used,
        available_ips: available,
        reserved_ips: reserved,
        overall_usage_percent: total > 0 ? Math.round((used / total) * 100) : 0
      } as IPAMSummary;
    }
  });

  // Get stats by VLAN
  const { data: vlanStats, isLoading: vlanLoading } = useQuery({
    queryKey: ['ipam-vlan-stats'],
    queryFn: async () => {
      // Get all VLANs
      const { data: vlans } = await supabase
        .from('vlans')
        .select('id, vlan_id, name, category, color')
        .order('vlan_id');

      if (!vlans || vlans.length === 0) return [];

      // For each VLAN, get subnets and count IPs
      const stats: VlanIPStats[] = [];

      for (const vlan of vlans) {
        // Get subnets for this VLAN
        const { data: subnets } = await supabase
          .from('subnets')
          .select('id')
          .eq('vlan_uuid', vlan.id);

        if (!subnets || subnets.length === 0) {
          stats.push({
            vlan_id: vlan.id,
            vlan_name: vlan.name,
            vlan_number: vlan.vlan_id,
            category: vlan.category,
            color: vlan.color || '#6b7280',
            total_ips: 0,
            used_ips: 0,
            available_ips: 0,
            reserved_ips: 0,
            usage_percent: 0
          });
          continue;
        }

        const subnetIds = subnets.map(s => s.id);

        // Get IPs for these subnets
        const { data: ips } = await supabase
          .from('ip_addresses')
          .select('status')
          .in('subnet_id', subnetIds);

        const ipList = ips || [];
        const used = ipList.filter(ip => ip.status === 'used').length;
        const available = ipList.filter(ip => ip.status === 'available').length;
        const reserved = ipList.filter(ip => ip.status === 'reserved').length;
        const total = ipList.length;

        stats.push({
          vlan_id: vlan.id,
          vlan_name: vlan.name,
          vlan_number: vlan.vlan_id,
          category: vlan.category,
          color: vlan.color || '#6b7280',
          total_ips: total,
          used_ips: used,
          available_ips: available,
          reserved_ips: reserved,
          usage_percent: total > 0 ? Math.round((used / total) * 100) : 0
        });
      }

      return stats;
    }
  });

  // Get stats by Subnet
  const { data: subnetStats, isLoading: subnetLoading } = useQuery({
    queryKey: ['ipam-subnet-stats'],
    queryFn: async () => {
      // Get all subnets with VLAN info
      const { data: subnets } = await supabase
        .from('subnets')
        .select(`
          id, 
          name, 
          cidr,
          vlan_uuid,
          vlans(id, vlan_id, name)
        `)
        .order('cidr');

      if (!subnets || subnets.length === 0) return [];

      const stats: SubnetIPStats[] = [];

      for (const subnet of subnets) {
        // Get IPs for this subnet
        const { data: ips } = await supabase
          .from('ip_addresses')
          .select('status')
          .eq('subnet_id', subnet.id);

        const ipList = ips || [];
        const used = ipList.filter(ip => ip.status === 'used').length;
        const available = ipList.filter(ip => ip.status === 'available').length;
        const reserved = ipList.filter(ip => ip.status === 'reserved').length;
        const total = ipList.length;

        const vlanData = subnet.vlans as unknown as { id: string; vlan_id: number; name: string } | null;

        stats.push({
          subnet_id: subnet.id,
          subnet_name: subnet.name,
          cidr: subnet.cidr,
          vlan_id: vlanData?.id || null,
          vlan_name: vlanData?.name || null,
          vlan_number: vlanData?.vlan_id || null,
          total_ips: total,
          used_ips: used,
          available_ips: available,
          reserved_ips: reserved,
          usage_percent: total > 0 ? Math.round((used / total) * 100) : 0
        });
      }

      return stats;
    }
  });

  return {
    summary,
    vlanStats: vlanStats || [],
    subnetStats: subnetStats || [],
    isLoading: summaryLoading || vlanLoading || subnetLoading
  };
}
