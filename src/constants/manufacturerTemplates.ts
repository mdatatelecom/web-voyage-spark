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
  poeBudgetWatts?: number;
  poePerPort?: number;
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
  
  // SWITCHES POE - CISCO
  {
    id: 'cisco_catalyst_9200_24p_poe',
    manufacturer: 'Cisco',
    model: 'Catalyst 9200-24P PoE+',
    type: 'switch_poe',
    category: 'surveillance',
    poeBudgetWatts: 370,
    poePerPort: 30,
    portGroups: [
      { type: 'rj45_poe_plus', quantity: 24, speed: '1Gbps', prefix: 'Gi1/0/', startNumber: 1 },
      { type: 'sfp_plus', quantity: 4, speed: '10Gbps', prefix: 'Te1/0/', startNumber: 1 },
    ]
  },
  {
    id: 'cisco_catalyst_9200_48p_poe',
    manufacturer: 'Cisco',
    model: 'Catalyst 9200-48P PoE+',
    type: 'switch_poe',
    category: 'surveillance',
    poeBudgetWatts: 740,
    poePerPort: 30,
    portGroups: [
      { type: 'rj45_poe_plus', quantity: 48, speed: '1Gbps', prefix: 'Gi1/0/', startNumber: 1 },
      { type: 'sfp_plus', quantity: 4, speed: '10Gbps', prefix: 'Te1/0/', startNumber: 1 },
    ]
  },
  {
    id: 'cisco_catalyst_9300_24u_poe',
    manufacturer: 'Cisco',
    model: 'Catalyst 9300-24U PoE++',
    type: 'switch_poe',
    category: 'surveillance',
    poeBudgetWatts: 1440,
    poePerPort: 60,
    portGroups: [
      { type: 'rj45_poe_plus_plus', quantity: 24, speed: '1Gbps', prefix: 'Gi1/0/', startNumber: 1 },
      { type: 'sfp_plus', quantity: 4, speed: '10Gbps', prefix: 'Te1/0/', startNumber: 1 },
    ]
  },
  
  // SWITCHES POE - HPE ARUBA
  {
    id: 'hpe_aruba_2930f_24g_poe',
    manufacturer: 'HPE Aruba',
    model: '2930F-24G-PoE+-4SFP+',
    type: 'switch_poe',
    category: 'surveillance',
    poeBudgetWatts: 370,
    poePerPort: 30,
    portGroups: [
      { type: 'rj45_poe_plus', quantity: 24, speed: '1Gbps', prefix: 'Gi1/', startNumber: 1 },
      { type: 'sfp_plus', quantity: 4, speed: '10Gbps', prefix: 'Te1/', startNumber: 1 },
    ]
  },
  {
    id: 'hpe_aruba_2930f_48g_poe',
    manufacturer: 'HPE Aruba',
    model: '2930F-48G-PoE+-4SFP+',
    type: 'switch_poe',
    category: 'surveillance',
    poeBudgetWatts: 740,
    poePerPort: 30,
    portGroups: [
      { type: 'rj45_poe_plus', quantity: 48, speed: '1Gbps', prefix: 'Gi1/', startNumber: 1 },
      { type: 'sfp_plus', quantity: 4, speed: '10Gbps', prefix: 'Te1/', startNumber: 1 },
    ]
  },
  
  // SWITCHES POE - UBIQUITI
  {
    id: 'ubiquiti_usw_24_poe',
    manufacturer: 'Ubiquiti',
    model: 'UniFi Switch 24 PoE',
    type: 'switch_poe',
    category: 'surveillance',
    poeBudgetWatts: 250,
    poePerPort: 15.4,
    portGroups: [
      { type: 'rj45_poe', quantity: 24, speed: '1Gbps', prefix: 'Port', startNumber: 1 },
      { type: 'sfp', quantity: 2, speed: '1Gbps', prefix: 'SFP', startNumber: 1 },
    ]
  },
  {
    id: 'ubiquiti_usw_48_poe',
    manufacturer: 'Ubiquiti',
    model: 'UniFi Switch 48 PoE',
    type: 'switch_poe',
    category: 'surveillance',
    poeBudgetWatts: 500,
    poePerPort: 15.4,
    portGroups: [
      { type: 'rj45_poe', quantity: 48, speed: '1Gbps', prefix: 'Port', startNumber: 1 },
      { type: 'sfp_plus', quantity: 4, speed: '10Gbps', prefix: 'SFP+', startNumber: 1 },
    ]
  },
  {
    id: 'ubiquiti_usw_pro_24_poe',
    manufacturer: 'Ubiquiti',
    model: 'UniFi Switch Pro 24 PoE',
    type: 'switch_poe',
    category: 'surveillance',
    poeBudgetWatts: 400,
    poePerPort: 30,
    portGroups: [
      { type: 'rj45_poe_plus', quantity: 24, speed: '1Gbps', prefix: 'Port', startNumber: 1 },
      { type: 'sfp_plus', quantity: 2, speed: '10Gbps', prefix: 'SFP+', startNumber: 1 },
    ]
  },
  
  // SWITCHES POE - INTELBRAS
  {
    id: 'intelbras_sg2404_poe',
    manufacturer: 'Intelbras',
    model: 'SG 2404 PoE+',
    type: 'switch_poe',
    category: 'surveillance',
    poeBudgetWatts: 250,
    poePerPort: 30,
    portGroups: [
      { type: 'rj45_poe_plus', quantity: 24, speed: '1Gbps', prefix: 'Port', startNumber: 1 },
      { type: 'sfp', quantity: 4, speed: '1Gbps', prefix: 'SFP', startNumber: 1 },
    ]
  },
  
  // POE INJECTORS
  {
    id: 'ubiquiti_poe_24v',
    manufacturer: 'Ubiquiti',
    model: 'POE-24-12W',
    type: 'poe_injector',
    category: 'power',
    poeBudgetWatts: 12,
    poePerPort: 12,
    portGroups: [
      { type: 'rj45', quantity: 1, speed: '1Gbps', prefix: 'LAN', startNumber: 1 },
      { type: 'rj45_poe', quantity: 1, speed: '1Gbps', prefix: 'POE', startNumber: 1 },
    ]
  },
  {
    id: 'ubiquiti_poe_48v_30w',
    manufacturer: 'Ubiquiti',
    model: 'POE-48-30W',
    type: 'poe_injector',
    category: 'power',
    poeBudgetWatts: 30,
    poePerPort: 30,
    portGroups: [
      { type: 'rj45', quantity: 1, speed: '1Gbps', prefix: 'LAN', startNumber: 1 },
      { type: 'rj45_poe_plus', quantity: 1, speed: '1Gbps', prefix: 'POE', startNumber: 1 },
    ]
  },
  {
    id: 'intelbras_poe_200at',
    manufacturer: 'Intelbras',
    model: 'POE 200 AT',
    type: 'poe_injector',
    category: 'power',
    poeBudgetWatts: 30,
    poePerPort: 30,
    portGroups: [
      { type: 'rj45', quantity: 1, speed: '1Gbps', prefix: 'LAN', startNumber: 1 },
      { type: 'rj45_poe_plus', quantity: 1, speed: '1Gbps', prefix: 'POE', startNumber: 1 },
    ]
  },
  {
    id: 'tp_link_tl_poe160s',
    manufacturer: 'TP-Link',
    model: 'TL-POE160S',
    type: 'poe_injector',
    category: 'power',
    poeBudgetWatts: 30,
    poePerPort: 30,
    portGroups: [
      { type: 'rj45', quantity: 1, speed: '1Gbps', prefix: 'Data In', startNumber: 1 },
      { type: 'rj45_poe_plus', quantity: 1, speed: '1Gbps', prefix: 'PoE Out', startNumber: 1 },
    ]
  },
  
  // PDU INTELIGENTE - APC
  {
    id: 'apc_ap7922b',
    manufacturer: 'APC',
    model: 'Rack PDU Metered AP7922B',
    type: 'pdu_smart',
    category: 'power',
    portGroups: [
      { type: 'power_ac', quantity: 24, speed: '', prefix: 'Outlet', startNumber: 1 },
    ]
  },
  {
    id: 'apc_ap7932b',
    manufacturer: 'APC',
    model: 'Rack PDU Switched AP7932B',
    type: 'pdu_smart',
    category: 'power',
    portGroups: [
      { type: 'power_ac', quantity: 16, speed: '', prefix: 'Outlet', startNumber: 1 },
      { type: 'rj45', quantity: 1, speed: '100Mbps', prefix: 'Mgmt', startNumber: 1 },
    ]
  },
  
  // PDU INTELIGENTE - RARITAN
  {
    id: 'raritan_px3_5409',
    manufacturer: 'Raritan',
    model: 'Dominion PX3-5409',
    type: 'pdu_smart',
    category: 'power',
    portGroups: [
      { type: 'power_ac', quantity: 24, speed: '', prefix: 'Outlet', startNumber: 1 },
      { type: 'rj45', quantity: 1, speed: '1Gbps', prefix: 'Mgmt', startNumber: 1 },
      { type: 'sensor_io', quantity: 4, speed: '', prefix: 'Sensor', startNumber: 1 },
    ]
  },
  {
    id: 'raritan_px3_5663',
    manufacturer: 'Raritan',
    model: 'Dominion PX3-5663',
    type: 'pdu_smart',
    category: 'power',
    portGroups: [
      { type: 'power_ac', quantity: 36, speed: '', prefix: 'Outlet', startNumber: 1 },
      { type: 'rj45', quantity: 1, speed: '1Gbps', prefix: 'Mgmt', startNumber: 1 },
      { type: 'sensor_io', quantity: 6, speed: '', prefix: 'Sensor', startNumber: 1 },
    ]
  },
  
  // CÂMERAS IP
  {
    id: 'hikvision_ds2cd2143g2i',
    manufacturer: 'Hikvision',
    model: 'DS-2CD2143G2-I',
    type: 'ip_camera',
    category: 'surveillance',
    poePerPort: 12,
    portGroups: [
      { type: 'rj45_poe', quantity: 1, speed: '100Mbps', prefix: 'LAN', startNumber: 1 },
    ]
  },
  {
    id: 'hikvision_ds2cd2683g2izs',
    manufacturer: 'Hikvision',
    model: 'DS-2CD2683G2-IZS',
    type: 'ip_camera',
    category: 'surveillance',
    poePerPort: 18,
    portGroups: [
      { type: 'rj45_poe_plus', quantity: 1, speed: '100Mbps', prefix: 'LAN', startNumber: 1 },
    ]
  },
  {
    id: 'dahua_ipc_hdbw2831e',
    manufacturer: 'Dahua',
    model: 'IPC-HDBW2831E-S',
    type: 'ip_camera',
    category: 'surveillance',
    poePerPort: 10,
    portGroups: [
      { type: 'rj45_poe', quantity: 1, speed: '100Mbps', prefix: 'LAN', startNumber: 1 },
    ]
  },
  {
    id: 'intelbras_vip_5280_ia',
    manufacturer: 'Intelbras',
    model: 'VIP 5280 IA',
    type: 'ip_camera',
    category: 'surveillance',
    poePerPort: 12,
    portGroups: [
      { type: 'rj45_poe', quantity: 1, speed: '100Mbps', prefix: 'LAN', startNumber: 1 },
    ]
  },
  
  // MEDIA CONVERTERS
  {
    id: 'tp_link_mc220l',
    manufacturer: 'TP-Link',
    model: 'MC220L',
    type: 'media_converter',
    category: 'network',
    portGroups: [
      { type: 'rj45', quantity: 1, speed: '1Gbps', prefix: 'LAN', startNumber: 1 },
      { type: 'sfp', quantity: 1, speed: '1Gbps', prefix: 'SFP', startNumber: 1 },
    ]
  },
  {
    id: 'intelbras_kgm_1110',
    manufacturer: 'Intelbras',
    model: 'KGM 1110',
    type: 'media_converter',
    category: 'network',
    portGroups: [
      { type: 'rj45', quantity: 1, speed: '1Gbps', prefix: 'LAN', startNumber: 1 },
      { type: 'sfp', quantity: 1, speed: '1Gbps', prefix: 'SFP', startNumber: 1 },
    ]
  },
  {
    id: 'planet_gt_805a',
    manufacturer: 'Planet',
    model: 'GT-805A',
    type: 'media_converter',
    category: 'network',
    portGroups: [
      { type: 'rj45', quantity: 1, speed: '1Gbps', prefix: 'LAN', startNumber: 1 },
      { type: 'sfp', quantity: 1, speed: '1Gbps', prefix: 'SFP', startNumber: 1 },
    ]
  },
  
  // MEDIA CONVERTER CHASSIS
  {
    id: 'planet_mc_1500',
    manufacturer: 'Planet',
    model: 'MC-1500',
    type: 'media_converter_chassis',
    category: 'network',
    portGroups: [
      { type: 'sfp', quantity: 15, speed: '1Gbps', prefix: 'Slot', startNumber: 1 },
    ]
  },
  {
    id: 'tp_link_tl_mc1400',
    manufacturer: 'TP-Link',
    model: 'TL-MC1400',
    type: 'media_converter_chassis',
    category: 'network',
    portGroups: [
      { type: 'sfp', quantity: 14, speed: '1Gbps', prefix: 'Slot', startNumber: 1 },
    ]
  },
  
  // SENSORES AMBIENTAIS
  {
    id: 'apc_netbotz_250',
    manufacturer: 'APC',
    model: 'NetBotz 250',
    type: 'environment_sensor',
    category: 'environmental',
    portGroups: [
      { type: 'rj45', quantity: 1, speed: '100Mbps', prefix: 'Mgmt', startNumber: 1 },
      { type: 'sensor_io', quantity: 4, speed: '', prefix: 'Sensor', startNumber: 1 },
    ]
  },
  {
    id: 'raritan_emd',
    manufacturer: 'Raritan',
    model: 'EMD',
    type: 'environment_sensor',
    category: 'environmental',
    portGroups: [
      { type: 'sensor_io', quantity: 3, speed: '', prefix: 'Sensor', startNumber: 1 },
    ]
  },
  
  // RACK MONITORS
  {
    id: 'apc_netbotz_rack_monitor_200',
    manufacturer: 'APC',
    model: 'NetBotz Rack Monitor 200',
    type: 'rack_monitor',
    category: 'environmental',
    portGroups: [
      { type: 'rj45', quantity: 1, speed: '100Mbps', prefix: 'Mgmt', startNumber: 1 },
      { type: 'sensor_io', quantity: 6, speed: '', prefix: 'Sensor', startNumber: 1 },
    ]
  },
  
  // DSLAM
  {
    id: 'huawei_ma5616',
    manufacturer: 'Huawei',
    model: 'SmartAX MA5616',
    type: 'dslam',
    category: 'telecom',
    portGroups: [
      { type: 'rj45', quantity: 64, speed: 'VDSL2', prefix: 'Port', startNumber: 1 },
      { type: 'sfp', quantity: 2, speed: '1Gbps', prefix: 'Uplink', startNumber: 1 },
    ]
  },
  
  // MSAN
  {
    id: 'huawei_ma5800_x7',
    manufacturer: 'Huawei',
    model: 'SmartAX MA5800-X7',
    type: 'msan',
    category: 'telecom',
    portGroups: [
      { type: 'sfp_plus', quantity: 8, speed: '10Gbps', prefix: 'Uplink', startNumber: 1 },
      { type: 'sfp', quantity: 128, speed: 'GPON', prefix: 'PON', startNumber: 1 },
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
