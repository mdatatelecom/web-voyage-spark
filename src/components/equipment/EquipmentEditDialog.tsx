import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Info } from 'lucide-react';
import { getEquipmentFieldConfig, AIRFLOW_OPTIONS, EQUIPMENT_STATUS_OPTIONS } from '@/constants/equipmentTypes';

interface Equipment {
  id: string;
  name: string;
  type: string;
  hostname?: string;
  ip_address?: string;
  serial_number?: string;
  notes?: string;
  manufacturer?: string;
  model?: string;
  asset_tag?: string;
  primary_mac_address?: string;
  power_consumption_watts?: number;
  weight_kg?: number;
  airflow?: string;
  equipment_status?: string;
}

interface EquipmentEditDialogProps {
  equipment: Equipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<Equipment>) => void;
  isLoading?: boolean;
}

export function EquipmentEditDialog({
  equipment,
  open,
  onOpenChange,
  onSave,
  isLoading
}: EquipmentEditDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    hostname: '',
    ip_address: '',
    serial_number: '',
    manufacturer: '',
    model: '',
    notes: '',
    asset_tag: '',
    primary_mac_address: '',
    power_consumption_watts: '',
    weight_kg: '',
    airflow: '',
    equipment_status: 'active'
  });

  // Get field configuration based on equipment type
  const fieldConfig = getEquipmentFieldConfig(equipment?.type || 'other');

  useEffect(() => {
    if (equipment) {
      setFormData({
        name: equipment.name || '',
        hostname: equipment.hostname || '',
        ip_address: equipment.ip_address || '',
        serial_number: equipment.serial_number || '',
        manufacturer: equipment.manufacturer || '',
        model: equipment.model || '',
        notes: equipment.notes || '',
        asset_tag: equipment.asset_tag || '',
        primary_mac_address: equipment.primary_mac_address || '',
        power_consumption_watts: equipment.power_consumption_watts?.toString() || '',
        weight_kg: equipment.weight_kg?.toString() || '',
        airflow: equipment.airflow || '',
        equipment_status: equipment.equipment_status || 'active'
      });
    }
  }, [equipment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipment) return;
    
    onSave({
      id: equipment.id,
      name: formData.name,
      manufacturer: formData.manufacturer || undefined,
      model: formData.model || undefined,
      serial_number: formData.serial_number || undefined,
      notes: formData.notes || undefined,
      // Conditional fields based on equipment type
      hostname: fieldConfig.fields.hostname ? formData.hostname || undefined : undefined,
      ip_address: fieldConfig.fields.ipAddress ? formData.ip_address || undefined : undefined,
      asset_tag: fieldConfig.fields.assetTag ? formData.asset_tag || undefined : undefined,
      primary_mac_address: fieldConfig.fields.macAddress ? formData.primary_mac_address || undefined : undefined,
      power_consumption_watts: fieldConfig.fields.powerConsumption && formData.power_consumption_watts 
        ? parseInt(formData.power_consumption_watts) 
        : undefined,
      weight_kg: fieldConfig.fields.weight && formData.weight_kg 
        ? parseFloat(formData.weight_kg) 
        : undefined,
      airflow: fieldConfig.fields.airflow ? formData.airflow || undefined : undefined,
      equipment_status: formData.equipment_status || 'active'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Equipamento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipment_status">Status</Label>
              <Select 
                value={formData.equipment_status} 
                onValueChange={(v) => setFormData({ ...formData, equipment_status: v })}
              >
                <SelectTrigger id="equipment_status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${opt.color}`} />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Network fields - only show if equipment supports network */}
          {fieldConfig.hasNetwork && (
            <>
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3">🌐 Configuração de Rede</h3>
                <div className="grid grid-cols-2 gap-4">
                  {fieldConfig.fields.hostname && (
                    <div className="space-y-2">
                      <Label htmlFor="hostname">Hostname</Label>
                      <Input
                        id="hostname"
                        value={formData.hostname}
                        onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                      />
                    </div>
                  )}

                  {fieldConfig.fields.ipAddress && (
                    <div className="space-y-2">
                      <Label htmlFor="ip_address">Endereço IP</Label>
                      <Input
                        id="ip_address"
                        value={formData.ip_address}
                        onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                        placeholder="192.168.1.1"
                      />
                    </div>
                  )}
                </div>

                {fieldConfig.fields.macAddress && (
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="primary_mac_address">MAC Address Principal</Label>
                    <Input
                      id="primary_mac_address"
                      value={formData.primary_mac_address}
                      onChange={(e) => setFormData({ ...formData, primary_mac_address: e.target.value })}
                      placeholder="AA:BB:CC:DD:EE:FF"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Show info for passive equipment */}
          {!fieldConfig.hasNetwork && !fieldConfig.fields.assetTag && (
            <div className="p-3 bg-muted rounded-lg flex items-start gap-2">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Este tipo de equipamento é passivo e não possui configurações de rede.
              </p>
            </div>
          )}

          {/* Identification */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3">📋 Identificação</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manufacturer">Fabricante</Label>
                <Input
                  id="manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Modelo</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serial_number">Número de Série</Label>
                <Input
                  id="serial_number"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                />
              </div>

              {fieldConfig.fields.assetTag && (
                <div className="space-y-2">
                  <Label htmlFor="asset_tag">Tag de Patrimônio</Label>
                  <Input
                    id="asset_tag"
                    value={formData.asset_tag}
                    onChange={(e) => setFormData({ ...formData, asset_tag: e.target.value })}
                    placeholder="PAT-000001"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Physical Specs - only show if any of these fields are enabled */}
          {(fieldConfig.fields.powerConsumption || fieldConfig.fields.weight || fieldConfig.fields.airflow) && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">⚡ Especificações Físicas</h3>
              <div className="grid grid-cols-2 gap-4">
                {fieldConfig.fields.powerConsumption && (
                  <div className="space-y-2">
                    <Label htmlFor="power_consumption_watts">Consumo (Watts)</Label>
                    <Input
                      id="power_consumption_watts"
                      type="number"
                      value={formData.power_consumption_watts}
                      onChange={(e) => setFormData({ ...formData, power_consumption_watts: e.target.value })}
                      placeholder="500"
                    />
                  </div>
                )}

                {fieldConfig.fields.weight && (
                  <div className="space-y-2">
                    <Label htmlFor="weight_kg">Peso (kg)</Label>
                    <Input
                      id="weight_kg"
                      type="number"
                      step="0.1"
                      value={formData.weight_kg}
                      onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                      placeholder="12.5"
                    />
                  </div>
                )}

                {fieldConfig.fields.airflow && (
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="airflow">Fluxo de Ar</Label>
                    <Select 
                      value={formData.airflow} 
                      onValueChange={(v) => setFormData({ ...formData, airflow: v })}
                    >
                      <SelectTrigger id="airflow">
                        <SelectValue placeholder="Selecione o fluxo de ar" />
                      </SelectTrigger>
                      <SelectContent>
                        {AIRFLOW_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
