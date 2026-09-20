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
  nozzleLength?: NumericField;
  nozzleNeckDiameter?: NumericField;
  nozzleExitDiameter?: NumericField;
};

type ComponentCg = {
  name: string;
  x_cg_mm: number;
};

type AssemblyStation = {
  key: string;
  name: string;
  x_start_mm: number | null;
  x_end_mm: number | null;
  raw_length_mm: number;
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
  assemblyStations = [],
  showComponentCgs = true,
  lang = 'es',
}: {
  vehicle: VehicleLike;
  cgMm?: number | null;
  cpMm?: number | null;
  componentCgs?: ComponentCg[];
  assemblyStations?: AssemblyStation[];
  showComponentCgs?: boolean;
  lang?: 'es' | 'en';
}) {
  const isEs = lang === 'es';
  const txt = (es: string, en: string) => isEs ? es : en;
  const componentLabel = (name: string) => !isEs ? ({ 'Cofia':'Nose', 'Cuerpo principal':'Main body', 'Motor':'Motor', 'Paracaídas':'Parachute', 'Electrónica':'Electronics', 'Carga útil':'Payload', 'Aletas · 4 total':'Fins · 4 total' } as Record<string,string>)[name] ?? name : name;
  const noseProfileLabel = vehicle.noseProfile === 'tangent_ogive' ? txt('ojiva tangente','tangent ogive') : vehicle.noseProfile === 'von_karman' ? 'Von Kármán' : vehicle.noseProfile === 'power_series' ? txt('serie de potencias','power series') : vehicle.noseProfile.replace(/_/g,' ');
  const total = Number(vehicle.totalLength) || 789;
  const diameter = Number(vehicle.diameter) || 63;
  const nose = Number(vehicle.noseLength) || 180;
  const bay = Number(vehicle.bayLength) || 180;
  const body = Number(vehicle.bodyLength) || Math.max(total - nose - bay, 0);
  const stationByKey = new Map(assemblyStations.map((station) => [station.key, station]));
  const noseStation = stationByKey.get('nose');
  const c1Station = stationByKey.get('c1_parachute_payload');
  const c2Station = stationByKey.get('c2');
  const tailStation = stationByKey.get('tail_fin_can');
  const useAssembly = [noseStation, c1Station, c2Station, tailStation].every(
    (station) => station?.x_start_mm != null && station?.x_end_mm != null,
  );

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
  const bodyShellStartY = top + (useAssembly ? Number(noseStation!.x_end_mm) : nose) * scale;
  const c1CenterY = useAssembly
    ? top + (Number(c1Station!.x_start_mm) + Number(c1Station!.x_end_mm)) * scale / 2
    : yBay + bayH / 2;
  const lowerMarkY = useAssembly
    ? top + (Number(c2Station!.x_start_mm) + Number(tailStation!.x_end_mm)) * scale / 2
    : yBody + bodyH * .28;
  const assemblyLabel = (key: string) => ({
    nose: txt('COFIA', 'NOSE'),
    c1_parachute_payload: 'C1',
    c2: 'C2',
    tail_fin_can: txt('COLA', 'TAIL'),
  } as Record<string, string>)[key] ?? key;

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

  const finRoot = Number(vehicle.rootChord) || 97.67;
  const finTip = Number(vehicle.tipChord) || 39.96;
  const finSpan = Number(vehicle.span) || 52.5;
  const finSweep = Number(vehicle.sweep) || 42;
  const finX = Number(vehicle.finX) || 689;
  const finLeadY = top + finX * scale;
  const finRootTrailY = finLeadY + finRoot * scale;
  const finTipLeadY = finLeadY + finSweep * scale;
  const finTipTrailY = finTipLeadY + finTip * scale;
  const finOutLeft = x - finSpan * scale;
  const finOutRight = x + w + finSpan * scale;
  const nozzleLength = Number(vehicle.nozzleLength) > 0 ? Number(vehicle.nozzleLength) : 22;
  const nozzleNeckDiameter = Number(vehicle.nozzleNeckDiameter) > 0 ? Number(vehicle.nozzleNeckDiameter) : 16;
  const nozzleExitDiameter = Number(vehicle.nozzleExitDiameter) > 0 ? Number(vehicle.nozzleExitDiameter) : 12;

  const fromSupport = (fromNoseMm: number) => total - fromNoseMm;
  const yFromR7 = (r7Mm: number) => supportY - r7Mm * scale;
  const cgR7 = cgMm == null ? null : fromSupport(cgMm);
  const cpR7 = cpMm == null ? null : fromSupport(cpMm);
  const cgY = cgR7 == null ? null : yFromR7(cgR7);
  const cpY = cpR7 == null ? null : yFromR7(cpR7);
  const sectionDims = useAssembly
    ? assemblyStations
        .filter((station) => ['nose', 'c1_parachute_payload', 'c2', 'tail_fin_can'].includes(station.key))
        .map((station) => ({
          label: `${assemblyLabel(station.key)} · ${station.raw_length_mm.toFixed(0)} mm`,
          y1: top + Number(station.x_start_mm) * scale,
          y2: top + Number(station.x_end_mm) * scale,
        }))
    : [
        { label: `${nose.toFixed(0)} mm`, y1: top, y2: yBay },
        { label: `${bay.toFixed(0)} mm`, y1: yBay, y2: yBody },
        { label: `${body.toFixed(0)} mm`, y1: yBody, y2: bottom },
      ];

  const componentStations = distributeLabels(
    componentCgs
      .filter((component) => Number.isFinite(component.x_cg_mm))
      .map((component) => {
        const r7 = fromSupport(component.x_cg_mm);
        return { ...component, y: yFromR7(r7) };
      }),
    top + 8,
    bottom - 8,
  );

  return <div className="schematic realistic">
    <svg viewBox="0 0 720 590" role="img" aria-label={txt('Vista lateral técnica del cohete a escala geométrica', 'Rocket technical side view to geometric scale')}>
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
        {txt('TOTAL', 'TOTAL')} {total.toFixed(0)} mm
      </text>

      {sectionDims.map((dim, index) => <g key={dim.label + index}>
        <line x1="76" y1={dim.y1} x2="76" y2={dim.y2} className="dimension dimension-arrowed" markerStart="url(#dimArrow)" markerEnd="url(#dimArrow)"/>
        <line x1="69" y1={dim.y1} x2="87" y2={dim.y1} className="dimension"/>
        <line x1="69" y1={dim.y2} x2="87" y2={dim.y2} className="dimension"/>
        <text x="62" y={(dim.y1 + dim.y2) / 2} transform={`rotate(-90 62 ${(dim.y1 + dim.y2) / 2})`} className="dimtext">{dim.label}</text>
      </g>)}

      <polygon points={ogivePoints} className="rocket-shell"/>
      {useAssembly ? (
        <rect x={x} y={bodyShellStartY} width={w} height={bottom - bodyShellStartY} className="rocket-shell"/>
      ) : (
        <>
          <rect x={x} y={yBay} width={w} height={bayH} className="rocket-shell"/>
          <rect x={x} y={yBody} width={w} height={bodyH} className="rocket-shell"/>
        </>
      )}

      <rect x={x} y={yBay + 12 * scale} width={w} height={15 * scale} className="reflective-band"/>
      <rect x={x} y={bottom - 116 * scale} width={w} height={15 * scale} className="reflective-band"/>

      {useAssembly ? (
        [noseStation!, c1Station!, c2Station!].map((station) => (
          <line
            key={station.key}
            x1={x - 8}
            y1={top + Number(station.x_end_mm) * scale}
            x2={x + w + 8}
            y2={top + Number(station.x_end_mm) * scale}
            className="station"
          />
        ))
      ) : (
        <>
          <line x1={x - 8} y1={yBay} x2={x + w + 8} y2={yBay} className="station"/>
          <line x1={x - 8} y1={yBody} x2={x + w + 8} y2={yBody} className="station"/>
        </>
      )}

      <polygon
        points={`${x},${finLeadY} ${x},${finRootTrailY} ${finOutLeft},${finTipTrailY} ${finOutLeft},${finTipLeadY}`}
        className="rocket-fin"
      />
      <polygon
        points={`${x + w},${finLeadY} ${x + w},${finRootTrailY} ${finOutRight},${finTipTrailY} ${finOutRight},${finTipLeadY}`}
        className="rocket-fin"
      />

      <path
        d={`M ${centerX - nozzleNeckDiameter * scale / 2} ${bottom} L ${centerX + nozzleNeckDiameter * scale / 2} ${bottom} L ${centerX + nozzleExitDiameter * scale / 2} ${bottom + nozzleLength * scale} L ${centerX - nozzleExitDiameter * scale / 2} ${bottom + nozzleLength * scale} Z`}
        className="nozzle"
      />

      <text x={centerX} y={c1CenterY - 3.5} className="module-label payload-label">{txt('CARGA ÚTIL', 'PAYLOAD')}</text>
      <text x={centerX} y={c1CenterY + 4.5} className="module-label electronics-label">{txt('ELECTRÓNICA', 'ELECTRONICS')}</text>
      <text x={centerX} y={lowerMarkY} className="utn-mark">UTN</text>
      <text x={centerX} y={lowerMarkY + 12} className="module-label utn-submark">FRH · G07</text>

      <line x1="365" y1={top + 18} x2="365" y2={supportY} className="datum-rail"/>
      <text x="365" y={supportY + 18} textAnchor="middle" className="datum-label">{txt('REFERENCIA R7', 'R7 REFERENCE')} · 0 mm</text>

      {cgY !== null && <>
        <line x1={centerX} y1={cgY} x2="360" y2={cgY} className="projection-line cg-projection"/>
        <circle cx="365" cy={cgY} r="3.5" className="datum-tick cg-datum"/>
        <g transform={`translate(${centerX} ${cgY})`} aria-label={txt('CG total en estación axial exacta', 'Total CG at exact axial station')}>
          <circle r="8.2" className="cg-total-ring"/>
          <path d="M 0 0 L 0 -8.2 A 8.2 8.2 0 0 1 8.2 0 Z" className="cg-total-fill"/>
          <path d="M 0 0 L 0 8.2 A 8.2 8.2 0 0 1 -8.2 0 Z" className="cg-total-fill"/>
          <line x1="-10.5" y1="0" x2="10.5" y2="0" className="cg-total-cross"/>
          <line x1="0" y1="-10.5" x2="0" y2="10.5" className="cg-total-cross"/>
        </g>
        <line x1={centerX + 11} y1={cgY} x2="430" y2={cgY} className="cg-leader"/>
        <line x1="430" y1={supportY} x2="430" y2={cgY} className="cg-dimension" markerStart="url(#dimArrow)" markerEnd="url(#dimArrow)"/>
        <line x1="423" y1={supportY} x2="437" y2={supportY} className="cg-dimension"/>
        <line x1="423" y1={cgY} x2="437" y2={cgY} className="cg-dimension"/>
        <text x="444" y={cgY - 8} className="cg-label label-plate">CG TOTAL · {cgR7!.toFixed(1)} mm R7</text>
      </>}

      {cpY !== null && <>
        <line x1={centerX} y1={cpY} x2="455" y2={cpY} className="projection-line cp-projection"/>
        <circle cx="455" cy={cpY} r="3.5" className="datum-tick cp-datum"/>
        <g transform={`translate(${centerX} ${cpY})`} aria-label={txt('CP total en estación axial exacta', 'Total CP at exact axial station')}>
          <circle r="7.4" className="cp-total-ring"/>
          <circle r="2.2" className="cp-total-core"/>
          <line x1="-10" y1="0" x2="10" y2="0" className="cp-total-cross"/>
          <line x1="0" y1="-10" x2="0" y2="10" className="cp-total-cross"/>
        </g>
        <line x1={centerX + 10} y1={cpY} x2="535" y2={cpY} className="cp-leader"/>
        <line x1="535" y1={supportY} x2="535" y2={cpY} className="cp-dimension" markerStart="url(#dimArrow)" markerEnd="url(#dimArrow)"/>
        <line x1="528" y1={supportY} x2="542" y2={supportY} className="cp-dimension"/>
        <line x1="528" y1={cpY} x2="542" y2={cpY} className="cp-dimension"/>
        <text x="548" y={cpY - 8} className="cp-label label-plate">CP TOTAL · {cpR7!.toFixed(1)} mm R7</text>
      </>}

      {showComponentCgs && componentStations.map((component) => {
        const r7 = fromSupport(component.x_cg_mm);
        const textY = component.labelY - 5;
        return <g key={component.name}>
          <g transform={`translate(${centerX} ${component.y})`} aria-label={isEs ? `CG de ${component.name} en estación axial exacta` : `${componentLabel(component.name)} CG at exact axial station`}>
            <circle r="5.2" className="component-cg-ring"/>
            <path d="M 0 0 L 0 -5.2 A 5.2 5.2 0 0 1 5.2 0 Z" className="component-cg-fill"/>
            <path d="M 0 0 L 0 5.2 A 5.2 5.2 0 0 1 -5.2 0 Z" className="component-cg-fill"/>
            <line x1="-6.8" y1="0" x2="6.8" y2="0" className="component-cg-cross"/>
            <line x1="0" y1="-6.8" x2="0" y2="6.8" className="component-cg-cross"/>
          </g>
          <path
            d={`M ${centerX + 7} ${component.y} L 545 ${component.y} L 558 ${component.labelY}`}
            className="component-cg-projection"
          />
          <text x="574" y={textY} className="component-cg-label label-plate">
            {componentLabel(component.name)} · xCG {r7.toFixed(1)} mm R7
          </text>
        </g>;
      })}

      {useAssembly ? (
        [noseStation!, c1Station!, c2Station!, tailStation!].map((station) => (
          <text
            key={'label-' + station.key}
            x={x - 34}
            y={top + (Number(station.x_start_mm) + Number(station.x_end_mm)) * scale / 2}
            textAnchor="end"
            className="section-name"
          >
            {assemblyLabel(station.key)}
          </text>
        ))
      ) : (
        <>
          <text x={x - 34} y={top + noseH / 2} textAnchor="end" className="section-name">{txt('COFIA', 'NOSE')}</text>
          <text x={x - 34} y={yBay + bayH / 2} textAnchor="end" className="section-name">{txt('COMPART.', 'BAY')}</text>
          <text x={x - 34} y={yBody + bodyH / 2} textAnchor="end" className="section-name">{txt('CUERPO', 'BODY')}</text>
        </>
      )}

      <text x="112" y={bottom + 36} className="scale-note-svg">
        {txt('ESCALA GEOMÉTRICA ÚNICA', 'SINGLE GEOMETRIC SCALE')} · 1 px = {(1 / scale).toFixed(2)} mm
      </text>
    </svg>
    <div className="schematic-meta">
      <span><i className="dot frozen"/> Ø {diameter.toFixed(0)} mm</span>
      <span><i className="dot provisional"/> {vehicle.airfoil}</span>
      <span><i className="dot tbd"/> {noseProfileLabel}</span>
      <span>{txt('CG/CP y aletas a escala geométrica', 'CG/CP and fins at geometric scale')}</span>
    </div>
  </div>;
}
