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

          const { error: insertError } = await supabaseClient
            .from('alerts')
            .insert({
              type: 'rack_capacity',
              severity,
              status: 'active',
              title: `Rack ${rack.name} com alta ocupação`,
              message: `O rack ${rack.name} atingiu ${occupancyPercentage.toFixed(1)}% de ocupação (${occupiedUs}/${rack.size_u}U). Limite: ${threshold}%`,
              related_entity_id: rack.id,
              related_entity_type: 'rack',
              threshold_value: threshold,
              current_value: occupancyPercentage,
            });

          if (insertError) {
            console.error('Error creating alert:', insertError);
          } else {
            console.log('Alert created successfully');
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

          const { error: insertError } = await supabaseClient
            .from('alerts')
            .insert({
              type: 'port_capacity',
              severity,
              status: 'active',
              title: `Equipamento ${eq.name} com portas próximas do limite`,
              message: `O equipamento ${eq.name} está com ${usagePercentage.toFixed(1)}% das portas em uso (${inUsePorts}/${totalPorts}). Limite: ${threshold}%`,
              related_entity_id: eq.id,
              related_entity_type: 'equipment',
              threshold_value: threshold,
              current_value: usagePercentage,
            });

          if (insertError) {
            console.error('Error creating alert:', insertError);
          } else {
            console.log('Alert created successfully');
          }
        } else {
          console.log(`Alert already exists for equipment ${eq.name}`);
        }
      }
    }

    console.log('Capacity alert check completed successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Capacity alerts checked successfully' }),
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
