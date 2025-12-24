import { pool } from '../config/database';
import { emailService } from './email.service';
import { whatsAppService } from './whatsapp.service';

interface AlertSettings {
  rack_warning_threshold: number;
  rack_critical_threshold: number;
  port_warning_threshold: number;
  port_critical_threshold: number;
  poe_warning_threshold: number;
  poe_critical_threshold: number;
}

interface AlertData {
  type: string;
  severity: 'warning' | 'critical';
  status: string;
  title: string;
  message: string;
  related_entity_id: string;
  related_entity_type: string;
  threshold_value: number;
  current_value: number;
}

export class AlertService {
  // Get alert settings
  async getSettings(): Promise<AlertSettings> {
    const result = await pool.query(`SELECT setting_key, setting_value FROM alert_settings`);
    
    return result.rows.reduce((acc, item) => {
      acc[item.setting_key as keyof AlertSettings] = item.setting_value;
      return acc;
    }, {
      rack_warning_threshold: 80,
      rack_critical_threshold: 90,
      port_warning_threshold: 80,
      port_critical_threshold: 90,
      poe_warning_threshold: 80,
      poe_critical_threshold: 90,
    } as AlertSettings);
  }

  // Check rack capacity
  async checkRackCapacity(settings: AlertSettings): Promise<AlertData[]> {
    const alerts: AlertData[] = [];

    const racksResult = await pool.query(`
      SELECT r.id, r.name, r.size_u,
             COALESCE(SUM(e.position_u_end - e.position_u_start + 1), 0) as occupied_u
      FROM racks r
      LEFT JOIN equipment e ON e.rack_id = r.id
      GROUP BY r.id, r.name, r.size_u
    `);

    for (const rack of racksResult.rows) {
      const occupancyPercentage = (rack.occupied_u / rack.size_u) * 100;
      
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
        const existingResult = await pool.query(
          `SELECT id FROM alerts 
           WHERE related_entity_id = $1 
           AND related_entity_type = 'rack' 
           AND type = 'rack_capacity' 
           AND status = 'active'`,
          [rack.id]
        );

        if (existingResult.rows.length === 0) {
          alerts.push({
            type: 'rack_capacity',
            severity,
            status: 'active',
            title: `Rack ${rack.name} com alta ocupação`,
            message: `O rack ${rack.name} atingiu ${occupancyPercentage.toFixed(1)}% de ocupação (${rack.occupied_u}/${rack.size_u}U). Limite: ${threshold}%`,
            related_entity_id: rack.id,
            related_entity_type: 'rack',
            threshold_value: threshold,
            current_value: occupancyPercentage,
          });
        }
      }
    }

    return alerts;
  }

  // Check port capacity
  async checkPortCapacity(settings: AlertSettings): Promise<AlertData[]> {
    const alerts: AlertData[] = [];

    const equipmentResult = await pool.query(`
      SELECT e.id, e.name,
             COUNT(p.id) as total_ports,
             COUNT(CASE WHEN p.status = 'in_use' THEN 1 END) as in_use_ports
      FROM equipment e
      LEFT JOIN ports p ON p.equipment_id = e.id
      GROUP BY e.id, e.name
      HAVING COUNT(p.id) > 0
    `);

    for (const eq of equipmentResult.rows) {
      const usagePercentage = (eq.in_use_ports / eq.total_ports) * 100;
      
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
        const existingResult = await pool.query(
          `SELECT id FROM alerts 
           WHERE related_entity_id = $1 
           AND related_entity_type = 'equipment' 
           AND type = 'port_capacity' 
           AND status = 'active'`,
          [eq.id]
        );

        if (existingResult.rows.length === 0) {
          alerts.push({
            type: 'port_capacity',
            severity,
            status: 'active',
            title: `Equipamento ${eq.name} com portas próximas do limite`,
            message: `O equipamento ${eq.name} está com ${usagePercentage.toFixed(1)}% das portas em uso (${eq.in_use_ports}/${eq.total_ports}). Limite: ${threshold}%`,
            related_entity_id: eq.id,
            related_entity_type: 'equipment',
            threshold_value: threshold,
            current_value: usagePercentage,
          });
        }
      }
    }

    return alerts;
  }

  // Check PoE capacity
  async checkPoECapacity(settings: AlertSettings): Promise<AlertData[]> {
    const alerts: AlertData[] = [];

    const poeResult = await pool.query(`
      SELECT id, name, poe_budget_watts, poe_power_per_port
      FROM equipment
      WHERE poe_budget_watts IS NOT NULL AND poe_budget_watts > 0
    `);

    for (const eq of poeResult.rows) {
      const powerPerPort = eq.poe_power_per_port || {};
      const usedWatts = Object.values(powerPerPort as Record<string, number>).reduce((sum, watts) => sum + (watts || 0), 0);
      const usagePercentage = (usedWatts / eq.poe_budget_watts) * 100;

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
        const existingResult = await pool.query(
          `SELECT id FROM alerts 
           WHERE related_entity_id = $1 
           AND related_entity_type = 'equipment' 
           AND type = 'poe_capacity' 
           AND status = 'active'`,
          [eq.id]
        );

        if (existingResult.rows.length === 0) {
          alerts.push({
            type: 'poe_capacity',
            severity,
            status: 'active',
            title: `PoE Budget alto em ${eq.name}`,
            message: `O equipamento ${eq.name} está usando ${usagePercentage.toFixed(1)}% do budget PoE (${usedWatts}W/${eq.poe_budget_watts}W). Limite: ${threshold}%`,
            related_entity_id: eq.id,
            related_entity_type: 'equipment',
            threshold_value: threshold,
            current_value: usagePercentage,
          });
        }
      }
    }

    return alerts;
  }

  // Create alert in database
  async createAlert(alert: AlertData): Promise<string | null> {
    try {
      const result = await pool.query(
        `INSERT INTO alerts (type, severity, status, title, message, related_entity_id, related_entity_type, threshold_value, current_value)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [alert.type, alert.severity, alert.status, alert.title, alert.message, alert.related_entity_id, alert.related_entity_type, alert.threshold_value, alert.current_value]
      );
      return result.rows[0].id;
    } catch (error) {
      console.error('Error creating alert:', error);
      return null;
    }
  }

  // Send notifications
  async sendNotifications(alerts: AlertData[]): Promise<void> {
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    const warningAlerts = alerts.filter(a => a.severity === 'warning');

    if (criticalAlerts.length === 0 && warningAlerts.length === 0) {
      return;
    }

    // Get admin users with notifications enabled
    const adminResult = await pool.query(`
      SELECT ur.user_id, p.id as profile_id
      FROM user_roles ur
      JOIN profiles p ON p.id = ur.user_id
      WHERE ur.role = 'admin'
    `);

    for (const admin of adminResult.rows) {
      // Get notification settings
      const settingsResult = await pool.query(
        `SELECT * FROM notification_settings WHERE user_id = $1`,
        [admin.user_id]
      );

      const notifSettings = settingsResult.rows[0] || {
        email_enabled: true,
        alert_critical: true,
        whatsapp_enabled: false,
        whatsapp_alert_critical: true,
        whatsapp_alert_warning: false
      };

      // Get user email
      const userResult = await pool.query(`SELECT email FROM users WHERE id = $1`, [admin.user_id]);
      const userEmail = userResult.rows[0]?.email;

      // Email notifications for critical alerts
      if (notifSettings.email_enabled && notifSettings.alert_critical && userEmail && criticalAlerts.length > 0) {
        const targetEmail = notifSettings.email_address || userEmail;
        
        for (const alert of criticalAlerts) {
          try {
            await emailService.sendAlertEmail(targetEmail, {
              title: alert.title,
              message: alert.message,
              severity: alert.severity,
              type: alert.type,
              related_entity_type: alert.related_entity_type,
              related_entity_id: alert.related_entity_id,
            });
            console.log(`Email sent to ${targetEmail} for alert ${alert.title}`);
          } catch (error) {
            console.error(`Failed to send email to ${targetEmail}:`, error);
          }
        }
      }

      // WhatsApp notifications
      const whatsappEnabled = notifSettings.whatsapp_enabled;
      const whatsappPhone = notifSettings.whatsapp_phone;

      if (whatsappEnabled && whatsappPhone) {
        // Critical alerts via WhatsApp
        if (notifSettings.whatsapp_alert_critical && criticalAlerts.length > 0) {
          for (const alert of criticalAlerts) {
            try {
              const message = `🚨 *ALERTA CRÍTICO*\n\n` +
                `*${alert.title}*\n\n` +
                `${alert.message}\n\n` +
                `Acesse o sistema para mais detalhes.`;

              await whatsAppService.sendMessage(whatsappPhone, message);
              console.log(`WhatsApp sent to ${whatsappPhone} for critical alert: ${alert.title}`);
            } catch (error) {
              console.error(`Failed to send WhatsApp to ${whatsappPhone}:`, error);
            }
          }
        }

        // Warning alerts via WhatsApp
        if (notifSettings.whatsapp_alert_warning && warningAlerts.length > 0) {
          for (const alert of warningAlerts) {
            try {
              const message = `⚠️ *ALERTA DE AVISO*\n\n` +
                `*${alert.title}*\n\n` +
                `${alert.message}\n\n` +
                `Acesse o sistema para mais detalhes.`;

              await whatsAppService.sendMessage(whatsappPhone, message);
              console.log(`WhatsApp sent to ${whatsappPhone} for warning alert: ${alert.title}`);
            } catch (error) {
              console.error(`Failed to send WhatsApp to ${whatsappPhone}:`, error);
            }
          }
        }
      }
    }
  }

  // Run full capacity check (called by cron job)
  async runCapacityCheck(): Promise<{ success: boolean; alertsCreated: number; message: string }> {
    console.log('Starting capacity alert check...');

    try {
      const settings = await this.getSettings();
      console.log('Alert settings:', settings);

      const allAlerts: AlertData[] = [];

      // Check all capacities
      const rackAlerts = await this.checkRackCapacity(settings);
      const portAlerts = await this.checkPortCapacity(settings);
      const poeAlerts = await this.checkPoECapacity(settings);

      allAlerts.push(...rackAlerts, ...portAlerts, ...poeAlerts);

      // Create alerts in database
      const createdAlerts: AlertData[] = [];
      for (const alert of allAlerts) {
        const alertId = await this.createAlert(alert);
        if (alertId) {
          createdAlerts.push(alert);
        }
      }

      // Send notifications
      if (createdAlerts.length > 0) {
        await this.sendNotifications(createdAlerts);
      }

      console.log(`Created ${createdAlerts.length} alerts`);

      return {
        success: true,
        alertsCreated: createdAlerts.length,
        message: `Capacity check completed. ${createdAlerts.length} alerts created.`
      };
    } catch (error) {
      console.error('Error in capacity check:', error);
      return {
        success: false,
        alertsCreated: 0,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const alertService = new AlertService();
