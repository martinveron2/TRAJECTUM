import React, { useEffect, useMemo, useState } from 'react';

type NumericField = number | '';
type VehicleLike = {
  totalLength: NumericField; diameter: NumericField; noseLength: NumericField; bayLength: NumericField; bodyLength: NumericField; finCount: NumericField;
  rootChord: NumericField; tipChord: NumericField; span: NumericField;
  sweep: NumericField; finX: NumericField; launchAngle: NumericField; cd: NumericField;
  parachuteCd: NumericField; parachuteArea: NumericField; deployAltitude: NumericField; deployDelay: NumericField;
};
type ComponentRow = { id: number; name: string; massG: NumericField; kind: string; note: string };
type ComponentOut = { name: string; mass_g: number; x_cg_mm: number; source: string };
type ComponentResponse = { components: ComponentOut[]; total_mass_g: number; total_cg_mm: number };
type ComponentPayload = { name: string; mass_g: number; kind: string; x_start_mm?: number; x_end_mm?: number; length_mm?: number; base_radius_mm?: number; leading_edge_x_mm?: number; root_chord_mm?: number; tip_chord_mm?: number; span_mm?: number; sweep_mm?: number };
type Analysis = {
  total_mass_g: number; cg_x_mm_from_nose: number; cp_x_mm_from_nose: number;
  static_margin_calibers: number; apogee_m?: number; max_q_pa?: number;
  max_speed_m_s?: number; max_mach?: number;
  deployment_time_s?: number | null; deployment_altitude_m?: number | null;
  landing_time_s?: number; impact_speed_m_s?: number; time_to_apogee_s?: number;
};

const initialRows: ComponentRow[] = [
  { id: 1, name: 'Nose', massG: 100, kind: 'nose', note: 'xCG from tangent-ogive geometry' },
  { id: 2, name: 'Main airframe', massG: 330, kind: 'body', note: 'xCG from 180–860 mm envelope' },
  { id: 3, name: 'Motor', massG: 490, kind: 'motor', note: 'xCG from 670–860 mm envelope' },
  { id: 4, name: 'Parachute', massG: 30, kind: 'parachute', note: 'demo envelope 180–220 mm' },
  { id: 5, name: 'Payload', massG: 100, kind: 'payload', note: '90 mm bay: 180–270 mm' },
  { id: 6, name: 'Fins · 4 total', massG: 20, kind: 'fins', note: 'xCG from fin planform when complete' },
];

export function LiveAnalysisPanel({ vehicle, runToken = 0 }: { vehicle: VehicleLike; runToken?: number }) {
  const [rows, setRows] = useState(initialRows);
  const [componentResult, setComponentResult] = useState<ComponentResponse | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);

  const planformReady = [vehicle.tipChord, vehicle.sweep, vehicle.finX].every((v) => v !== '');
  const massesReady = rows.every((row) => row.massG !== '');
  const componentPayload = useMemo<ComponentPayload[]>(() => rows.flatMap<ComponentPayload>((row) => {
    const common = { name: row.name, mass_g: Number(row.massG) };
    if (row.kind === 'nose') return [{ ...common, kind: 'tangent_ogive_shell', length_mm: Number(vehicle.noseLength), base_radius_mm: Number(vehicle.diameter) / 2 }];
    if (row.kind === 'body') return [{ ...common, kind: 'axial_uniform', x_start_mm: Number(vehicle.noseLength), x_end_mm: Number(vehicle.totalLength) }];
    if (row.kind === 'motor') { const end = Number(vehicle.totalLength); return [{ ...common, kind: 'axial_uniform', x_start_mm: Math.max(end - 190, 0), x_end_mm: end }]; }
    if (row.kind === 'parachute') { const start = Number(vehicle.noseLength); return [{ ...common, kind: 'axial_uniform', x_start_mm: start, x_end_mm: start + 40 }]; }
    if (row.kind === 'payload') { const start = Number(vehicle.noseLength); return [{ ...common, kind: 'axial_uniform', x_start_mm: start, x_end_mm: start + Math.max(Number(vehicle.bayLength) / 2, 1) }]; }
    if (row.kind === 'fins' && planformReady) return [{ ...common, kind: 'trapezoidal_fin_set', leading_edge_x_mm: Number(vehicle.finX), root_chord_mm: Number(vehicle.rootChord), tip_chord_mm: Number(vehicle.tipChord), span_mm: Number(vehicle.span), sweep_mm: Number(vehicle.sweep) }];
    return [];
  }), [rows, vehicle, planformReady]);

  useEffect(() => {
    if (!massesReady) { setComponentResult(null); return; }
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/v1/components/cg', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(componentPayload),
        });
        if (response.ok) setComponentResult(await response.json());
      } catch { setComponentResult(null); }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [componentPayload, massesReady]);

  const updateMass = (id: number, value: NumericField) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, massG: value, note: 'mass edited locally; xCG remains geometry-derived' } : row));
    setAnalysis(null);
  };

  const derivedMasses = componentResult?.components.map((item) => ({
    name: item.name, mass_g: item.mass_g, x_cg_mm: item.x_cg_mm,
  })) ?? [];

  const run = async () => {
    if (!planformReady || !componentResult || derivedMasses.length !== rows.length) return;
    setRunning(true); setError('');
    try {
      const base = {
        nose_length_mm: Number(vehicle.noseLength), body_diameter_mm: Number(vehicle.diameter),
        fin_count: Number(vehicle.finCount), fin_root_chord_mm: Number(vehicle.rootChord),
        fin_tip_chord_mm: Number(vehicle.tipChord), fin_span_mm: Number(vehicle.span),
        fin_sweep_mm: Number(vehicle.sweep), fin_leading_edge_x_mm: Number(vehicle.finX),
        masses: derivedMasses,
      };
      const full = vehicle.cd !== '' && vehicle.launchAngle !== '';
      const endpoint = full ? '/v1/analysis/full' : '/v1/analysis/cg-cp';
      const body = full ? {
        ...base,
        launch_angle_deg: Number(vehicle.launchAngle),
        cd: Number(vehicle.cd),
        parachute_cd: Number(vehicle.parachuteCd),
        parachute_area_m2: Number(vehicle.parachuteArea),
        deploy_altitude_m: vehicle.deployAltitude === '' ? null : Number(vehicle.deployAltitude),
        deploy_delay_s: Number(vehicle.deployDelay),
      } : base;
      const response = await fetch(`http://127.0.0.1:8000${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error(`API ${response.status}`);
      setAnalysis(await response.json());
    } catch (e) { setError(e instanceof Error ? e.message : 'Unknown error'); }
    finally { setRunning(false); }
  };

  useEffect(() => {
    if (runToken > 0 && componentResult) void run();
  }, [runToken, componentResult]);

  const totalMass = analysis?.total_mass_g ?? componentResult?.total_mass_g;
  const totalCg = analysis?.cg_x_mm_from_nose ?? componentResult?.total_cg_mm;

  return <div className="panel mass-panel" id="engineering-analysis">
    <div className="panel-title compact"><div><p>GEOMETRY-DERIVED MASS PROPERTIES</p><h2>Component CG → vehicle CG → CP → flight → recovery</h2></div>
      <button className="run" disabled={!planformReady || !componentResult || derivedMasses.length !== rows.length || running} onClick={run}>{running ? 'RUNNING…' : planformReady ? (vehicle.cd !== '' ? 'RUN FULL ANALYSIS' : 'RUN CG + CP') : 'ENTER FIN GEOMETRY'}</button></div>
    <div className="module-state">
      <span className={componentResult ? 'module-on' : ''}>CG · {componentResult ? 'READY' : 'WAIT'}</span>
      <span className={planformReady ? 'module-on' : ''}>CP · {planformReady ? 'READY' : 'NEEDS FINS'}</span>
      <span className={vehicle.cd !== '' && planformReady ? 'module-on' : ''}>TRAJECTORY · {vehicle.cd !== '' && planformReady ? 'READY' : 'NEEDS Cd'}</span>
      <span className={vehicle.cd !== '' && planformReady ? 'module-on' : ''}>RECOVERY · {vehicle.cd !== '' && planformReady ? 'READY' : 'AFTER FLIGHT'}</span>
    </div>
    <div className="analysis-metrics wide">
      <div><span>TOTAL MASS</span><strong>{totalMass !== undefined ? `${totalMass.toFixed(1)} g` : '—'}</strong></div>
      <div><span>TOTAL CG</span><strong>{totalCg !== undefined ? `${totalCg.toFixed(1)} mm` : '—'}</strong></div>
      <div><span>CP</span><strong>{analysis ? `${analysis.cp_x_mm_from_nose.toFixed(1)} mm` : '—'}</strong></div>
      <div><span>STATIC MARGIN</span><strong>{analysis ? `${analysis.static_margin_calibers.toFixed(2)} cal` : '—'}</strong></div>
      <div><span>APOGEE</span><strong>{analysis?.apogee_m !== undefined ? `${analysis.apogee_m.toFixed(1)} m` : '—'}</strong></div>
      <div><span>MAX Q</span><strong>{analysis?.max_q_pa !== undefined ? `${analysis.max_q_pa.toFixed(0)} Pa` : '—'}</strong></div>
      <div><span>MAX SPEED</span><strong>{analysis?.max_speed_m_s !== undefined ? `${analysis.max_speed_m_s.toFixed(1)} m/s` : '—'}</strong></div>
      <div><span>MAX MACH</span><strong>{analysis?.max_mach !== undefined ? analysis.max_mach.toFixed(3) : '—'}</strong></div>
      <div><span>DEPLOY ALTITUDE</span><strong>{analysis?.deployment_altitude_m != null ? `${analysis.deployment_altitude_m.toFixed(1)} m` : '—'}</strong></div>
      <div><span>DEPLOY TIME</span><strong>{analysis?.deployment_time_s != null ? `${analysis.deployment_time_s.toFixed(2)} s` : '—'}</strong></div>
      <div><span>LANDING TIME</span><strong>{analysis?.landing_time_s !== undefined ? `${analysis.landing_time_s.toFixed(1)} s` : '—'}</strong></div>
      <div><span>IMPACT SPEED</span><strong>{analysis?.impact_speed_m_s !== undefined ? `${analysis.impact_speed_m_s.toFixed(2)} m/s` : '—'}</strong></div>
    </div>
    {analysis?.landing_time_s !== undefined && <div className="recovery-timeline">
      <div className="timeline-title"><span>RECOVERY SEQUENCE</span><strong>Flight → deployment → landing</strong></div>
      <div className="timeline-track">
        <div className="timeline-node complete"><b>1</b><span>Launch</span><em>t = 0 s</em></div>
        <div className="timeline-node complete"><b>2</b><span>Apogee</span><em>{analysis.time_to_apogee_s?.toFixed(2) ?? '—'} s</em></div>
        <div className="timeline-node complete"><b>3</b><span>Deploy</span><em>{analysis.deployment_altitude_m?.toFixed(1) ?? '—'} m</em></div>
        <div className="timeline-node complete"><b>4</b><span>Parachute descent</span><em>Cd {Number(vehicle.parachuteCd).toFixed(2)}</em></div>
        <div className="timeline-node complete"><b>5</b><span>Landing</span><em>{analysis.impact_speed_m_s?.toFixed(2) ?? '—'} m/s</em></div>
      </div>
    </div>}
    <div className="demo-banner">Enter component MASS only. xCG is calculated by the backend from each component geometry/envelope.</div>
    <div className="mass-head derived"><span>Component</span><span>Mass [g]</span><span>xCG AUTO [mm]</span></div>
    <div className="mass-table">{rows.map((row) => {
      const computed = componentResult?.components.find((item) => item.name === row.name);
      return <div className="mass-row-wrap" key={row.id}><div className="mass-row derived">
        <span>{row.name}</span>
        <input type="number" value={row.massG} onChange={(e) => updateMass(row.id, e.target.value === '' ? '' : Number(e.target.value))}/>
        <output>{computed ? computed.x_cg_mm.toFixed(1) : 'TBD'}</output>
      </div><small>{computed?.source ?? row.note}</small></div>;
    })}</div>
    {!planformReady && <div className="analysis-note">Fin xCG and CP remain blocked until tip chord, sweep and fin X are defined.</div>}
    {planformReady && vehicle.cd === '' && <div className="analysis-note">CG + CP available. Enter Cd to unlock trajectory, apogee, MaxQ and Mach.</div>}
    {error && <div className="analysis-error">API error: {error}</div>}
  </div>;
}
