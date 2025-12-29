export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      access_logs: {
        Row: {
          action: string
          connection_id: string | null
          created_at: string
          details: Json | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          connection_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          connection_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "v_connection_details"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string | null
          current_value: number | null
          id: string
          message: string
          related_entity_id: string | null
          related_entity_type: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          status: Database["public"]["Enums"]["alert_status"] | null
          threshold_value: number | null
          title: string
          type: Database["public"]["Enums"]["alert_type"]
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          message: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"] | null
          threshold_value?: number | null
          title: string
          type: Database["public"]["Enums"]["alert_type"]
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          message?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"] | null
          threshold_value?: number | null
          title?: string
          type?: Database["public"]["Enums"]["alert_type"]
        }
        Relationships: []
      }
      buildings: {
        Row: {
          address: string | null
          building_type: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          internal_code: string | null
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          building_type?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          internal_code?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          building_type?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          internal_code?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      connections: {
        Row: {
          cable_color: string | null
          cable_length_meters: number | null
          cable_type: Database["public"]["Enums"]["cable_type"]
          connection_code: string
          created_at: string
          id: string
          installed_at: string
          installed_by: string | null
          notes: string | null
          port_a_id: string
          port_b_id: string
          status: Database["public"]["Enums"]["connection_status"]
          updated_at: string
          vlan_id: number | null
          vlan_name: string | null
          vlan_tagging: string | null
        }
        Insert: {
          cable_color?: string | null
          cable_length_meters?: number | null
          cable_type: Database["public"]["Enums"]["cable_type"]
          connection_code: string
          created_at?: string
          id?: string
          installed_at?: string
          installed_by?: string | null
          notes?: string | null
          port_a_id: string
          port_b_id: string
          status?: Database["public"]["Enums"]["connection_status"]
          updated_at?: string
          vlan_id?: number | null
          vlan_name?: string | null
          vlan_tagging?: string | null
        }
        Update: {
          cable_color?: string | null
          cable_length_meters?: number | null
          cable_type?: Database["public"]["Enums"]["cable_type"]
          connection_code?: string
          created_at?: string
          id?: string
          installed_at?: string
          installed_by?: string | null
          notes?: string | null
          port_a_id?: string
          port_b_id?: string
          status?: Database["public"]["Enums"]["connection_status"]
          updated_at?: string
          vlan_id?: number | null
          vlan_name?: string | null
          vlan_tagging?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connections_port_a_id_fkey"
            columns: ["port_a_id"]
            isOneToOne: false
            referencedRelation: "ports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_port_b_id_fkey"
            columns: ["port_b_id"]
            isOneToOne: false
            referencedRelation: "ports"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          airflow: string | null
          asset_tag: string | null
          created_at: string
          equipment_status: string | null
          hostname: string | null
          id: string
          ip_address: string | null
          manufacturer: string | null
          model: string | null
          mount_side: string | null
          name: string
          notes: string | null
          poe_budget_watts: number | null
          poe_power_per_port: Json | null
          position_u_end: number | null
          position_u_start: number | null
          power_consumption_watts: number | null
          primary_mac_address: string | null
          rack_id: string
          serial_number: string | null
          type: Database["public"]["Enums"]["equipment_type"]
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          airflow?: string | null
          asset_tag?: string | null
          created_at?: string
          equipment_status?: string | null
          hostname?: string | null
          id?: string
          ip_address?: string | null
          manufacturer?: string | null
          model?: string | null
          mount_side?: string | null
          name: string
          notes?: string | null
          poe_budget_watts?: number | null
          poe_power_per_port?: Json | null
          position_u_end?: number | null
          position_u_start?: number | null
          power_consumption_watts?: number | null
          primary_mac_address?: string | null
          rack_id: string
          serial_number?: string | null
          type: Database["public"]["Enums"]["equipment_type"]
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          airflow?: string | null
          asset_tag?: string | null
          created_at?: string
          equipment_status?: string | null
          hostname?: string | null
          id?: string
          ip_address?: string | null
          manufacturer?: string | null
          model?: string | null
          mount_side?: string | null
          name?: string
          notes?: string | null
          poe_budget_watts?: number | null
          poe_power_per_port?: Json | null
          position_u_end?: number | null
          position_u_start?: number | null
          power_consumption_watts?: number | null
          primary_mac_address?: string | null
          rack_id?: string
          serial_number?: string | null
          type?: Database["public"]["Enums"]["equipment_type"]
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_rack_id_fkey"
            columns: ["rack_id"]
            isOneToOne: false
            referencedRelation: "racks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_rack_id_fkey"
            columns: ["rack_id"]
            isOneToOne: false
            referencedRelation: "v_connection_details"
            referencedColumns: ["rack_a_id"]
          },
          {
            foreignKeyName: "equipment_rack_id_fkey"
            columns: ["rack_id"]
            isOneToOne: false
            referencedRelation: "v_connection_details"
            referencedColumns: ["rack_b_id"]
          },
        ]
      }
      floors: {
        Row: {
          area_sqm: number | null
          building_id: string
          created_at: string
          floor_number: number | null
          has_access_control: boolean | null
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          area_sqm?: number | null
          building_id: string
          created_at?: string
          floor_number?: number | null
          has_access_control?: boolean | null
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          area_sqm?: number | null
          building_id?: string
          created_at?: string
          floor_number?: number | null
          has_access_control?: boolean | null
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "floors_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      labels: {
        Row: {
          connection_id: string
          generated_at: string
          generated_by: string | null
          id: string
          label_file_url: string | null
          print_count: number
          printed_at: string | null
          qr_code_data: string
        }
        Insert: {
          connection_id: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          label_file_url?: string | null
          print_count?: number
          printed_at?: string | null
          qr_code_data: string
        }
        Update: {
          connection_id?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          label_file_url?: string | null
          print_count?: number
          printed_at?: string | null
          qr_code_data?: string
        }
        Relationships: [
          {
            foreignKeyName: "labels_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labels_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "v_connection_details"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          alert_critical: boolean
          alert_info: boolean
          alert_warning: boolean
          created_at: string
          email_address: string | null
          email_enabled: boolean
          id: string
          updated_at: string
          user_id: string
          whatsapp_alert_critical: boolean | null
          whatsapp_alert_resolved: boolean | null
          whatsapp_alert_warning: boolean | null
          whatsapp_enabled: boolean | null
          whatsapp_phone: string | null
        }
        Insert: {
          alert_critical?: boolean
          alert_info?: boolean
          alert_warning?: boolean
          created_at?: string
          email_address?: string | null
          email_enabled?: boolean
          id?: string
          updated_at?: string
          user_id: string
          whatsapp_alert_critical?: boolean | null
          whatsapp_alert_resolved?: boolean | null
          whatsapp_alert_warning?: boolean | null
          whatsapp_enabled?: boolean | null
          whatsapp_phone?: string | null
        }
        Update: {
          alert_critical?: boolean
          alert_info?: boolean
          alert_warning?: boolean
          created_at?: string
          email_address?: string | null
          email_enabled?: boolean
          id?: string
          updated_at?: string
          user_id?: string
          whatsapp_alert_critical?: boolean | null
          whatsapp_alert_resolved?: boolean | null
          whatsapp_alert_warning?: boolean | null
          whatsapp_enabled?: boolean | null
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      ports: {
        Row: {
          created_at: string
          equipment_id: string
          id: string
          name: string
          notes: string | null
          port_number: number | null
          port_type: Database["public"]["Enums"]["port_type"] | null
          speed: string | null
          status: Database["public"]["Enums"]["port_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          equipment_id: string
          id?: string
          name: string
          notes?: string | null
          port_number?: number | null
          port_type?: Database["public"]["Enums"]["port_type"] | null
          speed?: string | null
          status?: Database["public"]["Enums"]["port_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          equipment_id?: string
          id?: string
          name?: string
          notes?: string | null
          port_number?: number | null
          port_type?: Database["public"]["Enums"]["port_type"] | null
          speed?: string | null
          status?: Database["public"]["Enums"]["port_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ports_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ports_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "v_connection_details"
            referencedColumns: ["equipment_a_id"]
          },
          {
            foreignKeyName: "ports_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "v_connection_details"
            referencedColumns: ["equipment_b_id"]
          },
          {
            foreignKeyName: "ports_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "v_port_availability"
            referencedColumns: ["equipment_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_updated_at: string | null
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_updated_at?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_updated_at?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rack_annotations: {
        Row: {
          annotation_type: string
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          icon: string | null
          id: string
          position_side: string | null
          position_u: number
          priority: string | null
          rack_id: string
          title: string
          updated_at: string
        }
        Insert: {
          annotation_type: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          icon?: string | null
          id?: string
          position_side?: string | null
          position_u: number
          priority?: string | null
          rack_id: string
          title: string
          updated_at?: string
        }
        Update: {
          annotation_type?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          icon?: string | null
          id?: string
          position_side?: string | null
          position_u?: number
          priority?: string | null
          rack_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rack_annotations_rack_id_fkey"
            columns: ["rack_id"]
            isOneToOne: false
            referencedRelation: "racks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rack_annotations_rack_id_fkey"
            columns: ["rack_id"]
            isOneToOne: false
            referencedRelation: "v_connection_details"
            referencedColumns: ["rack_a_id"]
          },
          {
            foreignKeyName: "rack_annotations_rack_id_fkey"
            columns: ["rack_id"]
            isOneToOne: false
            referencedRelation: "v_connection_details"
            referencedColumns: ["rack_b_id"]
          },
        ]
      }
      racks: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          room_id: string
          size_u: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          room_id: string
          size_u?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          room_id?: string
          size_u?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "racks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          capacity: number | null
          created_at: string
          floor_id: string
          has_access_control: boolean | null
          id: string
          name: string
          notes: string | null
          room_type: string | null
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          floor_id: string
          has_access_control?: boolean | null
          id?: string
          name: string
          notes?: string | null
          room_type?: string | null
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          floor_id?: string
          has_access_control?: boolean | null
          id?: string
          name?: string
          notes?: string | null
          room_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          attachments: Json | null
          category: string
          closed_at: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string
          description: string
          due_date: string | null
          id: string
          priority: string
          related_building_id: string | null
          related_equipment_id: string | null
          related_rack_id: string | null
          related_room_id: string | null
          resolved_at: string | null
          status: string
          technician_phone: string | null
          ticket_number: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          attachments?: Json | null
          category?: string
          closed_at?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by: string
          description: string
          due_date?: string | null
          id?: string
          priority?: string
          related_building_id?: string | null
          related_equipment_id?: string | null
          related_rack_id?: string | null
          related_room_id?: string | null
          resolved_at?: string | null
          status?: string
          technician_phone?: string | null
          ticket_number: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          attachments?: Json | null
          category?: string
          closed_at?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string
          description?: string
          due_date?: string | null
          id?: string
          priority?: string
          related_building_id?: string | null
          related_equipment_id?: string | null
          related_rack_id?: string | null
          related_room_id?: string | null
          resolved_at?: string | null
          status?: string
          technician_phone?: string | null
          ticket_number?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_related_building_id_fkey"
            columns: ["related_building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_related_equipment_id_fkey"
            columns: ["related_equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_related_equipment_id_fkey"
            columns: ["related_equipment_id"]
            isOneToOne: false
            referencedRelation: "v_connection_details"
            referencedColumns: ["equipment_a_id"]
          },
          {
            foreignKeyName: "support_tickets_related_equipment_id_fkey"
            columns: ["related_equipment_id"]
            isOneToOne: false
            referencedRelation: "v_connection_details"
            referencedColumns: ["equipment_b_id"]
          },
          {
            foreignKeyName: "support_tickets_related_equipment_id_fkey"
            columns: ["related_equipment_id"]
            isOneToOne: false
            referencedRelation: "v_port_availability"
            referencedColumns: ["equipment_id"]
          },
          {
            foreignKeyName: "support_tickets_related_rack_id_fkey"
            columns: ["related_rack_id"]
            isOneToOne: false
            referencedRelation: "racks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_related_rack_id_fkey"
            columns: ["related_rack_id"]
            isOneToOne: false
            referencedRelation: "v_connection_details"
            referencedColumns: ["rack_a_id"]
          },
          {
            foreignKeyName: "support_tickets_related_rack_id_fkey"
            columns: ["related_rack_id"]
            isOneToOne: false
            referencedRelation: "v_connection_details"
            referencedColumns: ["rack_b_id"]
          },
          {
            foreignKeyName: "support_tickets_related_room_id_fkey"
            columns: ["related_room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      ticket_comments: {
        Row: {
          attachments: Json | null
          comment: string
          created_at: string | null
          id: string
          is_internal: boolean | null
          source: string | null
          ticket_id: string
          user_id: string
          whatsapp_sender_name: string | null
          whatsapp_sender_phone: string | null
        }
        Insert: {
          attachments?: Json | null
          comment: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          source?: string | null
          ticket_id: string
          user_id: string
          whatsapp_sender_name?: string | null
          whatsapp_sender_phone?: string | null
        }
        Update: {
          attachments?: Json | null
          comment?: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          source?: string | null
          ticket_id?: string
          user_id?: string
          whatsapp_sender_name?: string | null
          whatsapp_sender_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_groups: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          owner: string | null
          picture_url: string | null
          size: number | null
          subject: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id: string
          owner?: string | null
          picture_url?: string | null
          size?: number | null
          subject: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          owner?: string | null
          picture_url?: string | null
          size?: number | null
          subject?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      whatsapp_message_mapping: {
        Row: {
          created_at: string | null
          direction: string | null
          group_id: string | null
          id: string
          message_id: string
          phone_number: string | null
          ticket_id: string
        }
        Insert: {
          created_at?: string | null
          direction?: string | null
          group_id?: string | null
          id?: string
          message_id: string
          phone_number?: string | null
          ticket_id: string
        }
        Update: {
          created_at?: string | null
          direction?: string | null
          group_id?: string | null
          id?: string
          message_id?: string
          phone_number?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_mapping_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_notifications: {
        Row: {
          created_at: string | null
          error_message: string | null
          external_id: string | null
          id: string
          message_content: string
          message_type: string
          phone_number: string
          sent_at: string | null
          status: string | null
          ticket_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          message_content: string
          message_type: string
          phone_number: string
          sent_at?: string | null
          status?: string | null
          ticket_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          message_content?: string
          message_type?: string
          phone_number?: string
          sent_at?: string | null
          status?: string | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_notifications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_sessions: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          phone: string
          state: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          phone: string
          state: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          phone?: string
          state?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          template_content: string
          template_name: string
          template_type: string
          updated_at: string | null
          variables: string[] | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          template_content: string
          template_name: string
          template_type: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          template_content?: string
          template_name?: string
          template_type?: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Relationships: []
      }
    }
    Views: {
      v_connection_details: {
        Row: {
          cable_color: string | null
          cable_length_meters: number | null
          cable_type: Database["public"]["Enums"]["cable_type"] | null
          connection_code: string | null
          equipment_a_id: string | null
          equipment_a_name: string | null
          equipment_a_type: Database["public"]["Enums"]["equipment_type"] | null
          equipment_b_id: string | null
          equipment_b_name: string | null
          equipment_b_type: Database["public"]["Enums"]["equipment_type"] | null
          id: string | null
          installed_at: string | null
          notes: string | null
          port_a_id: string | null
          port_a_name: string | null
          port_b_id: string | null
          port_b_name: string | null
          rack_a_id: string | null
          rack_a_name: string | null
          rack_b_id: string | null
          rack_b_name: string | null
          status: Database["public"]["Enums"]["connection_status"] | null
          vlan_id: number | null
          vlan_name: string | null
          vlan_tagging: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connections_port_a_id_fkey"
            columns: ["port_a_id"]
            isOneToOne: false
            referencedRelation: "ports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_port_b_id_fkey"
            columns: ["port_b_id"]
            isOneToOne: false
            referencedRelation: "ports"
            referencedColumns: ["id"]
          },
        ]
      }
      v_port_availability: {
        Row: {
          available_ports: number | null
          equipment_id: string | null
          equipment_name: string | null
          equipment_type: Database["public"]["Enums"]["equipment_type"] | null
          in_use_ports: number | null
          total_ports: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_connection_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      alert_severity: "info" | "warning" | "critical"
      alert_status: "active" | "acknowledged" | "resolved"
      alert_type:
        | "rack_capacity"
        | "port_capacity"
        | "equipment_failure"
        | "poe_capacity"
        | "nvr_full"
        | "camera_unassigned"
        | "connection_faulty"
        | "connection_stale_testing"
        | "equipment_no_ip"
      cable_type:
        | "utp_cat5e"
        | "utp_cat6"
        | "utp_cat6a"
        | "fiber_om3"
        | "fiber_om4"
        | "fiber_os2"
        | "dac"
        | "other"
      connection_status:
        | "active"
        | "inactive"
        | "reserved"
        | "testing"
        | "faulty"
      equipment_status:
        | "active"
        | "planned"
        | "offline"
        | "staged"
        | "failed"
        | "decommissioning"
      equipment_type:
        | "switch"
        | "router"
        | "server"
        | "patch_panel"
        | "firewall"
        | "storage"
        | "other"
        | "load_balancer"
        | "waf"
        | "access_point"
        | "pdu"
        | "ups"
        | "dvr"
        | "nvr"
        | "pabx"
        | "voip_gateway"
        | "modem"
        | "olt"
        | "onu"
        | "kvm"
        | "console_server"
        | "patch_panel_fiber"
        | "cable_organizer_horizontal"
        | "cable_organizer_vertical"
        | "brush_panel"
        | "switch_poe"
        | "poe_injector"
        | "poe_splitter"
        | "pdu_smart"
        | "ip_camera"
        | "media_converter"
        | "media_converter_chassis"
        | "environment_sensor"
        | "rack_monitor"
        | "dslam"
        | "msan"
        | "fixed_shelf"
      port_status: "available" | "in_use" | "reserved" | "disabled"
      port_type:
        | "rj45"
        | "sfp"
        | "sfp_plus"
        | "sfp28"
        | "qsfp"
        | "qsfp28"
        | "fiber_lc"
        | "fiber_sc"
        | "bnc"
        | "hdmi"
        | "vga"
        | "usb"
        | "serial"
        | "console_rj45"
        | "console_usb"
        | "fxo_fxs"
        | "e1_t1"
        | "power_ac"
        | "power_dc"
        | "antenna_sma"
        | "rs485_rs232"
        | "io"
        | "other"
        | "rj45_poe"
        | "rj45_poe_plus"
        | "rj45_poe_plus_plus"
        | "sensor_io"
      user_role: "admin" | "technician" | "viewer" | "network_viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alert_severity: ["info", "warning", "critical"],
      alert_status: ["active", "acknowledged", "resolved"],
      alert_type: [
        "rack_capacity",
        "port_capacity",
        "equipment_failure",
        "poe_capacity",
        "nvr_full",
        "camera_unassigned",
        "connection_faulty",
        "connection_stale_testing",
        "equipment_no_ip",
      ],
      cable_type: [
        "utp_cat5e",
        "utp_cat6",
        "utp_cat6a",
        "fiber_om3",
        "fiber_om4",
        "fiber_os2",
        "dac",
        "other",
      ],
      connection_status: [
        "active",
        "inactive",
        "reserved",
        "testing",
        "faulty",
      ],
      equipment_status: [
        "active",
        "planned",
        "offline",
        "staged",
        "failed",
        "decommissioning",
      ],
      equipment_type: [
        "switch",
        "router",
        "server",
        "patch_panel",
        "firewall",
        "storage",
        "other",
        "load_balancer",
        "waf",
        "access_point",
        "pdu",
        "ups",
        "dvr",
        "nvr",
        "pabx",
        "voip_gateway",
        "modem",
        "olt",
        "onu",
        "kvm",
        "console_server",
        "patch_panel_fiber",
        "cable_organizer_horizontal",
        "cable_organizer_vertical",
        "brush_panel",
        "switch_poe",
        "poe_injector",
        "poe_splitter",
        "pdu_smart",
        "ip_camera",
        "media_converter",
        "media_converter_chassis",
        "environment_sensor",
        "rack_monitor",
        "dslam",
        "msan",
        "fixed_shelf",
      ],
      port_status: ["available", "in_use", "reserved", "disabled"],
      port_type: [
        "rj45",
        "sfp",
        "sfp_plus",
        "sfp28",
        "qsfp",
        "qsfp28",
        "fiber_lc",
        "fiber_sc",
        "bnc",
        "hdmi",
        "vga",
        "usb",
        "serial",
        "console_rj45",
        "console_usb",
        "fxo_fxs",
        "e1_t1",
        "power_ac",
        "power_dc",
        "antenna_sma",
        "rs485_rs232",
        "io",
        "other",
        "rj45_poe",
        "rj45_poe_plus",
        "rj45_poe_plus_plus",
        "sensor_io",
      ],
      user_role: ["admin", "technician", "viewer", "network_viewer"],
    },
  },
} as const
