import React from 'react';

type NumericField = number | '';
type VehicleLike = {
  totalLength: NumericField; diameter: NumericField; noseLength: NumericField;
  bayLength: NumericField; bodyLength: NumericField; airfoil: string; noseProfile: string;
};

type ComponentCg = {
  name: string;
  x_cg_mm: number;
};

export function RocketRealistic({
  vehicle,
  cgMm,
  cpMm,
  componentCgs = [],
  showComponentCgs = false,
}: {
  vehicle: VehicleLike;
  cgMm?: number | null;
  cpMm?: number | null;
  componentCgs?: ComponentCg[];
  showComponentCgs?: boolean;
}) {
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
  const cgY = cgMm == null ? null : top + cgMm * scale;
  const cpY = cpMm == null ? null : top + cpMm * scale;
  const supportY = bottom;
  const fromSupport = (fromNoseMm: number) => total - fromNoseMm;
  const sectionDims = [
    { label: `${nose.toFixed(0)} mm`, y1: top, y2: yBay },
    { label: `${bay.toFixed(0)} mm`, y1: yBay, y2: yBody },
    { label: `${body.toFixed(0)} mm`, y1: yBody, y2: bottom },
  ];

  return <div className="schematic realistic"><svg viewBox="0 0 470 590" role="img" aria-label="Rocket side view">
    <defs>
      <linearGradient id="shell3d" x1="0" x2="1"><stop offset="0%" stopColor="#596b82"/><stop offset="20%" stopColor="#dce5ef"/><stop offset="50%" stopColor="#f7f9fc"/><stop offset="82%" stopColor="#aebdce"/><stop offset="100%" stopColor="#50647e"/></linearGradient>
      <linearGradient id="fin3d" x1="0" x2="1"><stop offset="0%" stopColor="#364b65"/><stop offset="55%" stopColor="#a6b2c1"/><stop offset="100%" stopColor="#2e435b"/></linearGradient>
      <marker id="dimArrow" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse">
        <path d="M 0 0 L 7 3.5 L 0 7 Z" className="dim-arrow"/>
      </marker>
    </defs>
    <line x1="38" y1={top} x2="38" y2={bottom} className="dimension dimension-arrowed" markerStart="url(#dimArrow)" markerEnd="url(#dimArrow)"/>
    <line x1="31" y1={top} x2="52" y2={top} className="dimension"/>
    <line x1="31" y1={bottom} x2="52" y2={bottom} className="dimension"/>
    <text x="18" y={(top+bottom)/2} transform={`rotate(-90 18 ${(top+bottom)/2})`} className="dimtext">TOTAL {vehicle.totalLength || '—'} mm</text>

    {sectionDims.map((dim, index) => <g key={dim.label + index}>
      <line x1="76" y1={dim.y1} x2="76" y2={dim.y2} className="dimension dimension-arrowed" markerStart="url(#dimArrow)" markerEnd="url(#dimArrow)"/>
      <line x1="69" y1={dim.y1} x2="87" y2={dim.y1} className="dimension"/>
      <line x1="69" y1={dim.y2} x2="87" y2={dim.y2} className="dimension"/>
      <text x="62" y={(dim.y1 + dim.y2) / 2} transform={`rotate(-90 62 ${(dim.y1 + dim.y2) / 2})`} className="dimtext">{dim.label}</text>
    </g>)}
    <polygon points={ogivePoints} className="rocket-shell"/>
    <rect x={x} y={yBay} width={w} height={bayH} className="rocket-shell"/><rect x={x} y={yBody} width={w} height={bodyH} className="rocket-shell"/>
    <rect x={x} y={yBay+12} width={w} height="15" className="reflective-band"/><rect x={x} y={bottom-116} width={w} height="15" className="reflective-band"/>
    <line x1={x-8} y1={yBay} x2={x+w+8} y2={yBay} className="station"/><line x1={x-8} y1={yBody} x2={x+w+8} y2={yBody} className="station"/>
    <polygon points={`${x},${bottom-92} ${x},${bottom-12} ${x-60},${bottom+10} ${x-37},${bottom-75}`} className="rocket-fin"/>
    <polygon points={`${x+w},${bottom-92} ${x+w},${bottom-12} ${x+w+60},${bottom+10} ${x+w+37},${bottom-75}`} className="rocket-fin"/>
    <path d={`M ${x+w/2-14} ${bottom} L ${x+w/2+14} ${bottom} L ${x+w/2+10} ${bottom+24} L ${x+w/2-10} ${bottom+24} Z`} className="nozzle"/>
    <text x={x+w/2} y={yBay+bayH/2-8} className="module-label">PAYLOAD +</text><text x={x+w/2} y={yBay+bayH/2+7} className="module-label">ELECTRONICS</text>
    <text x={x+w/2} y={yBody+bodyH*.34} className="utn-mark">UTN</text><text x={x+w/2} y={yBody+bodyH*.34+18} className="module-label">FRH · G07</text>

    {cgY !== null && <>
      <line x1={centerX} y1={cgY} x2="318" y2={cgY} className="projection-line cg-projection"/>
      <line x1="322" y1={supportY} x2="322" y2={cgY} className="cg-dimension" markerStart="url(#dimArrow)" markerEnd="url(#dimArrow)"/>
      <line x1="314" y1={supportY} x2="332" y2={supportY} className="cg-dimension"/>
      <line x1="314" y1={cgY} x2="332" y2={cgY} className="cg-dimension"/>
      <g transform={`translate(286 ${cgY})`} aria-label="Center of gravity marker">
        <circle r="10" className="cg-ring"/>
        <path d="M 0 0 L 0 -10 A 10 10 0 0 1 10 0 Z" className="cg-fill"/>
        <path d="M 0 0 L 0 10 A 10 10 0 0 1 -10 0 Z" className="cg-fill"/>
        <line x1="-14" y1="0" x2="14" y2="0" className="cg-cross"/>
        <line x1="0" y1="-14" x2="0" y2="14" className="cg-cross"/>
      </g>
      <text x="338" y={cgY + 4} className="cg-label">CG {fromSupport(cgMm!).toFixed(1)} mm desde apoyo</text>
    </>}

    {cpY !== null && <>
      <line x1={centerX} y1={cpY} x2="368" y2={cpY} className="projection-line cp-projection"/>
      <line x1="372" y1={supportY} x2="372" y2={cpY} className="cp-dimension" markerStart="url(#dimArrow)" markerEnd="url(#dimArrow)"/>
      <line x1="364" y1={supportY} x2="382" y2={supportY} className="cp-dimension"/>
      <line x1="364" y1={cpY} x2="382" y2={cpY} className="cp-dimension"/>
      <g transform={`translate(346 ${cpY})`} aria-label="Center of pressure marker">
        <circle r="9" className="cp-ring"/>
        <line x1="-13" y1="0" x2="13" y2="0" className="cp-cross"/>
        <line x1="0" y1="-13" x2="0" y2="13" className="cp-cross"/>
      </g>
      <text x="388" y={cpY + 4} className="cp-label">CP {fromSupport(cpMm!).toFixed(1)} mm</text>
    </>}

    {showComponentCgs && componentCgs.map((component, index) => {
      const y = top + component.x_cg_mm * scale;
      const xMarker = index % 2 === 0 ? 248 : 258;
      return <g key={component.name}>
        <line x1={x + w + 2} y1={y} x2={xMarker - 5} y2={y} className="component-cg-projection"/>
        <circle cx={xMarker} cy={y} r="4.5" className="component-cg-dot"/>
        <text x={xMarker + 8} y={y - 7} className="component-cg-label">
          {component.name} · {fromSupport(component.x_cg_mm).toFixed(1)} mm
        </text>
      </g>;
    })}

    <text x="300" y={top+noseH/2} className="callout">NOSE · {nose} mm</text><text x="300" y={yBay+bayH/2} className="callout">BAY · {bay} mm</text><text x="300" y={yBody+bodyH/2} className="callout">BODY · {body} mm</text>
  </svg>
  <div className="schematic-meta"><span><i className="dot frozen"/> Ø {vehicle.diameter || '—'} mm</span><span><i className="dot provisional"/> {vehicle.airfoil}</span><span><i className="dot tbd"/> {vehicle.noseProfile.replace(/_/g, " ")}</span></div>
  </div>;
}