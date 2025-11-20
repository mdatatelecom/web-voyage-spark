export const CABLE_TYPES = [
  { value: 'utp_cat5e', label: 'UTP Cat5e' },
  { value: 'utp_cat6', label: 'UTP Cat6' },
  { value: 'utp_cat6a', label: 'UTP Cat6a' },
  { value: 'fiber_om3', label: 'Fibra Óptica OM3 (Multimodo)' },
  { value: 'fiber_om4', label: 'Fibra Óptica OM4 (Multimodo)' },
  { value: 'fiber_os2', label: 'Fibra Óptica OS2 (Monomodo)' },
  { value: 'dac', label: 'DAC (Direct Attach Copper)' },
  { value: 'other', label: 'Outro' }
];

export const CABLE_COLORS = [
  { value: '#3b82f6', label: 'Azul' },
  { value: '#10b981', label: 'Verde' },
  { value: '#f59e0b', label: 'Amarelo' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#ffffff', label: 'Branco' },
  { value: '#000000', label: 'Preto' },
  { value: '#8b5cf6', label: 'Roxo' },
  { value: '#ec4899', label: 'Rosa' }
];

export const getCableTypeLabel = (type: string) => {
  const typeObj = CABLE_TYPES.find(t => t.value === type);
  return typeObj ? typeObj.label : type;
};
