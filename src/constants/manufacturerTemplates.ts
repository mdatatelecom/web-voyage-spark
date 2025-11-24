export interface ManufacturerTemplate {
  id: string;
  manufacturer: string;
  model: string;
  type: string;
  category: string;
  portGroups: {
    type: string;
    quantity: number;
    speed: string;
    prefix: string;
    startNumber: number;
  }[];
}

export const MANUFACTURER_TEMPLATES: ManufacturerTemplate[] = [
  // CISCO
  {
    id: 'cisco_catalyst_9200_24',
    manufacturer: 'Cisco',
    model: 'Catalyst 9200-24P',
    type: 'switch',
    category: 'network',
    portGroups: [
      { type: 'rj45', quantity: 24, speed: '1Gbps', prefix: 'Gi1/0/', startNumber: 1 },
      { type: 'sfp_plus', quantity: 4, speed: '10Gbps', prefix: 'Te1/0/', startNumber: 1 },
    ]
  },
  {
    id: 'cisco_catalyst_9300_48',
    manufacturer: 'Cisco',
    model: 'Catalyst 9300-48P',
    type: 'switch',
    category: 'network',
    portGroups: [
      { type: 'rj45', quantity: 48, speed: '1Gbps', prefix: 'Gi1/0/', startNumber: 1 },
      { type: 'sfp_plus', quantity: 4, speed: '10Gbps', prefix: 'Te1/0/', startNumber: 1 },
    ]
  },
  {
    id: 'cisco_catalyst_9500_48',
    manufacturer: 'Cisco',
    model: 'Catalyst 9500-48Y4C',
    type: 'switch',
    category: 'network',
    portGroups: [
      { type: 'sfp28', quantity: 48, speed: '25Gbps', prefix: 'Te1/0/', startNumber: 1 },
      { type: 'qsfp28', quantity: 4, speed: '100Gbps', prefix: 'Hu1/0/', startNumber: 1 },
    ]
  },
  {
    id: 'cisco_nexus_9300',
    manufacturer: 'Cisco',
    model: 'Nexus 9300 48-Port',
    type: 'switch',
    category: 'network',
    portGroups: [
      { type: 'sfp_plus', quantity: 48, speed: '10Gbps', prefix: 'Eth1/', startNumber: 1 },
      { type: 'qsfp28', quantity: 6, speed: '100Gbps', prefix: 'Eth1/', startNumber: 49 },
    ]
  },
  
  // HPE ARUBA
  {
    id: 'hpe_aruba_2930f_24',
    manufacturer: 'HPE Aruba',
    model: '2930F-24G-4SFP+',
    type: 'switch',
    category: 'network',
    portGroups: [
      { type: 'rj45', quantity: 24, speed: '1Gbps', prefix: 'Gi1/', startNumber: 1 },
      { type: 'sfp_plus', quantity: 4, speed: '10Gbps', prefix: 'Te1/', startNumber: 1 },
    ]
  },
  {
    id: 'hpe_aruba_2930f_48',
    manufacturer: 'HPE Aruba',
    model: '2930F-48G-4SFP+',
    type: 'switch',
    category: 'network',
    portGroups: [
      { type: 'rj45', quantity: 48, speed: '1Gbps', prefix: 'Gi1/', startNumber: 1 },
      { type: 'sfp_plus', quantity: 4, speed: '10Gbps', prefix: 'Te1/', startNumber: 1 },
    ]
  },
  {
    id: 'hpe_aruba_cx_6300_48',
    manufacturer: 'HPE Aruba',
    model: 'CX 6300 48G',
    type: 'switch',
    category: 'network',
    portGroups: [
      { type: 'rj45', quantity: 48, speed: '1Gbps', prefix: '1/1/', startNumber: 1 },
      { type: 'sfp_plus', quantity: 4, speed: '10Gbps', prefix: '1/1/', startNumber: 49 },
    ]
  },
  
  // DELL
  {
    id: 'dell_powerswitch_n3248',
    manufacturer: 'Dell',
    model: 'PowerSwitch N3248TE-ON',
    type: 'switch',
    category: 'network',
    portGroups: [
      { type: 'rj45', quantity: 48, speed: '1Gbps', prefix: 'Eth1/', startNumber: 1 },
      { type: 'sfp28', quantity: 4, speed: '25Gbps', prefix: 'SFP1/', startNumber: 1 },
    ]
  },
  {
    id: 'dell_powerswitch_s5248',
    manufacturer: 'Dell',
    model: 'PowerSwitch S5248F-ON',
    type: 'switch',
    category: 'network',
    portGroups: [
      { type: 'sfp28', quantity: 48, speed: '25Gbps', prefix: 'Eth1/', startNumber: 1 },
      { type: 'qsfp28', quantity: 6, speed: '100Gbps', prefix: 'Eth1/', startNumber: 49 },
    ]
  },
  
  // JUNIPER
  {
    id: 'juniper_ex4300_48',
    manufacturer: 'Juniper',
    model: 'EX4300-48P',
    type: 'switch',
    category: 'network',
    portGroups: [
      { type: 'rj45', quantity: 48, speed: '1Gbps', prefix: 'ge-0/0/', startNumber: 0 },
      { type: 'sfp_plus', quantity: 4, speed: '10Gbps', prefix: 'xe-0/1/', startNumber: 0 },
    ]
  },
  
  // EXTREME NETWORKS
  {
    id: 'extreme_x440_48',
    manufacturer: 'Extreme Networks',
    model: 'X440-G2-48P',
    type: 'switch',
    category: 'network',
    portGroups: [
      { type: 'rj45', quantity: 48, speed: '1Gbps', prefix: 'Port', startNumber: 1 },
      { type: 'sfp_plus', quantity: 4, speed: '10Gbps', prefix: 'Port', startNumber: 49 },
    ]
  },
  
  // HUAWEI
  {
    id: 'huawei_s5720_48',
    manufacturer: 'Huawei',
    model: 'S5720-52P-SI',
    type: 'switch',
    category: 'network',
    portGroups: [
      { type: 'rj45', quantity: 48, speed: '1Gbps', prefix: 'GE1/0/', startNumber: 1 },
      { type: 'sfp', quantity: 4, speed: '1Gbps', prefix: 'GE1/0/', startNumber: 49 },
    ]
  },
  
  // PATCH PANELS
  {
    id: 'furukawa_patch_24_cat6',
    manufacturer: 'Furukawa',
    model: 'Patch Panel Cat6 24P',
    type: 'patch_panel',
    category: 'patch_panels',
    portGroups: [
      { type: 'rj45', quantity: 24, speed: '1Gbps', prefix: 'P', startNumber: 1 },
    ]
  },
  {
    id: 'furukawa_patch_48_cat6',
    manufacturer: 'Furukawa',
    model: 'Patch Panel Cat6 48P',
    type: 'patch_panel',
    category: 'patch_panels',
    portGroups: [
      { type: 'rj45', quantity: 48, speed: '1Gbps', prefix: 'P', startNumber: 1 },
    ]
  },
  {
    id: 'furukawa_patch_24_cat6a',
    manufacturer: 'Furukawa',
    model: 'Patch Panel Cat6A 24P',
    type: 'patch_panel',
    category: 'patch_panels',
    portGroups: [
      { type: 'rj45', quantity: 24, speed: '10Gbps', prefix: 'P', startNumber: 1 },
    ]
  },
  {
    id: 'furukawa_dio_24_lc',
    manufacturer: 'Furukawa',
    model: 'DIO 24P LC',
    type: 'patch_panel_fiber',
    category: 'patch_panels',
    portGroups: [
      { type: 'fiber_lc', quantity: 24, speed: '10Gbps', prefix: 'F', startNumber: 1 },
    ]
  },
  {
    id: 'panduit_patch_48_cat6',
    manufacturer: 'Panduit',
    model: 'NetKey Cat6 48P',
    type: 'patch_panel',
    category: 'patch_panels',
    portGroups: [
      { type: 'rj45', quantity: 48, speed: '1Gbps', prefix: 'Port', startNumber: 1 },
    ]
  },
  
  // SERVIDORES
  {
    id: 'dell_poweredge_r740',
    manufacturer: 'Dell',
    model: 'PowerEdge R740',
    type: 'server',
    category: 'servers',
    portGroups: [
      { type: 'rj45', quantity: 4, speed: '1Gbps', prefix: 'NIC', startNumber: 1 },
    ]
  },
  {
    id: 'hpe_proliant_dl380',
    manufacturer: 'HPE',
    model: 'ProLiant DL380 Gen10',
    type: 'server',
    category: 'servers',
    portGroups: [
      { type: 'rj45', quantity: 4, speed: '1Gbps', prefix: 'Port', startNumber: 1 },
    ]
  },
  
  // STORAGE
  {
    id: 'qnap_ts_453',
    manufacturer: 'QNAP',
    model: 'TS-453D',
    type: 'storage',
    category: 'storage',
    portGroups: [
      { type: 'rj45', quantity: 2, speed: '2.5Gbps', prefix: 'LAN', startNumber: 1 },
    ]
  },
  {
    id: 'synology_rs2421',
    manufacturer: 'Synology',
    model: 'RS2421+',
    type: 'storage',
    category: 'storage',
    portGroups: [
      { type: 'rj45', quantity: 4, speed: '1Gbps', prefix: 'LAN', startNumber: 1 },
    ]
  },
];

export const getTemplatesByManufacturer = () => {
  const manufacturers = Array.from(new Set(MANUFACTURER_TEMPLATES.map(t => t.manufacturer)));
  return manufacturers.map(manufacturer => ({
    manufacturer,
    models: MANUFACTURER_TEMPLATES.filter(t => t.manufacturer === manufacturer)
  }));
};

export const getTemplateById = (id: string) => {
  return MANUFACTURER_TEMPLATES.find(t => t.id === id);
};
