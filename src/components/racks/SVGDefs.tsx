export const SVGDefs = () => (
  <defs>
    {/* Server Gradients */}
    <linearGradient id="serverGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#4a4a4a" />
      <stop offset="50%" stopColor="#2d2d2d" />
      <stop offset="100%" stopColor="#1a1a1a" />
    </linearGradient>
    
    <linearGradient id="serverGradientHover" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#5a5a5a" />
      <stop offset="50%" stopColor="#3d3d3d" />
      <stop offset="100%" stopColor="#2a2a2a" />
    </linearGradient>

    {/* Switch Gradients */}
    <linearGradient id="switchGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#1e40af" />
      <stop offset="50%" stopColor="#1e3a8a" />
      <stop offset="100%" stopColor="#172554" />
    </linearGradient>

    <linearGradient id="switchGradientHover" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#2563eb" />
      <stop offset="50%" stopColor="#1d4ed8" />
      <stop offset="100%" stopColor="#1e40af" />
    </linearGradient>

    {/* Router Gradients */}
    <linearGradient id="routerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#047857" />
      <stop offset="50%" stopColor="#065f46" />
      <stop offset="100%" stopColor="#064e3b" />
    </linearGradient>

    {/* Firewall Gradients */}
    <linearGradient id="firewallGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#dc2626" />
      <stop offset="50%" stopColor="#b91c1c" />
      <stop offset="100%" stopColor="#991b1b" />
    </linearGradient>

    {/* Storage Gradients */}
    <linearGradient id="storageGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#7c3aed" />
      <stop offset="50%" stopColor="#6d28d9" />
      <stop offset="100%" stopColor="#5b21b6" />
    </linearGradient>

    {/* Patch Panel Gradients */}
    <linearGradient id="patchPanelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#525252" />
      <stop offset="50%" stopColor="#404040" />
      <stop offset="100%" stopColor="#262626" />
    </linearGradient>

    {/* PDU Gradients */}
    <linearGradient id="pduGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#7c3aed" />
      <stop offset="50%" stopColor="#6d28d9" />
      <stop offset="100%" stopColor="#5b21b6" />
    </linearGradient>

    {/* UPS Gradients */}
    <linearGradient id="upsGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#ca8a04" />
      <stop offset="50%" stopColor="#a16207" />
      <stop offset="100%" stopColor="#854d0e" />
    </linearGradient>

    {/* NVR/DVR Gradients */}
    <linearGradient id="nvrGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#059669" />
      <stop offset="50%" stopColor="#047857" />
      <stop offset="100%" stopColor="#065f46" />
    </linearGradient>

    {/* Generic/Other Gradients */}
    <linearGradient id="genericGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#6b7280" />
      <stop offset="50%" stopColor="#4b5563" />
      <stop offset="100%" stopColor="#374151" />
    </linearGradient>

    {/* Metallic Bezel */}
    <linearGradient id="bezelGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#71717a" />
      <stop offset="50%" stopColor="#52525b" />
      <stop offset="100%" stopColor="#3f3f46" />
    </linearGradient>

    {/* LED Glow Effects */}
    <filter id="ledGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    {/* Ventilation Pattern */}
    <pattern id="ventPattern" patternUnits="userSpaceOnUse" width="6" height="6">
      <rect width="4" height="2" fill="#333" rx="0.5" />
    </pattern>

    {/* Port Pattern for Patch Panels */}
    <pattern id="portPattern" patternUnits="userSpaceOnUse" width="12" height="10">
      <rect x="1" y="1" width="10" height="8" fill="#1a1a1a" rx="1" stroke="#444" strokeWidth="0.5"/>
    </pattern>
  </defs>
);
