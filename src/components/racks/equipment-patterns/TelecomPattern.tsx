import { getManufacturerDisplay, getStatusLEDColors } from '@/constants/manufacturerLogos';

interface TelecomPatternProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  manufacturer?: string;
  isHovered: boolean;
  status?: string;
  subtype?: 'pabx' | 'voip_gateway' | 'modem' | 'olt' | 'onu' | 'dslam' | 'msan';
}

export const TelecomPattern = ({
  x,
  y,
  width,
  height,
  name,
  manufacturer,
  isHovered,
  status,
  subtype = 'pabx',
}: TelecomPatternProps) => {
  const ledColors = getStatusLEDColors(status);
  const manufacturerInfo = manufacturer ? getManufacturerDisplay(manufacturer) : null;
  
  const subtypeConfig: Record<string, { color: string; accent: string; label: string; portCount: number }> = {
    pabx: { color: '#7c2d12', accent: '#9a3412', label: 'PABX', portCount: 24 },
    voip_gateway: { color: '#1e3a5f', accent: '#1e40af', label: 'VoIP', portCount: 8 },
    modem: { color: '#1c1917', accent: '#292524', label: 'MODEM', portCount: 2 },
    olt: { color: '#064e3b', accent: '#065f46', label: 'OLT', portCount: 16 },
    onu: { color: '#0f766e', accent: '#0d9488', label: 'ONU', portCount: 4 },
    dslam: { color: '#1e3a8a', accent: '#1d4ed8', label: 'DSLAM', portCount: 48 },
    msan: { color: '#312e81', accent: '#3730a3', label: 'MSAN', portCount: 24 },
  };
  
  const config = subtypeConfig[subtype];
  const displayPorts = Math.min(config.portCount, Math.floor((width - 120) / 8));

  return (
    <g>
      {/* Main body */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={isHovered ? config.accent : config.color}
        stroke="#374151"
        strokeWidth="1"
        rx="3"
      />
      
      {/* Left panel */}
      <rect
        x={x + 2}
        y={y + 2}
        width={40}
        height={height - 4}
        fill="#0a0a0a"
        rx="2"
      />
      
      {/* Type label */}
      <rect x={x + 4} y={y + 4} width={36} height={12} fill="#1e293b" rx="2" />
      <text x={x + 22} y={y + 13} fill="#e2e8f0" fontSize="7" textAnchor="middle" fontWeight="bold">
        {config.label}
      </text>
      
      {/* Status LEDs */}
      <circle cx={x + 14} cy={y + height - 10} r={3} fill={ledColors.power} filter="url(#ledGlow)" />
      <circle cx={x + 28} cy={y + height - 10} r={2} fill={ledColors.activity} className={ledColors.animate ? "animate-pulse" : ""} />
      
      {/* Port section */}
      <rect
        x={x + 45}
        y={y + 2}
        width={width - 100}
        height={height - 4}
        fill="#0d1117"
        rx="2"
      />
      
      {/* Port type label */}
      <text x={x + 50} y={y + 10} fill="#64748b" fontSize="5">
        {subtype === 'olt' || subtype === 'onu' ? 'PON PORTS' : 
         subtype === 'pabx' ? 'FXS/FXO' : 
         subtype === 'voip_gateway' ? 'SIP CHANNELS' : 'LINES'}
      </text>
      
      {/* Port indicators */}
      <g transform={`translate(${x + 50}, ${y + 14})`}>
        {Array.from({ length: displayPorts }).map((_, i) => {
          const isActive = Math.random() > 0.4;
          const portColor = subtype === 'olt' || subtype === 'onu' ? '#22c55e' : 
                           subtype === 'pabx' ? '#eab308' : '#3b82f6';
          return (
            <g key={i} transform={`translate(${i * 8}, 0)`}>
              <rect
                x={0}
                y={0}
                width={6}
                height={height - 22}
                fill="#1e293b"
                rx="1"
              />
              <circle
                cx={3}
                cy={height - 26}
                r={1.5}
                fill={isActive ? portColor : "#374151"}
                className={isActive ? "animate-pulse" : ""}
              />
            </g>
          );
        })}
      </g>
      
      {/* Uplink section */}
      <g transform={`translate(${x + width - 90}, ${y + 6})`}>
        <text x={0} y={0} fill="#64748b" fontSize="5">UPLINK</text>
        {subtype === 'olt' || subtype === 'onu' ? (
          // Fiber ports for OLT/ONU
          <>
            <rect x={0} y={4} width={12} height={height - 18} fill="#22c55e" rx="1" opacity="0.3" />
            <circle cx={6} cy={height - 16} r={3} fill="#22c55e" className="animate-pulse" />
          </>
        ) : (
          // Ethernet ports for other telecom
          <>
            <rect x={0} y={4} width={12} height={height - 18} fill="#1e3a5f" rx="1" />
            <circle cx={6} cy={height - 16} r={2} fill="#22c55e" />
          </>
        )}
      </g>
      
      {/* Right panel */}
      <rect
        x={x + width - 52}
        y={y + 2}
        width={50}
        height={height - 4}
        fill="#0a0a0a"
        rx="2"
      />
      
      {/* Manufacturer badge */}
      {manufacturerInfo && (
        <g>
          <rect
            x={x + width - 48}
            y={y + 4}
            width={42}
            height={10}
            fill={manufacturerInfo.primary}
            rx="2"
          />
          <text
            x={x + width - 27}
            y={y + 12}
            fill={manufacturerInfo.text}
            fontSize="6"
            textAnchor="middle"
            fontWeight="bold"
          >
            {manufacturerInfo.shortName}
          </text>
        </g>
      )}
      
      {/* Console port */}
      <rect x={x + width - 48} y={y + height - 20} width={18} height={8} fill="#0c4a6e" rx="1" />
      <text x={x + width - 39} y={y + height - 14} fill="#64748b" fontSize="4" textAnchor="middle">CON</text>
      
      {/* Name label */}
      <text
        x={x + width / 2}
        y={y + height - 2}
        fill="#e2e8f0"
        fontSize="8"
        textAnchor="middle"
        fontWeight="bold"
      >
        {name.substring(0, 25)}
      </text>
    </g>
  );
};
