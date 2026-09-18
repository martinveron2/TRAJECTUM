import React from 'react';

type NumericField = number | '';
type VehicleLike = {
  totalLength: NumericField;
  diameter: NumericField;
  noseLength: NumericField;
  bayLength: NumericField;
  bodyLength: NumericField;
  rootChord: NumericField;
  tipChord: NumericField;
  span: NumericField;
  sweep: NumericField;
  finX: NumericField;
  airfoil: string;
  noseProfile: string;
};

type ComponentCg = {
  name: string;
  x_cg_mm: number;
};

type LabelStation = ComponentCg & {
  y: number;
  labelY: number;
};

function distributeLabels(items: Array<ComponentCg & { y: number }>, top: number, bottom: number): LabelStation[] {
  if (!items.length) return [];
  const ordered = [...items].sort((a, b) => a.y - b.y);
  const minGap = 19;
  const labels = ordered.map((item) => ({ ...item, labelY: item.y }));

  labels[0].labelY = Math.max(labels[0].labelY, top);
  for (let i = 1; i < labels.length; i += 1) {
    labels[i].labelY = Math.max(labels[i].y, labels[i - 1].labelY + minGap);
  }

  const overflow = labels[labels.length - 1].labelY - bottom;
  if (overflow > 0) {
    labels.forEach((item) => { item.labelY -= overflow; });
  }

  for (let i = labels.length - 2; i >= 0; i -= 1) {
    labels[i].labelY = Math.min(labels[i].labelY, labels[i + 1].labelY - minGap);
  }
  const underflow = top - labels[0].labelY;
  if (underflow > 0) {
    labels.forEach((item) => { item.labelY += underflow; });
  }
  return labels;
}

export function RocketRealistic({
  vehicle,
  cgMm,
  cpMm,
  componentCgs = [],
  showComponentCgs = true,
}: {
  vehicle: VehicleLike;
  cgMm?: number | null;
  cpMm?: number | null;
  componentCgs?: ComponentCg[];
  showComponentCgs?: boolean;
}) {
  const total = Number(vehicle.totalLength) || 860;
  const diameter = Number(vehicle.diameter) || 63;
  const nose = Number(vehicle.noseLength) || 180;
  const bay = Number(vehicle.bayLength) || 180;
  const body = Number(vehicle.bodyLength) || Math.max(total - nose - bay, 0);

  // One single geometric scale is used for BOTH axial and radial dimensions.
  // This makes the rocket silhouette, diameter, fin span and all stations truly proportional.
  const top = 24;
  const usable = 500;
  const scale = usable / total;
  const w = diameter * scale;
  const x = 245 - w / 2;
  const centerX = x + w / 2;
  const noseH = nose * scale;
  const bayH = bay * scale;
  const bodyH = body * scale;
  const yBay = top + noseH;
  const yBody = yBay + bayH;
  const bottom = top + total * scale;
  const supportY = bottom;

  const radiusMm = diameter / 2;
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

  const ogive = Array.from({ length: 61 }, (_, i) => {
    const axial = nose * i / 60;
    const radius = profileRadius(axial);
    return { y: top + axial * scale, half: radius * scale };
  });
  const left = ogive.map((p) => `${centerX - p.half},${p.y}`).join(' ');
  const right = [...ogive].reverse().map((p) => `${centerX + p.half},${p.y}`).join(' ');
  const ogivePoints = `${left} ${right}`;

  const finRoot = Number(vehicle.rootChord) || 80;
  const finTip = Number(vehicle.tipChord) || 40;
  const finSpan = Number(vehicle.span) || 50;
  const finSweep = Number(vehicle.sweep) || 20;
  const finX = Number(vehicle.finX) || 760;
  const finLeadY = top + finX * scale;
  const finRootTrailY = finLeadY + finRoot * scale;
  const finTipLeadY = finLeadY + finSweep * scale;
  const finTipTrailY = finTipLeadY + finTip * scale;
  const finOutLeft = x - finSpan * scale;
  const finOutRight = x + w + finSpan * scale;

  const cgY = cgMm == null ? null : top + cgMm * scale;
  const cpY = cpMm == null ? null : top + cpMm * scale;
  const fromSupport = (fromNoseMm: number) => total - fromNoseMm;
  const sectionDims = [
    { label: `${nose.toFixed(0)} mm`, y1: top, y2: yBay },
    { label: `${bay.toFixed(0)} mm`, y1: yBay, y2: yBody },
    { label: `${body.toFixed(0)} mm`, y1: yBody, y2: bottom },
  ];

  const componentStations = distributeLabels(
    componentCgs
      .filter((component) => Number.isFinite(component.x_cg_mm))
      .map((component) => ({ ...component, y: top + component.x_cg_mm * scale })),
    top + 8,
    bottom - 8,
  );

  return <div className="schematic realistic">
    <svg viewBox="0 0 720 590" role="img" aria-label="Rocket technical side view to geometric scale">
      <defs>
        <linearGradient id="shell3d" x1="0" x2="1">
          <stop offset="0%" stopColor="#596b82"/>
          <stop offset="20%" stopColor="#dce5ef"/>
          <stop offset="50%" stopColor="#f7f9fc"/>
          <stop offset="82%" stopColor="#aebdce"/>
          <stop offset="100%" stopColor="#50647e"/>
        </linearGradient>
        <linearGradient id="fin3d" x1="0" x2="1">
          <stop offset="0%" stopColor="#364b65"/>
          <stop offset="55%" stopColor="#a6b2c1"/>
          <stop offset="100%" stopColor="#2e435b"/>
        </linearGradient>
        <marker id="dimArrow" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse">
          <path d="M 0 0 L 7 3.5 L 0 7 Z" className="dim-arrow"/>
        </marker>
      </defs>

      <line x1="38" y1={top} x2="38" y2={bottom} className="dimension dimension-arrowed" markerStart="url(#dimArrow)" markerEnd="url(#dimArrow)"/>
      <line x1="31" y1={top} x2="52" y2={top} className="dimension"/>
      <line x1="31" y1={bottom} x2="52" y2={bottom} className="dimension"/>
      <text x="18" y={(top + bottom) / 2} transform={`rotate(-90 18 ${(top + bottom) / 2})`} className="dimtext">
        TOTAL {total.toFixed(0)} mm
      </text>

      {sectionDims.map((dim, index) => <g key={dim.label + index}>
        <line x1="76" y1={dim.y1} x2="76" y2={dim.y2} className="dimension dimension-arrowed" markerStart="url(#dimArrow)" markerEnd="url(#dimArrow)"/>
        <line x1="69" y1={dim.y1} x2="87" y2={dim.y1} className="dimension"/>
        <line x1="69" y1={dim.y2} x2="87" y2={dim.y2} className="dimension"/>
        <text x="62" y={(dim.y1 + dim.y2) / 2} transform={`rotate(-90 62 ${(dim.y1 + dim.y2) / 2})`} className="dimtext">{dim.label}</text>
      </g>)}

      <polygon points={ogivePoints} className="rocket-shell"/>
      <rect x={x} y={yBay} width={w} height={bayH} className="rocket-shell"/>
      <rect x={x} y={yBody} width={w} height={bodyH} className="rocket-shell"/>

      <rect x={x} y={yBay + 12 * scale} width={w} height={15 * scale} className="reflective-band"/>
      <rect x={x} y={bottom - 116 * scale} width={w} height={15 * scale} className="reflective-band"/>

      <line x1={x - 8} y1={yBay} x2={x + w + 8} y2={yBay} className="station"/>
      <line x1={x - 8} y1={yBody} x2={x + w + 8} y2={yBody} className="station"/>

      <polygon
        points={`${x},${finLeadY} ${x},${finRootTrailY} ${finOutLeft},${finTipTrailY} ${finOutLeft},${finTipLeadY}`}
        className="rocket-fin"
      />
      <polygon
        points={`${x + w},${finLeadY} ${x + w},${finRootTrailY} ${finOutRight},${finTipTrailY} ${finOutRight},${finTipLeadY}`}
        className="rocket-fin"
      />

      <path
        d={`M ${centerX - 8 * scale} ${bottom} L ${centerX + 8 * scale} ${bottom} L ${centerX + 6 * scale} ${bottom + 22 * scale} L ${centerX - 6 * scale} ${bottom + 22 * scale} Z`}
        className="nozzle"
      />

      <text x={centerX} y={yBay + bayH / 2 - 5} className="module-label payload-label">PAYLOAD</text>
      <text x={centerX} y={yBay + bayH / 2 + 6} className="module-label payload-label">ELECTRONICS</text>
      <text x={centerX} y={yBody + bodyH * .28} className="utn-mark">UTN</text>
      <text x={centerX} y={yBody + bodyH * .28 + 12} className="module-label utn-submark">FRH · G07</text>

      <line x1="365" y1={top} x2="365" y2={supportY} className="datum-rail"/>
      <text x="365" y={supportY + 18} textAnchor="middle" className="datum-label">R7 · 0 mm</text>
      <text x="365" y={top - 6} textAnchor="middle" className="datum-label">EJE X · HACIA PUNTA</text>

      {cgY !== null && <>
        <line x1={centerX} y1={cgY} x2="360" y2={cgY} className="projection-line cg-projection"/>
        <circle cx="365" cy={cgY} r="3.5" className="datum-tick cg-datum"/>
        <circle cx={centerX} cy={cgY} r="2.8" className="cg-station-dot"/>
        <line x1={centerX + 4} y1={cgY} x2="398" y2={cgY} className="cg-leader"/>
        <g transform={`translate(398 ${cgY})`} aria-label="Center of gravity symbol at exact axial station">
          <circle r="7.2" className="cg-ring"/>
          <path d="M 0 0 L 0 -7.2 A 7.2 7.2 0 0 1 7.2 0 Z" className="cg-fill"/>
          <path d="M 0 0 L 0 7.2 A 7.2 7.2 0 0 1 -7.2 0 Z" className="cg-fill"/>
          <line x1="-9.5" y1="0" x2="9.5" y2="0" className="cg-cross"/>
          <line x1="0" y1="-9.5" x2="0" y2="9.5" className="cg-cross"/>
        </g>
        <line x1="430" y1={supportY} x2="430" y2={cgY} className="cg-dimension" markerStart="url(#dimArrow)" markerEnd="url(#dimArrow)"/>
        <line x1="423" y1={supportY} x2="437" y2={supportY} className="cg-dimension"/>
        <line x1="423" y1={cgY} x2="437" y2={cgY} className="cg-dimension"/>
        <text x="444" y={cgY + 3} className="cg-label">CG TOTAL · {fromSupport(cgMm!).toFixed(1)} mm R7</text>
      </>}

      {cpY !== null && <>
        <line x1={centerX} y1={cpY} x2="455" y2={cpY} className="projection-line cp-projection"/>
        <circle cx="455" cy={cpY} r="3.5" className="datum-tick cp-datum"/>
        <circle cx={centerX} cy={cpY} r="2.8" className="cp-station-dot"/>
        <line x1={centerX + 4} y1={cpY} x2="505" y2={cpY} className="cp-leader"/>
        <g transform={`translate(505 ${cpY})`} aria-label="Center of pressure symbol at exact axial station">
          <circle r="6.8" className="cp-ring"/>
          <line x1="-9" y1="0" x2="9" y2="0" className="cp-cross"/>
          <line x1="0" y1="-9" x2="0" y2="9" className="cp-cross"/>
        </g>
        <line x1="535" y1={supportY} x2="535" y2={cpY} className="cp-dimension" markerStart="url(#dimArrow)" markerEnd="url(#dimArrow)"/>
        <line x1="528" y1={supportY} x2="542" y2={supportY} className="cp-dimension"/>
        <line x1="528" y1={cpY} x2="542" y2={cpY} className="cp-dimension"/>
        <text x="548" y={cpY + 3} className="cp-label">CP TOTAL · {fromSupport(cpMm!).toFixed(1)} mm R7</text>
      </>}

      {showComponentCgs && componentStations.map((component) => <>
        <g key={`mark-${component.name}`} aria-label={`${component.name} component CG at exact axial station`}>
          <circle cx={centerX} cy={component.y} r="3.7" className="component-cg-dot"/>
          <line x1={centerX - 7} y1={component.y} x2={centerX + 7} y2={component.y} className="component-cg-cross"/>
        </g>
        <path
          key={`leader-${component.name}`}
          d={`M ${centerX + 7} ${component.y} L 568 ${component.y} L 582 ${component.labelY}`}
          className="component-cg-projection"
        />
        <line
          key={`tick-${component.name}`}
          x1="562"
          y1={component.y}
          x2="574"
          y2={component.y}
          className="component-cg-tick"
        />
        <text
          key={`label-${component.name}`}
          x="590"
          y={component.labelY + 3}
          className="component-cg-label"
        >
          {component.name} · xCG {fromSupport(component.x_cg_mm).toFixed(1)} mm R7
        </text>
      </>)}

      <text x="300" y={top + noseH / 2} className="callout">NOSE · {nose} mm</text>
      <text x="300" y={yBay + bayH / 2} className="callout">BAY · {bay} mm</text>
      <text x="300" y={yBody + bodyH / 2} className="callout">BODY · {body} mm</text>

      <text x="112" y={bottom + 36} className="scale-note-svg">
        ESCALA GEOMÉTRICA ÚNICA · 1 px = {(1 / scale).toFixed(2)} mm
      </text>
    </svg>
    <div className="schematic-meta">
      <span><i className="dot frozen"/> Ø {diameter.toFixed(0)} mm</span>
      <span><i className="dot provisional"/> {vehicle.airfoil}</span>
      <span><i className="dot tbd"/> {vehicle.noseProfile.replace(/_/g, ' ')}</span>
      <span>CG/CP y aletas a escala geométrica</span>
    </div>
  </div>;
}
