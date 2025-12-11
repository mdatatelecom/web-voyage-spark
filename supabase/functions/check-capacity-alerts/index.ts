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
    const createdAlerts: any[] = [];

    // Check rack occupancy
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
        // Check if alert already exists
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

          const alertData = {
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

    // Check port capacity
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

    console.log(`Checking ${equipment?.length || 0} equipment...`);

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

          const alertData = {
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

    // Check PoE capacity for PoE-enabled equipment
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
          // Check if alert already exists
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

            const alertData = {
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

    console.log(`Created/updated ${alertsCreated} alerts`);

    // Send email notifications for critical alerts
    const criticalAlerts = createdAlerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      console.log(`Sending email notifications for ${criticalAlerts.length} critical alerts`);
      
      // Get admin users with email notifications enabled
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
            const { data: settings } = await supabaseClient
              .from('notification_settings')
              .select('*')
              .eq('user_id', admin.id)
              .single();

            // Send if settings allow or if no settings (default to send)
            const shouldSend = !settings || 
              (settings.email_enabled && settings.alert_critical);

            if (shouldSend) {
              // Get admin email
              const { data: { user } } = await supabaseClient.auth.admin.getUserById(admin.id);
              
              if (user?.email) {
                const targetEmail = settings?.email_address || user.email;
                
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
          }
        }
      }
    }

    console.log('Capacity alert check completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        alertsCreated,
        message: `Capacity check completed. ${alertsCreated} alerts created/updated.`
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
