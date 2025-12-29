import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertSettings {
  rack_warning_threshold: number;
  rack_critical_threshold: number;
  port_warning_threshold: number;
  port_critical_threshold: number;
  poe_warning_threshold: number;
  poe_critical_threshold: number;
  nvr_warning_threshold: number;
  nvr_critical_threshold: number;
  camera_orphan_alert_enabled: number;
  connection_faulty_alert_enabled: number;
  testing_max_days: number;
  equipment_no_ip_alert_enabled: number;
}

interface AlertData {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  status: string;
  title: string;
  message: string;
  related_entity_id: string;
  related_entity_type: string;
  threshold_value?: number;
  current_value?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting capacity alert check...');

    // Get alert settings
    const { data: settingsData, error: settingsError } = await supabaseClient
      .from('alert_settings')
      .select('setting_key, setting_value');

    if (settingsError) {
      console.error('Error fetching alert settings:', settingsError);
      throw settingsError;
    }

    const settings = settingsData.reduce((acc, item) => {
      acc[item.setting_key] = item.setting_value;
      return acc;
    }, {} as any) as AlertSettings;

    console.log('Alert settings:', settings);

    let alertsCreated = 0;
    const createdAlerts: AlertData[] = [];

    // =============== CHECK RACK OCCUPANCY ===============
    const { data: racks, error: racksError } = await supabaseClient
      .from('racks')
      .select(`
        id,
        name,
        size_u,
        equipment(position_u_start, position_u_end)
      `);

    if (racksError) {
      console.error('Error fetching racks:', racksError);
      throw racksError;
    }

    console.log(`Checking ${racks?.length || 0} racks...`);

    for (const rack of racks || []) {
      const occupiedUs = rack.equipment?.reduce((total: number, eq: any) => {
        return total + (eq.position_u_end - eq.position_u_start + 1);
      }, 0) || 0;

      const occupancyPercentage = (occupiedUs / rack.size_u) * 100;

      console.log(`Rack ${rack.name}: ${occupancyPercentage.toFixed(1)}% occupied`);

      let severity: 'warning' | 'critical' | null = null;
      let threshold = 0;

      if (occupancyPercentage >= settings.rack_critical_threshold) {
        severity = 'critical';
        threshold = settings.rack_critical_threshold;
      } else if (occupancyPercentage >= settings.rack_warning_threshold) {
        severity = 'warning';
        threshold = settings.rack_warning_threshold;
      }

      if (severity) {
        const { data: existingAlert } = await supabaseClient
          .from('alerts')
          .select('id')
          .eq('related_entity_id', rack.id)
          .eq('related_entity_type', 'rack')
          .eq('type', 'rack_capacity')
          .eq('status', 'active')
          .single();

        if (!existingAlert) {
          console.log(`Creating ${severity} alert for rack ${rack.name}`);

          const alertData: AlertData = {
            type: 'rack_capacity',
            severity,
            status: 'active',
            title: `Rack ${rack.name} com alta ocupação`,
            message: `O rack ${rack.name} atingiu ${occupancyPercentage.toFixed(1)}% de ocupação (${occupiedUs}/${rack.size_u}U). Limite: ${threshold}%`,
            related_entity_id: rack.id,
            related_entity_type: 'rack',
            threshold_value: threshold,
            current_value: occupancyPercentage,
          };

          const { error: insertError } = await supabaseClient
            .from('alerts')
            .insert(alertData);

          if (insertError) {
            console.error('Error creating alert:', insertError);
          } else {
            console.log('Alert created successfully');
            alertsCreated++;
            createdAlerts.push(alertData);
          }
        } else {
          console.log(`Alert already exists for rack ${rack.name}`);
        }
      }
    }

    // =============== CHECK PORT CAPACITY ===============
    const { data: equipment, error: equipmentError } = await supabaseClient
      .from('equipment')
      .select(`
        id,
        name,
        ports(id, status)
      `);

    if (equipmentError) {
      console.error('Error fetching equipment:', equipmentError);
      throw equipmentError;
    }

    console.log(`Checking ${equipment?.length || 0} equipment for port capacity...`);

    for (const eq of equipment || []) {
      const totalPorts = eq.ports?.length || 0;
      if (totalPorts === 0) continue;

      const inUsePorts = eq.ports?.filter((p: any) => p.status === 'in_use').length || 0;
      const usagePercentage = (inUsePorts / totalPorts) * 100;

      console.log(`Equipment ${eq.name}: ${usagePercentage.toFixed(1)}% ports in use`);

      let severity: 'warning' | 'critical' | null = null;
      let threshold = 0;

      if (usagePercentage >= settings.port_critical_threshold) {
        severity = 'critical';
        threshold = settings.port_critical_threshold;
      } else if (usagePercentage >= settings.port_warning_threshold) {
        severity = 'warning';
        threshold = settings.port_warning_threshold;
      }

      if (severity) {
        const { data: existingAlert } = await supabaseClient
          .from('alerts')
          .select('id')
          .eq('related_entity_id', eq.id)
          .eq('related_entity_type', 'equipment')
          .eq('type', 'port_capacity')
          .eq('status', 'active')
          .single();

        if (!existingAlert) {
          console.log(`Creating ${severity} alert for equipment ${eq.name}`);

          const alertData: AlertData = {
            type: 'port_capacity',
            severity,
            status: 'active',
            title: `Equipamento ${eq.name} com portas próximas do limite`,
            message: `O equipamento ${eq.name} está com ${usagePercentage.toFixed(1)}% das portas em uso (${inUsePorts}/${totalPorts}). Limite: ${threshold}%`,
            related_entity_id: eq.id,
            related_entity_type: 'equipment',
            threshold_value: threshold,
            current_value: usagePercentage,
          };

          const { error: insertError } = await supabaseClient
            .from('alerts')
            .insert(alertData);

          if (insertError) {
            console.error('Error creating alert:', insertError);
          } else {
            console.log('Alert created successfully');
            alertsCreated++;
            createdAlerts.push(alertData);
          }
        } else {
          console.log(`Alert already exists for equipment ${eq.name}`);
        }
      }
    }

    // =============== CHECK POE CAPACITY ===============
    console.log('Checking PoE capacity...');
    
    const { data: poeEquipment, error: poeError } = await supabaseClient
      .from('equipment')
      .select(`
        id,
        name,
        poe_budget_watts,
        poe_power_per_port
      `)
      .not('poe_budget_watts', 'is', null)
      .gt('poe_budget_watts', 0);

    if (poeError) {
      console.error('Error fetching PoE equipment:', poeError);
    } else {
      console.log(`Checking ${poeEquipment?.length || 0} PoE-enabled equipment...`);

      for (const eq of poeEquipment || []) {
        const powerPerPort = eq.poe_power_per_port as Record<string, number> || {};
        const usedWatts = Object.values(powerPerPort).reduce((sum: number, watts: number) => sum + (watts || 0), 0);
        const usagePercentage = (usedWatts / eq.poe_budget_watts) * 100;

        console.log(`Equipment ${eq.name}: ${usagePercentage.toFixed(1)}% PoE used (${usedWatts}W/${eq.poe_budget_watts}W)`);

        let severity: 'warning' | 'critical' | null = null;
        let threshold = 0;

        if (usagePercentage >= (settings.poe_critical_threshold || 90)) {
          severity = 'critical';
          threshold = settings.poe_critical_threshold || 90;
        } else if (usagePercentage >= (settings.poe_warning_threshold || 80)) {
          severity = 'warning';
          threshold = settings.poe_warning_threshold || 80;
        }

        if (severity) {
          const { data: existingAlert } = await supabaseClient
            .from('alerts')
            .select('id')
            .eq('related_entity_id', eq.id)
            .eq('related_entity_type', 'equipment')
            .eq('type', 'poe_capacity')
            .eq('status', 'active')
            .maybeSingle();

          if (!existingAlert) {
            console.log(`Creating ${severity} PoE alert for equipment ${eq.name}`);

            const alertData: AlertData = {
              type: 'poe_capacity',
              severity,
              status: 'active',
              title: `PoE Budget alto em ${eq.name}`,
              message: `O equipamento ${eq.name} está usando ${usagePercentage.toFixed(1)}% do budget PoE (${usedWatts}W/${eq.poe_budget_watts}W). Limite: ${threshold}%`,
              related_entity_id: eq.id,
              related_entity_type: 'equipment',
              threshold_value: threshold,
              current_value: usagePercentage,
            };

            const { error: insertError } = await supabaseClient
              .from('alerts')
              .insert(alertData);

            if (insertError) {
              console.error('Error creating PoE alert:', insertError);
            } else {
              console.log('PoE alert created successfully');
              alertsCreated++;
              createdAlerts.push(alertData);
            }
          } else {
            console.log(`PoE alert already exists for equipment ${eq.name}`);
          }
        }
      }
    }

    // =============== CHECK NVR/DVR CHANNEL CAPACITY ===============
    console.log('Checking NVR/DVR channel capacity...');
    
    const { data: nvrDvrEquipment, error: nvrError } = await supabaseClient
      .from('equipment')
      .select(`
        id,
        name,
        type,
        ports(id, status, port_type)
      `)
      .in('type', ['nvr', 'dvr']);

    if (nvrError) {
      console.error('Error fetching NVR/DVR equipment:', nvrError);
    } else {
      console.log(`Checking ${nvrDvrEquipment?.length || 0} NVR/DVR equipment...`);

      for (const nvr of nvrDvrEquipment || []) {
        // For NVR/DVR, count video input ports (BNC for DVR, RJ45/other for NVR)
        const totalChannels = nvr.ports?.length || 0;
        if (totalChannels === 0) continue;

        const usedChannels = nvr.ports?.filter((p: any) => p.status === 'in_use').length || 0;
        const usagePercentage = (usedChannels / totalChannels) * 100;

        console.log(`NVR/DVR ${nvr.name}: ${usagePercentage.toFixed(1)}% channels in use (${usedChannels}/${totalChannels})`);

        let severity: 'warning' | 'critical' | null = null;
        let threshold = 0;

        if (usagePercentage >= (settings.nvr_critical_threshold || 100)) {
          severity = 'critical';
          threshold = settings.nvr_critical_threshold || 100;
        } else if (usagePercentage >= (settings.nvr_warning_threshold || 80)) {
          severity = 'warning';
          threshold = settings.nvr_warning_threshold || 80;
        }

        if (severity) {
          const { data: existingAlert } = await supabaseClient
            .from('alerts')
            .select('id')
            .eq('related_entity_id', nvr.id)
            .eq('related_entity_type', 'equipment')
            .eq('type', 'nvr_full')
            .eq('status', 'active')
            .maybeSingle();

          if (!existingAlert) {
            console.log(`Creating ${severity} NVR alert for ${nvr.name}`);

            const alertData: AlertData = {
              type: 'nvr_full',
              severity,
              status: 'active',
              title: `${nvr.type.toUpperCase()} ${nvr.name} com canais próximos do limite`,
              message: `O ${nvr.type.toUpperCase()} ${nvr.name} está com ${usagePercentage.toFixed(1)}% dos canais em uso (${usedChannels}/${totalChannels}). Limite: ${threshold}%`,
              related_entity_id: nvr.id,
              related_entity_type: 'equipment',
              threshold_value: threshold,
              current_value: usagePercentage,
            };

            const { error: insertError } = await supabaseClient
              .from('alerts')
              .insert(alertData);

            if (insertError) {
              console.error('Error creating NVR alert:', insertError);
            } else {
              console.log('NVR alert created successfully');
              alertsCreated++;
              createdAlerts.push(alertData);
            }
          }
        }
      }
    }

    // =============== CHECK CAMERAS WITHOUT NVR ===============
    if (settings.camera_orphan_alert_enabled === 1) {
      console.log('Checking for cameras without NVR connection...');

      // Get all IP cameras
      const { data: cameras, error: camerasError } = await supabaseClient
        .from('equipment')
        .select('id, name')
        .eq('type', 'ip_camera');

      if (camerasError) {
        console.error('Error fetching cameras:', camerasError);
      } else {
        console.log(`Found ${cameras?.length || 0} IP cameras`);

        // Get all NVR/DVR IDs
        const { data: nvrDvrIds } = await supabaseClient
          .from('equipment')
          .select('id')
          .in('type', ['nvr', 'dvr']);

        const nvrDvrIdSet = new Set((nvrDvrIds || []).map(e => e.id));

        for (const camera of cameras || []) {
          // Check if camera has any connection to NVR/DVR
          const { data: cameraConnections } = await supabaseClient
            .from('connections')
            .select(`
              port_a:ports!connections_port_a_id_fkey(equipment_id),
              port_b:ports!connections_port_b_id_fkey(equipment_id)
            `)
            .or(`port_a_id.eq.${camera.id},port_b_id.eq.${camera.id}`)
            .eq('status', 'active');

          // Check camera's ports for connections
          const { data: cameraPorts } = await supabaseClient
            .from('ports')
            .select('id')
            .eq('equipment_id', camera.id);

          const cameraPortIds = (cameraPorts || []).map(p => p.id);
          
          let hasNvrConnection = false;
          
          if (cameraPortIds.length > 0) {
            const { data: portConnections } = await supabaseClient
              .from('connections')
              .select(`
                port_a:ports!connections_port_a_id_fkey(equipment_id),
                port_b:ports!connections_port_b_id_fkey(equipment_id)
              `)
              .or(`port_a_id.in.(${cameraPortIds.join(',')}),port_b_id.in.(${cameraPortIds.join(',')})`)
              .eq('status', 'active');

            for (const conn of portConnections || []) {
              const portAEquipId = (conn.port_a as any)?.equipment_id;
              const portBEquipId = (conn.port_b as any)?.equipment_id;
              
              if (nvrDvrIdSet.has(portAEquipId) || nvrDvrIdSet.has(portBEquipId)) {
                hasNvrConnection = true;
                break;
              }
            }
          }

          if (!hasNvrConnection) {
            // Check if alert already exists
            const { data: existingAlert } = await supabaseClient
              .from('alerts')
              .select('id')
              .eq('related_entity_id', camera.id)
              .eq('related_entity_type', 'equipment')
              .eq('type', 'camera_unassigned')
              .eq('status', 'active')
              .maybeSingle();

            if (!existingAlert) {
              console.log(`Creating camera orphan alert for ${camera.name}`);

              const alertData: AlertData = {
                type: 'camera_unassigned',
                severity: 'warning',
                status: 'active',
                title: `Câmera ${camera.name} sem NVR/DVR`,
                message: `A câmera IP ${camera.name} não está conectada a nenhum NVR ou DVR. Verifique a configuração.`,
                related_entity_id: camera.id,
                related_entity_type: 'equipment',
              };

              const { error: insertError } = await supabaseClient
                .from('alerts')
                .insert(alertData);

              if (insertError) {
                console.error('Error creating camera orphan alert:', insertError);
              } else {
                console.log('Camera orphan alert created successfully');
                alertsCreated++;
                createdAlerts.push(alertData);
              }
            }
          }
        }
      }
    }

    // =============== CHECK FAULTY CONNECTIONS ===============
    if (settings.connection_faulty_alert_enabled === 1) {
      console.log('Checking for faulty connections...');

      const { data: faultyConnections, error: faultyError } = await supabaseClient
        .from('connections')
        .select(`
          id,
          connection_code,
          port_a:ports!connections_port_a_id_fkey(equipment:equipment(name)),
          port_b:ports!connections_port_b_id_fkey(equipment:equipment(name))
        `)
        .eq('status', 'faulty');

      if (faultyError) {
        console.error('Error fetching faulty connections:', faultyError);
      } else {
        console.log(`Found ${faultyConnections?.length || 0} faulty connections`);

        for (const conn of faultyConnections || []) {
          const { data: existingAlert } = await supabaseClient
            .from('alerts')
            .select('id')
            .eq('related_entity_id', conn.id)
            .eq('related_entity_type', 'connection')
            .eq('type', 'connection_faulty')
            .eq('status', 'active')
            .maybeSingle();

          if (!existingAlert) {
            const eqAName = (conn.port_a as any)?.equipment?.name || 'Desconhecido';
            const eqBName = (conn.port_b as any)?.equipment?.name || 'Desconhecido';

            console.log(`Creating faulty connection alert for ${conn.connection_code}`);

            const alertData: AlertData = {
              type: 'connection_faulty',
              severity: 'critical',
              status: 'active',
              title: `Conexão ${conn.connection_code} com defeito`,
              message: `A conexão ${conn.connection_code} entre ${eqAName} e ${eqBName} está marcada como defeituosa. Requer manutenção.`,
              related_entity_id: conn.id,
              related_entity_type: 'connection',
            };

            const { error: insertError } = await supabaseClient
              .from('alerts')
              .insert(alertData);

            if (insertError) {
              console.error('Error creating faulty connection alert:', insertError);
            } else {
              console.log('Faulty connection alert created successfully');
              alertsCreated++;
              createdAlerts.push(alertData);
            }
          }
        }
      }
    }

    // =============== CHECK STALE TESTING CONNECTIONS ===============
    const testingMaxDays = settings.testing_max_days || 7;
    console.log(`Checking for connections in testing status > ${testingMaxDays} days...`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - testingMaxDays);

    const { data: staleTestingConnections, error: staleError } = await supabaseClient
      .from('connections')
      .select(`
        id,
        connection_code,
        updated_at,
        port_a:ports!connections_port_a_id_fkey(equipment:equipment(name)),
        port_b:ports!connections_port_b_id_fkey(equipment:equipment(name))
      `)
      .eq('status', 'testing')
      .lt('updated_at', cutoffDate.toISOString());

    if (staleError) {
      console.error('Error fetching stale testing connections:', staleError);
    } else {
      console.log(`Found ${staleTestingConnections?.length || 0} stale testing connections`);

      for (const conn of staleTestingConnections || []) {
        const { data: existingAlert } = await supabaseClient
          .from('alerts')
          .select('id')
          .eq('related_entity_id', conn.id)
          .eq('related_entity_type', 'connection')
          .eq('type', 'connection_stale_testing')
          .eq('status', 'active')
          .maybeSingle();

        if (!existingAlert) {
          const eqAName = (conn.port_a as any)?.equipment?.name || 'Desconhecido';
          const eqBName = (conn.port_b as any)?.equipment?.name || 'Desconhecido';
          const daysSinceTesting = Math.floor((Date.now() - new Date(conn.updated_at).getTime()) / (1000 * 60 * 60 * 24));

          console.log(`Creating stale testing alert for ${conn.connection_code}`);

          const alertData: AlertData = {
            type: 'connection_stale_testing',
            severity: 'warning',
            status: 'active',
            title: `Conexão ${conn.connection_code} em testing há ${daysSinceTesting} dias`,
            message: `A conexão ${conn.connection_code} entre ${eqAName} e ${eqBName} está em status "testing" há ${daysSinceTesting} dias. Considere ativá-la ou removê-la.`,
            related_entity_id: conn.id,
            related_entity_type: 'connection',
            current_value: daysSinceTesting,
            threshold_value: testingMaxDays,
          };

          const { error: insertError } = await supabaseClient
            .from('alerts')
            .insert(alertData);

          if (insertError) {
            console.error('Error creating stale testing alert:', insertError);
          } else {
            console.log('Stale testing alert created successfully');
            alertsCreated++;
            createdAlerts.push(alertData);
          }
        }
      }
    }

    // =============== CHECK NETWORK EQUIPMENT WITHOUT IP ===============
    if (settings.equipment_no_ip_alert_enabled === 1) {
      console.log('Checking for network equipment without IP address...');

      const networkEquipmentTypes = ['switch', 'switch_poe', 'router', 'firewall', 'server', 'nvr', 'dvr', 'access_point', 'ip_camera'];

      const { data: noIpEquipment, error: noIpError } = await supabaseClient
        .from('equipment')
        .select('id, name, type')
        .in('type', networkEquipmentTypes)
        .or('ip_address.is.null,ip_address.eq.');

      if (noIpError) {
        console.error('Error fetching equipment without IP:', noIpError);
      } else {
        console.log(`Found ${noIpEquipment?.length || 0} network equipment without IP`);

        for (const eq of noIpEquipment || []) {
          const { data: existingAlert } = await supabaseClient
            .from('alerts')
            .select('id')
            .eq('related_entity_id', eq.id)
            .eq('related_entity_type', 'equipment')
            .eq('type', 'equipment_no_ip')
            .eq('status', 'active')
            .maybeSingle();

          if (!existingAlert) {
            console.log(`Creating no IP alert for ${eq.name}`);

            const alertData: AlertData = {
              type: 'equipment_no_ip',
              severity: 'info',
              status: 'active',
              title: `Equipamento ${eq.name} sem endereço IP`,
              message: `O equipamento ${eq.name} (${eq.type}) não possui endereço IP configurado. Isso pode dificultar o gerenciamento remoto.`,
              related_entity_id: eq.id,
              related_entity_type: 'equipment',
            };

            const { error: insertError } = await supabaseClient
              .from('alerts')
              .insert(alertData);

            if (insertError) {
              console.error('Error creating no IP alert:', insertError);
            } else {
              console.log('No IP alert created successfully');
              alertsCreated++;
              createdAlerts.push(alertData);
            }
          }
        }
      }
    }

    console.log(`Created ${alertsCreated} alerts total`);

    // =============== SEND NOTIFICATIONS ===============
    const criticalAlerts = createdAlerts.filter(a => a.severity === 'critical');
    const warningAlerts = createdAlerts.filter(a => a.severity === 'warning');
    
    if (criticalAlerts.length > 0 || warningAlerts.length > 0) {
      console.log(`Sending notifications for ${criticalAlerts.length} critical and ${warningAlerts.length} warning alerts`);
      
      // Get admin users with notifications enabled
      const { data: adminRoles } = await supabaseClient
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminRoles && adminRoles.length > 0) {
        const adminIds = adminRoles.map(r => r.user_id);
        
        // Get admin profiles
        const { data: admins } = await supabaseClient
          .from('profiles')
          .select('id')
          .in('id', adminIds);

        if (admins) {
          for (const admin of admins) {
            // Check notification settings
            const { data: notifSettings } = await supabaseClient
              .from('notification_settings')
              .select('*')
              .eq('user_id', admin.id)
              .single();

            // Email notifications
            const shouldSendEmail = !notifSettings || 
              (notifSettings.email_enabled && notifSettings.alert_critical);

            if (shouldSendEmail && criticalAlerts.length > 0) {
              // Get admin email
              const { data: { user } } = await supabaseClient.auth.admin.getUserById(admin.id);
              
              if (user?.email) {
                const targetEmail = notifSettings?.email_address || user.email;
                
                // Send email for each critical alert
                for (const alert of criticalAlerts) {
                  try {
                    await supabaseClient.functions.invoke('send-alert-email', {
                      body: {
                        email: targetEmail,
                        alert: {
                          title: alert.title,
                          message: alert.message,
                          severity: alert.severity,
                          type: alert.type,
                          related_entity_type: alert.related_entity_type,
                          related_entity_id: alert.related_entity_id,
                        },
                      },
                    });
                    console.log(`Email sent to ${targetEmail} for alert ${alert.title}`);
                  } catch (emailError) {
                    console.error(`Failed to send email to ${targetEmail}:`, emailError);
                  }
                }
              }
            }

            // WhatsApp notifications
            const whatsappEnabled = (notifSettings as any)?.whatsapp_enabled ?? false;
            const whatsappPhone = (notifSettings as any)?.whatsapp_phone;
            const whatsappAlertCritical = (notifSettings as any)?.whatsapp_alert_critical ?? true;
            const whatsappAlertWarning = (notifSettings as any)?.whatsapp_alert_warning ?? false;

            if (whatsappEnabled && whatsappPhone) {
              // Send WhatsApp for critical alerts
              if (whatsappAlertCritical && criticalAlerts.length > 0) {
                for (const alert of criticalAlerts) {
                  try {
                    const message = `🚨 *ALERTA CRÍTICO*\n\n` +
                      `*${alert.title}*\n\n` +
                      `${alert.message}\n\n` +
                      `Acesse o sistema para mais detalhes.`;

                    await supabaseClient.functions.invoke('send-whatsapp', {
                      body: {
                        action: 'send',
                        phone: whatsappPhone,
                        message,
                      },
                    });
                    console.log(`WhatsApp sent to ${whatsappPhone} for critical alert: ${alert.title}`);
                  } catch (whatsappError) {
                    console.error(`Failed to send WhatsApp to ${whatsappPhone}:`, whatsappError);
                  }
                }
              }

              // Send WhatsApp for warning alerts
              if (whatsappAlertWarning && warningAlerts.length > 0) {
                for (const alert of warningAlerts) {
                  try {
                    const message = `⚠️ *ALERTA DE AVISO*\n\n` +
                      `*${alert.title}*\n\n` +
                      `${alert.message}\n\n` +
                      `Acesse o sistema para mais detalhes.`;

                    await supabaseClient.functions.invoke('send-whatsapp', {
                      body: {
                        action: 'send',
                        phone: whatsappPhone,
                        message,
                      },
                    });
                    console.log(`WhatsApp sent to ${whatsappPhone} for warning alert: ${alert.title}`);
                  } catch (whatsappError) {
                    console.error(`Failed to send WhatsApp to ${whatsappPhone}:`, whatsappError);
                  }
                }
              }
            }
          }
        }
      }
    }

    console.log('Capacity alert check completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        alertsCreated,
        message: `Capacity check completed. ${alertsCreated} alerts created.`,
        summary: {
          critical: criticalAlerts.length,
          warning: warningAlerts.length,
          info: createdAlerts.filter(a => a.severity === 'info').length,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-capacity-alerts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
