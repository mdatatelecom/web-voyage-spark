/**
 * CIDR Utilities for IPAM System
 * Handles IPv4 and IPv6 address parsing, validation, and generation
 */

export interface CIDRInfo {
  version: 'ipv4' | 'ipv6';
  cidr: string;
  networkAddress: string;
  prefixLength: number;
  broadcastAddress: string | null;
  gatewayAddress: string | null;
  totalAddresses: number;
  usableAddresses: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// IPv4 regex
const IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const IPV4_CIDR_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/;

// IPv6 regex (simplified)
const IPV6_REGEX = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
const IPV6_CIDR_REGEX = /^([0-9a-fA-F:]+)\/(\d{1,3})$/;

/**
 * Detect if an IP address is IPv4
 */
export function isIPv4(ip: string): boolean {
  const match = ip.match(IPV4_REGEX);
  if (!match) return false;
  
  for (let i = 1; i <= 4; i++) {
    const octet = parseInt(match[i], 10);
    if (octet < 0 || octet > 255) return false;
  }
  return true;
}

/**
 * Detect if an IP address is IPv6
 */
export function isIPv6(ip: string): boolean {
  // Remove CIDR notation if present
  const ipPart = ip.split('/')[0];
  return IPV6_REGEX.test(ipPart) || ipPart.includes('::');
}

/**
 * Convert IPv4 address to numeric value
 */
function ipv4ToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/**
 * Convert numeric value to IPv4 address
 */
function numberToIPv4(num: number): string {
  return [
    (num >>> 24) & 255,
    (num >>> 16) & 255,
    (num >>> 8) & 255,
    num & 255
  ].join('.');
}

/**
 * Parse CIDR notation and extract all information
 */
export function parseCIDR(cidr: string): CIDRInfo | null {
  const trimmed = cidr.trim();
  
  // Try IPv4
  const ipv4Match = trimmed.match(IPV4_CIDR_REGEX);
  if (ipv4Match) {
    const ip = `${ipv4Match[1]}.${ipv4Match[2]}.${ipv4Match[3]}.${ipv4Match[4]}`;
    const prefix = parseInt(ipv4Match[5], 10);
    
    if (prefix < 0 || prefix > 32) return null;
    if (!isIPv4(ip)) return null;
    
    const ipNum = ipv4ToNumber(ip);
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    const networkNum = (ipNum & mask) >>> 0;
    const broadcastNum = (networkNum | ~mask) >>> 0;
    
    const totalAddresses = Math.pow(2, 32 - prefix);
    const usableAddresses = prefix >= 31 ? totalAddresses : Math.max(0, totalAddresses - 2);
    
    const networkAddress = numberToIPv4(networkNum);
    const broadcastAddress = prefix < 31 ? numberToIPv4(broadcastNum) : null;
    const gatewayAddress = prefix < 31 ? numberToIPv4(networkNum + 1) : null;
    
    return {
      version: 'ipv4',
      cidr: `${networkAddress}/${prefix}`,
      networkAddress,
      prefixLength: prefix,
      broadcastAddress,
      gatewayAddress,
      totalAddresses,
      usableAddresses
    };
  }
  
  // Try IPv6
  const ipv6Match = trimmed.match(IPV6_CIDR_REGEX);
  if (ipv6Match) {
    const ip = ipv6Match[1];
    const prefix = parseInt(ipv6Match[2], 10);
    
    if (prefix < 0 || prefix > 128) return null;
    if (!isIPv6(ip)) return null;
    
    // For IPv6, we don't calculate all IPs (too many)
    const totalAddresses = prefix >= 64 ? Math.pow(2, 128 - prefix) : Number.MAX_SAFE_INTEGER;
    
    return {
      version: 'ipv6',
      cidr: `${ip}/${prefix}`,
      networkAddress: ip,
      prefixLength: prefix,
      broadcastAddress: null,
      gatewayAddress: null,
      totalAddresses,
      usableAddresses: totalAddresses
    };
  }
  
  return null;
}

/**
 * Validate CIDR notation
 */
export function validateCIDR(cidr: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const trimmed = cidr.trim();
  
  if (!trimmed) {
    errors.push('CIDR não pode estar vazio');
    return { valid: false, errors, warnings };
  }
  
  if (!trimmed.includes('/')) {
    errors.push('CIDR deve incluir prefixo (ex: /24)');
    return { valid: false, errors, warnings };
  }
  
  const parsed = parseCIDR(trimmed);
  
  if (!parsed) {
    errors.push('Formato CIDR inválido');
    return { valid: false, errors, warnings };
  }
  
  // Check if network address is correct
  const [inputIP] = trimmed.split('/');
  if (parsed.version === 'ipv4' && inputIP !== parsed.networkAddress) {
    warnings.push(`Endereço de rede corrigido para ${parsed.networkAddress}`);
  }
  
  // Performance warnings
  if (parsed.version === 'ipv4') {
    if (parsed.totalAddresses > 65536) {
      warnings.push(`Rede muito grande (${parsed.totalAddresses.toLocaleString()} IPs). A geração automática será assíncrona.`);
    } else if (parsed.totalAddresses > 4096) {
      warnings.push(`Rede grande (${parsed.totalAddresses.toLocaleString()} IPs). A geração pode demorar alguns segundos.`);
    }
  }
  
  if (parsed.version === 'ipv6') {
    warnings.push('Para IPv6, a geração automática de IPs não é suportada devido à escala.');
  }
  
  return { valid: true, errors, warnings };
}

/**
 * Check if two CIDRs overlap
 */
export function checkOverlap(cidr1: string, cidr2: string): boolean {
  const parsed1 = parseCIDR(cidr1);
  const parsed2 = parseCIDR(cidr2);
  
  if (!parsed1 || !parsed2) return false;
  if (parsed1.version !== parsed2.version) return false;
  
  if (parsed1.version === 'ipv4') {
    const net1Start = ipv4ToNumber(parsed1.networkAddress);
    const net1End = net1Start + parsed1.totalAddresses - 1;
    const net2Start = ipv4ToNumber(parsed2.networkAddress);
    const net2End = net2Start + parsed2.totalAddresses - 1;
    
    return !(net1End < net2Start || net2End < net1Start);
  }
  
  // For IPv6, simplified check based on prefix
  // This is a basic implementation
  return parsed1.networkAddress === parsed2.networkAddress;
}

/**
 * Generate all IPv4 addresses in a CIDR range
 */
export function generateIPv4Addresses(cidr: string): string[] {
  const parsed = parseCIDR(cidr);
  if (!parsed || parsed.version !== 'ipv4') return [];
  
  // Limit to prevent browser freeze
  if (parsed.totalAddresses > 65536) {
    console.warn('Network too large for synchronous generation');
    return [];
  }
  
  const addresses: string[] = [];
  const startNum = ipv4ToNumber(parsed.networkAddress);
  
  for (let i = 0; i < parsed.totalAddresses; i++) {
    addresses.push(numberToIPv4(startNum + i));
  }
  
  return addresses;
}

/**
 * Generate IP address records for database insertion
 */
export interface IPAddressRecord {
  ip_address: string;
  ip_type: 'network' | 'gateway' | 'host' | 'broadcast' | 'reserved';
  status: 'available' | 'reserved' | 'used';
  name?: string;
}

export function generateIPRecords(
  cidr: string,
  options: {
    reserveGateway?: boolean;
    gatewayName?: string;
  } = {}
): IPAddressRecord[] {
  const parsed = parseCIDR(cidr);
  if (!parsed || parsed.version !== 'ipv4') return [];
  
  // Limit to prevent browser freeze
  if (parsed.totalAddresses > 4096) {
    console.warn('Network too large for full generation, returning only special addresses');
    const records: IPAddressRecord[] = [];
    
    records.push({
      ip_address: parsed.networkAddress,
      ip_type: 'network',
      status: 'reserved',
      name: 'Network'
    });
    
    if (parsed.gatewayAddress) {
      records.push({
        ip_address: parsed.gatewayAddress,
        ip_type: 'gateway',
        status: options.reserveGateway ? 'reserved' : 'available',
        name: options.gatewayName || 'Gateway'
      });
    }
    
    if (parsed.broadcastAddress) {
      records.push({
        ip_address: parsed.broadcastAddress,
        ip_type: 'broadcast',
        status: 'reserved',
        name: 'Broadcast'
      });
    }
    
    return records;
  }
  
  const addresses = generateIPv4Addresses(cidr);
  
  return addresses.map((ip, index) => {
    const isNetwork = index === 0;
    const isBroadcast = index === addresses.length - 1 && parsed.prefixLength < 31;
    const isGateway = index === 1 && parsed.prefixLength < 31;
    
    let ip_type: IPAddressRecord['ip_type'] = 'host';
    let status: IPAddressRecord['status'] = 'available';
    let name: string | undefined;
    
    if (isNetwork) {
      ip_type = 'network';
      status = 'reserved';
      name = 'Network';
    } else if (isBroadcast) {
      ip_type = 'broadcast';
      status = 'reserved';
      name = 'Broadcast';
    } else if (isGateway && options.reserveGateway) {
      ip_type = 'gateway';
      status = 'reserved';
      name = options.gatewayName || 'Gateway';
    }
    
    return { ip_address: ip, ip_type, status, name };
  });
}

/**
 * Format IP count for display
 */
export function formatIPCount(count: number): string {
  if (count >= 1e15) return '> 10^15';
  if (count >= 1e12) return `${(count / 1e12).toFixed(1)}T`;
  if (count >= 1e9) return `${(count / 1e9).toFixed(1)}B`;
  if (count >= 1e6) return `${(count / 1e6).toFixed(1)}M`;
  if (count >= 1e3) return `${(count / 1e3).toFixed(1)}K`;
  return count.toString();
}

/**
 * Validate a single IP address format
 */
export function validateIPAddress(ip: string): { valid: boolean; version?: 'ipv4' | 'ipv6'; error?: string } {
  const trimmed = ip.trim();
  
  if (!trimmed) {
    return { valid: false, error: 'IP não pode estar vazio' };
  }
  
  if (isIPv4(trimmed)) {
    return { valid: true, version: 'ipv4' };
  }
  
  if (isIPv6(trimmed)) {
    return { valid: true, version: 'ipv6' };
  }
  
  return { valid: false, error: 'Formato de IP inválido' };
}

/**
 * Check if an IP is within a CIDR range
 */
export function isIPInCIDR(ip: string, cidr: string): boolean {
  const parsed = parseCIDR(cidr);
  if (!parsed) return false;
  
  if (parsed.version === 'ipv4' && isIPv4(ip)) {
    const ipNum = ipv4ToNumber(ip);
    const netStart = ipv4ToNumber(parsed.networkAddress);
    const netEnd = netStart + parsed.totalAddresses - 1;
    
    return ipNum >= netStart && ipNum <= netEnd;
  }
  
  return false;
}
