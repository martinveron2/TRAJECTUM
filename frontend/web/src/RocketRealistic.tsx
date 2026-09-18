import React from 'react';

type NumericField = number | '';
type VehicleLike = {
  totalLength: NumericField; diameter: NumericField; noseLength: NumericField;
  bayLength: NumericField; bodyLength: NumericField; airfoil: string; noseProfile: string;
};

export function RocketRealistic({ vehicle }: { vehicle: VehicleLike }) {
  const total = Number(vehicle.totalLength) || 860;
  const nose = Number(vehicle.noseLength) || 180;
  const bay = Number(vehicle.bayLength) || 180;
  const body = Number(vehicle.bodyLength) || 500;
  const top = 24, usable = 500, scale = usable / total;
  const noseH = nose * scale, bayH = bay * scale, bodyH = body * scale;
  const x = 145, w = 88, yBay = top + noseH, yBody = yBay + bayH, bottom = yBody + bodyH;
  const centerX = x + w / 2;
  const radiusMm = (Number(vehicle.diameter) || 63) / 2;
  const rho = (radiusMm ** 2 + nose ** 2) / (2 * radiusMm);
  const profileRadius = (axial: number) => {
    const u = Math.max(0, Math.min(1, axial / nose));
    if (vehicle.noseProfile === 'von_karman') {
      const theta = Math.acos(1 - 2 * u);
      const term = theta - 0.5 * Math.sin(2 * theta);
      return radiusMm / Math.sqrt(Math.PI) * Math.sqrt(Math.max(term, 0));
    }
    if (vehicle.noseProfile === 'power_series') return radiusMm * Math.pow(u, 0.75);
    const inside = Math.max(rho ** 2 - (nose - axial) ** 2, 0);
    return Math.sqrt(inside) + radiusMm - rho;
  };
  const ogive = Array.from({ length: 41 }, (_, i) => {
    const axial = nose * i / 40;
    const radius = profileRadius(axial);
    return { y: top + axial * scale, half: (radius / radiusMm) * (w / 2) };
  });
  const left = ogive.map((p) => `${centerX - p.half},${p.y}`).join(' ');
  const right = [...ogive].reverse().map((p) => `${centerX + p.half},${p.y}`).join(' ');
  const ogivePoints = `${left} ${right}`;

  return <div className="schematic realistic"><svg viewBox="0 0 390 590" role="img" aria-label="Rocket side view">
    <defs>
      <linearGradient id="shell3d" x1="0" x2="1"><stop offset="0%" stopColor="#596b82"/><stop offset="20%" stopColor="#dce5ef"/><stop offset="50%" stopColor="#f7f9fc"/><stop offset="82%" stopColor="#aebdce"/><stop offset="100%" stopColor="#50647e"/></linearGradient>
      <linearGradient id="fin3d" x1="0" x2="1"><stop offset="0%" stopColor="#364b65"/><stop offset="55%" stopColor="#a6b2c1"/><stop offset="100%" stopColor="#2e435b"/></linearGradient>
    </defs>
    <line x1="48" y1={top} x2="48" y2={bottom} className="dimension"/><line x1="41" y1={top} x2="55" y2={top} className="dimension"/><line x1="41" y1={bottom} x2="55" y2={bottom} className="dimension"/>
    <text x="28" y={(top+bottom)/2} transform={`rotate(-90 28 ${(top+bottom)/2})`} className="dimtext">{vehicle.totalLength || '—'} mm</text>
    <polygon points={ogivePoints} className="rocket-shell"/>
    <rect x={x} y={yBay} width={w} height={bayH} className="rocket-shell"/><rect x={x} y={yBody} width={w} height={bodyH} className="rocket-shell"/>
    <rect x={x} y={yBay+12} width={w} height="15" className="reflective-band"/><rect x={x} y={bottom-116} width={w} height="15" className="reflective-band"/>
    <line x1={x-8} y1={yBay} x2={x+w+8} y2={yBay} className="station"/><line x1={x-8} y1={yBody} x2={x+w+8} y2={yBody} className="station"/>
    <polygon points={`${x},${bottom-92} ${x},${bottom-12} ${x-60},${bottom+10} ${x-37},${bottom-75}`} className="rocket-fin"/>
    <polygon points={`${x+w},${bottom-92} ${x+w},${bottom-12} ${x+w+60},${bottom+10} ${x+w+37},${bottom-75}`} className="rocket-fin"/>
    <path d={`M ${x+w/2-14} ${bottom} L ${x+w/2+14} ${bottom} L ${x+w/2+10} ${bottom+24} L ${x+w/2-10} ${bottom+24} Z`} className="nozzle"/>
    <text x={x+w/2} y={yBay+bayH/2-8} className="module-label">PAYLOAD +</text><text x={x+w/2} y={yBay+bayH/2+7} className="module-label">ELECTRONICS</text>
    <text x={x+w/2} y={yBody+bodyH*.34} className="utn-mark">UTN</text><text x={x+w/2} y={yBody+bodyH*.34+18} className="module-label">FRH · G07</text>
    <text x="300" y={top+noseH/2} className="callout">NOSE · {nose} mm</text><text x="300" y={yBay+bayH/2} className="callout">BAY · {bay} mm</text><text x="300" y={yBody+bodyH/2} className="callout">BODY · {body} mm</text>
  </svg>
  <div className="schematic-meta"><span><i className="dot frozen"/> Ø {vehicle.diameter || '—'} mm</span><span><i className="dot provisional"/> {vehicle.airfoil}</span><span><i className="dot tbd"/> {vehicle.noseProfile.replace(/_/g, " ")}</span></div>
  </div>;
}
