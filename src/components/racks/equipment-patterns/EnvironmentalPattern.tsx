import { getManufacturerDisplay, getStatusLEDColors } from '@/constants/manufacturerLogos';

interface EnvironmentalPatternProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  manufacturer?: string;
  isHovered: boolean;
  status?: string;
  subtype?: 'environment_sensor' | 'rack_monitor';
}

export const EnvironmentalPattern = ({
  x,
  y,
  width,
  height,
  name,
  manufacturer,
  isHovered,
  status,
  subtype = 'environment_sensor',
}: EnvironmentalPatternProps) => {
  const ledColors = getStatusLEDColors(status);
  const manufacturerInfo = manufacturer ? getManufacturerDisplay(manufacturer) : null;
  const isRackMonitor = subtype === 'rack_monitor';

  return (
    <g>
      {/* Main body */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={isHovered ? "#164e63" : "#0e7490"}
        stroke="#06b6d4"
        strokeWidth="1"
        rx="3"
      />
      
      {/* Left sensor section */}
      <rect
        x={x + 2}
        y={y + 2}
        width={60}
        height={height - 4}
        fill="#0a0a0a"
        rx="2"
      />
      
      {/* Temperature display */}
      <rect x={x + 4} y={y + 4} width={28} height={18} fill="#001a1a" rx="2" />
      <text x={x + 18} y={y + 12} fill="#00ffff" fontSize="7" textAnchor="middle" fontWeight="bold">
        23°C
      </text>
      <text x={x + 18} y={y + 19} fill="#00aaaa" fontSize="4" textAnchor="middle">TEMP</text>
      
      {/* Humidity display */}
      <rect x={x + 34} y={y + 4} width={26} height={18} fill="#001a1a" rx="2" />
      <text x={x + 47} y={y + 12} fill="#22c55e" fontSize="7" textAnchor="middle" fontWeight="bold">
        45%
      </text>
      <text x={x + 47} y={y + 19} fill="#15803d" fontSize="4" textAnchor="middle">HUM</text>
      
      {/* Status LEDs */}
      <circle cx={x + 14} cy={y + height - 8} r={3} fill={ledColors.power} filter="url(#ledGlow)" />
      <circle cx={x + 28} cy={y + height - 8} r={2} fill="#22c55e" />
      <circle cx={x + 42} cy={y + height - 8} r={2} fill="#eab308" />
      
      {/* Sensor/Monitor area */}
      <rect
        x={x + 65}
        y={y + 2}
        width={width - 120}
        height={height - 4}
        fill="#0d1117"
        rx="2"
      />
      
      {isRackMonitor ? (
        // Rack monitor specific - door sensors, power, etc
        <>
          <text x={x + 70} y={y + 10} fill="#64748b" fontSize="5">SENSORS</text>
          <g transform={`translate(${x + 70}, ${y + 14})`}>
            {['DOOR', 'LEAK', 'SMOKE', 'PWR'].map((label, i) => (
              <g key={i} transform={`translate(${i * 35}, 0)`}>
                <rect x={0} y={0} width={30} height={height - 22} fill="#1e293b" rx="1" />
                <text x={15} y={8} fill="#9ca3af" fontSize="5" textAnchor="middle">{label}</text>
                <circle
                  cx={15}
                  cy={height - 28}
                  r={3}
                  fill={label === 'PWR' ? "#22c55e" : "#22c55e"}
                />
              </g>
            ))}
          </g>
        </>
      ) : (
        // Environment sensor - additional readings
        <>
          <text x={x + 70} y={y + 10} fill="#64748b" fontSize="5">ENVIRONMENTAL</text>
          <g transform={`translate(${x + 70}, ${y + 14})`}>
            {[
              { label: 'PRES', value: '1013', unit: 'hPa', color: '#3b82f6' },
              { label: 'DEW', value: '12°', unit: '', color: '#06b6d4' },
              { label: 'AIRQ', value: 'OK', unit: '', color: '#22c55e' },
            ].map((sensor, i) => (
              <g key={i} transform={`translate(${i * 40}, 0)`}>
                <rect x={0} y={0} width={35} height={height - 22} fill="#1e293b" rx="1" />
                <text x={17} y={8} fill="#9ca3af" fontSize="5" textAnchor="middle">{sensor.label}</text>
                <text x={17} y={height - 28} fill={sensor.color} fontSize="6" textAnchor="middle" fontWeight="bold">
                  {sensor.value}{sensor.unit}
                </text>
              </g>
            ))}
          </g>
        </>
      )}
      
      {/* Right panel */}
      <rect
        x={x + width - 52}
        y={y + 2}
        width={50}
        height={height - 4}
        fill="#0a0a0a"
        rx="2"
      />
      
      {/* Network port */}
      <rect x={x + width - 48} y={y + 6} width={16} height={12} fill="#1e3a5f" rx="1" />
      <text x={x + width - 40} y={y + 22} fill="#64748b" fontSize="4" textAnchor="middle">ETH</text>
      
      {/* Alert indicator */}
      <circle cx={x + width - 22} cy={y + 12} r={5} fill="#22c55e" />
      <text x={x + width - 22} y={y + 22} fill="#64748b" fontSize="4" textAnchor="middle">ALERT</text>
      
      {/* Manufacturer badge */}
      {manufacturerInfo && (
        <g>
          <rect
            x={x + width - 48}
            y={y + height - 12}
            width={42}
            height={8}
            fill={manufacturerInfo.primary}
            rx="2"
          />
          <text
            x={x + width - 27}
            y={y + height - 5}
            fill={manufacturerInfo.text}
            fontSize="5"
            textAnchor="middle"
            fontWeight="bold"
          >
            {manufacturerInfo.shortName}
          </text>
        </g>
      )}
      
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
