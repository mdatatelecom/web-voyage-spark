/**
 * IPAM Utilities - Helper functions for IP Address Management
 */

import { supabase } from '@/integrations/supabase/client';
import { generateIPRecords, parseCIDR } from './cidr-utils';

export interface GenerateIPsOptions {
  subnetId: string;
  cidr: string;
  reserveGateway?: boolean;
  gatewayName?: string;
}

export interface GenerateIPsResult {
  success: boolean;
  count: number;
  error?: string;
}

/**
 * Generate and persist IP addresses for a subnet
 * Uses upsert to be idempotent (safe to run multiple times)
 */
export async function generateAndUpsertIPsForSubnet(
  options: GenerateIPsOptions
): Promise<GenerateIPsResult> {
  const { subnetId, cidr, reserveGateway = true, gatewayName = 'Gateway' } = options;

  const parsed = parseCIDR(cidr);
  if (!parsed) {
    return { success: false, count: 0, error: 'CIDR inválido' };
  }

  if (parsed.version !== 'ipv4') {
    return { success: false, count: 0, error: 'Geração automática disponível apenas para IPv4' };
  }

  // Generate IP records
  const records = generateIPRecords(cidr, { reserveGateway, gatewayName });

  if (records.length === 0) {
    return { success: false, count: 0, error: 'Nenhum IP gerado' };
  }

  // Prepare records for insertion
  const ipRecords = records.map(record => ({
    subnet_id: subnetId,
    ip_address: record.ip_address,
    ip_type: record.ip_type,
    status: record.status,
    name: record.name || null,
  }));

  // Insert in batches to avoid timeout
  const batchSize = 500;
  let insertedCount = 0;

  for (let i = 0; i < ipRecords.length; i += batchSize) {
    const batch = ipRecords.slice(i, i + batchSize);
    
    // Use upsert to handle duplicates gracefully
    const { error, count } = await supabase
      .from('ip_addresses')
      .upsert(batch, { 
        onConflict: 'subnet_id,ip_address',
        ignoreDuplicates: true 
      });

    if (error) {
      console.error('Error inserting IPs:', error);
      return { 
        success: false, 
        count: insertedCount, 
        error: `Erro ao inserir IPs: ${error.message}` 
      };
    }

    insertedCount += batch.length;
  }

  return { success: true, count: insertedCount };
}

/**
 * Check if a subnet has IPs generated
 */
export async function checkSubnetHasIPs(subnetId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('ip_addresses')
    .select('*', { count: 'exact', head: true })
    .eq('subnet_id', subnetId);

  if (error) {
    console.error('Error checking subnet IPs:', error);
    return false;
  }

  return (count || 0) > 0;
}

/**
 * Check if a VLAN has any subnets with IPs
 */
export async function checkVlanHasSubnetsWithIPs(vlanUuid: string): Promise<{
  hasSubnets: boolean;
  hasIPs: boolean;
  subnetId?: string;
}> {
  // Get subnets for this VLAN
  const { data: subnets, error: subnetsError } = await supabase
    .from('subnets')
    .select('id, cidr')
    .eq('vlan_uuid', vlanUuid);

  if (subnetsError || !subnets || subnets.length === 0) {
    return { hasSubnets: false, hasIPs: false };
  }

  // Check if any subnet has IPs
  const subnetIds = subnets.map(s => s.id);
  const { count, error: ipsError } = await supabase
    .from('ip_addresses')
    .select('*', { count: 'exact', head: true })
    .in('subnet_id', subnetIds);

  if (ipsError) {
    console.error('Error checking VLAN IPs:', ipsError);
    return { hasSubnets: true, hasIPs: false, subnetId: subnets[0].id };
  }

  return { 
    hasSubnets: true, 
    hasIPs: (count || 0) > 0,
    subnetId: subnets[0].id 
  };
}
