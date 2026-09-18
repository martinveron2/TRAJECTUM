import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlightVisualizer, type MissionSample } from './FlightVisualizer';
import { EngineeringEquations } from './EngineeringEquations';

type NumericField = number | '';
type VehicleLike = {
  totalLength: NumericField; diameter: NumericField; noseLength: NumericField; bayLength: NumericField; bodyLength: NumericField; finCount: NumericField;
  rootChord: NumericField; tipChord: NumericField; span: NumericField;
  sweep: NumericField; finX: NumericField; launchAngle: NumericField; cd: NumericField;
  parachuteCd: NumericField; parachuteArea: NumericField; deployAltitude: NumericField; deployDelay: NumericField;
  noseProfile: string;
};
type ComponentRow = { id: number; name: string; massG: NumericField; kind: string; note: string };
type ComponentOut = { name: string; mass_g: number; x_cg_mm: number; source: string };
type UnifiedComponentOut = {
  name: string;
  mass_g: number;
  x_cg_mm_from_nose: number;
  x_cg_mm_from_support: number;
  source: string;
};
type ComponentResponse = { components: ComponentOut[]; total_mass_g: number; total_cg_mm: number };
type ComponentPayload = { name: string; mass_g: number; kind: string; x_start_mm?: number; x_end_mm?: number; length_mm?: number; base_radius_mm?: number; leading_edge_x_mm?: number; root_chord_mm?: number; tip_chord_mm?: number; span_mm?: number; sweep_mm?: number; profile?: string; power_exponent?: number };
type Analysis = {
  total_mass_g: number;
  components?: UnifiedComponentOut[];
  cg_x_mm_from_nose: number;
  cg_x_mm_from_support?: number;
  cp_x_mm_from_nose: number;
  cp_x_mm_from_support?: number;
  nose_cp_x_mm_from_nose?: number;
  nose_cp_x_mm_from_support?: number;
  fins_cp_x_mm_from_nose?: number;
  fins_cp_x_mm_from_support?: number;
  static_margin_calibers: number;
  apogee_m?: number;
  max_q_pa?: number;
  max_speed_m_s?: number;
  max_mach?: number;
  deployment_time_s?: number | null;
  deployment_altitude_m?: number | null;
  landing_time_s?: number;
  impact_speed_m_s?: number;
  time_to_apogee_s?: number;
  mission_timeline?: MissionSample[];
};

const initialRows: ComponentRow[] = [
  { id: 1, name: 'Cofia', massG: 100, kind: 'nose', note: 'xCG from selected nose-profile shell' },
  { id: 2, name: 'Cuerpo principal', massG: 330, kind: 'body', note: 'xCG from axial shell envelope' },
  { id: 3, name: 'Motor', massG: 490, kind: 'motor', note: 'xCG from motor axial envelope' },
  { id: 4, name: 'Paracaídas', massG: 30, kind: 'parachute', note: 'upper third of modular bay · demo geometry' },
  { id: 5, name: 'Electrónica', massG: 80, kind: 'electronics', note: 'middle third of modular bay · demo geometry' },
  { id: 6, name: 'Carga útil', massG: 100, kind: 'payload', note: 'lower third of modular bay · demo geometry' },
  { id: 7, name: 'Aletas · 4 total', massG: 20, kind: 'fins', note: 'xCG from trapezoidal planform' },
];

export function LiveAnalysisPanel({
  vehicle,
  runToken = 0,
  resetToken = 0,
  onAnalysisUpdate,
}: {
  vehicle: VehicleLike;
  runToken?: number;
  resetToken?: number;
  onAnalysisUpdate?: (analysis: Analysis | null, components: ComponentResponse | null) => void;
}) {
  const [rows, setRows] = useState(initialRows);
  const [componentResult, setComponentResult] = useState<ComponentResponse | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const lastAutoRunToken = useRef(0);

  useEffect(() => {
    if (resetToken > 0) {
      setRows(initialRows);
      setAnalysis(null);
      setError('');
    }
  }, [resetToken]);

  const planformReady = [vehicle.tipChord, vehicle.sweep, vehicle.finX].every((v) => v !== '');
  const massesReady = rows.every((row) => row.massG !== '');
  const componentPayload = useMemo<ComponentPayload[]>(() => rows.flatMap<ComponentPayload>((row) => {
    const common = { name: row.name, mass_g: Number(row.massG) };
    if (row.kind === 'nose') return [{ ...common, kind: 'profile_shell', profile: vehicle.noseProfile, length_mm: Number(vehicle.noseLength), base_radius_mm: Number(vehicle.diameter) / 2, power_exponent: 0.75 }];
    if (row.kind === 'body') return [{ ...common, kind: 'axial_uniform', x_start_mm: Number(vehicle.noseLength), x_end_mm: Number(vehicle.totalLength) }];
    if (row.kind === 'motor') {
      const end = Number(vehicle.totalLength);
      return [{ ...common, kind: 'axial_uniform', x_start_mm: Math.max(end - 190, 0), x_end_mm: end }];
    }
    const bayStart = Number(vehicle.noseLength);
    const bayThird = Math.max(Number(vehicle.bayLength) / 3, 1);
    if (row.kind === 'parachute') return [{ ...common, kind: 'axial_uniform', x_start_mm: bayStart, x_end_mm: bayStart + bayThird }];
    if (row.kind === 'electronics') return [{ ...common, kind: 'axial_uniform', x_start_mm: bayStart + bayThird, x_end_mm: bayStart + 2 * bayThird }];
    if (row.kind === 'payload') return [{ ...common, kind: 'axial_uniform', x_start_mm: bayStart + 2 * bayThird, x_end_mm: bayStart + 3 * bayThird }];
    if (row.kind === 'fins' && planformReady) return [{ ...common, kind: 'trapezoidal_fin_set', leading_edge_x_mm: Number(vehicle.finX), root_chord_mm: Number(vehicle.rootChord), tip_chord_mm: Number(vehicle.tipChord), span_mm: Number(vehicle.span), sweep_mm: Number(vehicle.sweep) }];
    return [];
  }), [rows, vehicle, planformReady]);

  useEffect(() => {
    setAnalysis(null);
    if (!massesReady) { setComponentResult(null); return; }
    setComponentResult(null);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/v1/components/cg', {
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

    const run = async () => {
    if (!planformReady || !componentResult || componentPayload.length !== rows.length) return;
    setRunning(true);
    setError('');
    try {
      const body = {
        total_length_mm: Number(vehicle.totalLength),
        body_diameter_mm: Number(vehicle.diameter),
        nose_length_mm: Number(vehicle.noseLength),
        nose_profile: vehicle.noseProfile,
        nose_power_exponent: 0.75,
        fin_count: Number(vehicle.finCount),
        fin_root_chord_mm: Number(vehicle.rootChord),
        fin_tip_chord_mm: Number(vehicle.tipChord),
        fin_span_mm: Number(vehicle.span),
        fin_sweep_mm: Number(vehicle.sweep),
        fin_leading_edge_x_mm: Number(vehicle.finX),
        components: componentPayload,
        launch_angle_deg: Number(vehicle.launchAngle),
        cd: Number(vehicle.cd),
        motor_burn_time_s: 0.5,
        motor_total_impulse_n_s: 207.0,
        motor_propellant_mass_g: 140.0,
        motor_dry_mass_g: 350.0,
        parachute_cd: Number(vehicle.parachuteCd),
        parachute_area_m2: Number(vehicle.parachuteArea),
        deploy_altitude_m: vehicle.deployAltitude === '' ? null : Number(vehicle.deployAltitude),
        deploy_delay_s: Number(vehicle.deployDelay),
      };
      const response = await fetch('/api/v2/analysis/full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`API ${response.status}: ${detail}`);
      }
      const fullAnalysis: Analysis = await response.json();
      setAnalysis(fullAnalysis);
      if (fullAnalysis.components) {
        setComponentResult({
          components: fullAnalysis.components.map((item) => ({
            name: item.name,
            mass_g: item.mass_g,
            x_cg_mm: item.x_cg_mm_from_nose,
            source: item.source,
          })),
          total_mass_g: fullAnalysis.total_mass_g,
          total_cg_mm: fullAnalysis.cg_x_mm_from_nose,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    if (runToken <= 0 || !componentResult || lastAutoRunToken.current === runToken) return;
    lastAutoRunToken.current = runToken;
    void run();
  }, [runToken, componentResult]);

  useEffect(() => {
    onAnalysisUpdate?.(analysis, componentResult);
  }, [analysis, componentResult, onAnalysisUpdate]);

  const totalMass = analysis?.total_mass_g ?? componentResult?.total_mass_g;
  const totalCgFromNose = analysis?.cg_x_mm_from_nose ?? componentResult?.total_cg_mm;
  const totalLengthMm = Number(vehicle.totalLength);
  const totalCgCatedra = analysis?.cg_x_mm_from_support ??
    (totalCgFromNose !== undefined && Number.isFinite(totalLengthMm) ? totalLengthMm - totalCgFromNose : undefined);
  const cpCatedra = analysis?.cp_x_mm_from_support ??
    (analysis?.cp_x_mm_from_nose !== undefined ? totalLengthMm - analysis.cp_x_mm_from_nose : undefined);

  return <div className="panel mass-panel" id="engineering-analysis">
    <div className="panel-title compact"><div><p>GEOMETRY-DERIVED MASS PROPERTIES</p><h2>Component CG → vehicle CG → CP → flight → recovery</h2></div>
      <button
        className="run"
        disabled={!planformReady || !componentResult || componentPayload.length !== rows.length || vehicle.cd === '' || vehicle.launchAngle === '' || running}
        onClick={run}
      >
        {running ? 'RUNNING…' : !planformReady ? 'ENTER FIN GEOMETRY' : vehicle.cd === '' || vehicle.launchAngle === '' ? 'ENTER FLIGHT INPUTS' : 'RUN FULL ANALYSIS'}
      </button></div>
    <div className="module-state">
      <span className={componentResult ? 'module-on' : ''}>CG · {componentResult ? 'READY' : 'WAIT'}</span>
      <span className={planformReady ? 'module-on' : ''}>CP · {planformReady ? 'READY' : 'NEEDS FINS'}</span>
      <span className={vehicle.cd !== '' && planformReady ? 'module-on' : ''}>TRAJECTORY · {vehicle.cd !== '' && planformReady ? 'READY' : 'NEEDS Cd'}</span>
      <span className={vehicle.cd !== '' && planformReady ? 'module-on' : ''}>RECOVERY · {vehicle.cd !== '' && planformReady ? 'READY' : 'AFTER FLIGHT'}</span>
    </div>
    <div className="analysis-metrics wide">
      <div><span>TOTAL MASS</span><strong>{totalMass !== undefined ? `${totalMass.toFixed(1)} g` : '—'}</strong></div>
      <div><span>CG CÁTEDRA · DESDE APOYO</span><strong>{totalCgCatedra !== undefined ? `${totalCgCatedra.toFixed(1)} mm` : '—'}</strong><small>{totalCgFromNose !== undefined ? `interno: ${totalCgFromNose.toFixed(1)} mm desde punta` : ''}</small></div>
      <div><span>CP CÁTEDRA · DESDE APOYO</span><strong>{cpCatedra !== undefined ? `${cpCatedra.toFixed(1)} mm` : '—'}</strong><small>{analysis?.cp_x_mm_from_nose !== undefined ? `interno: ${analysis.cp_x_mm_from_nose.toFixed(1)} mm desde punta` : ''}</small></div>
      <div><span>CP COFIA</span><strong>{analysis?.nose_cp_x_mm_from_support !== undefined ? `${analysis.nose_cp_x_mm_from_support.toFixed(1)} mm` : '—'}</strong><small>desde apoyo</small></div>
      <div><span>CP ALETAS</span><strong>{analysis?.fins_cp_x_mm_from_support !== undefined ? `${analysis.fins_cp_x_mm_from_support.toFixed(1)} mm` : '—'}</strong><small>desde apoyo</small></div>
      <div><span>APOGEE</span><strong>{analysis?.apogee_m !== undefined ? `${analysis.apogee_m.toFixed(1)} m` : '—'}</strong></div>
      <div><span>MAX Q</span><strong>{analysis?.max_q_pa !== undefined ? `${analysis.max_q_pa.toFixed(0)} Pa` : '—'}</strong></div>
      <div><span>MAX SPEED</span><strong>{analysis?.max_speed_m_s !== undefined ? `${analysis.max_speed_m_s.toFixed(1)} m/s` : '—'}</strong></div>
      <div><span>MAX MACH</span><strong>{analysis?.max_mach !== undefined ? analysis.max_mach.toFixed(3) : '—'}</strong></div>
      <div><span>DEPLOY ALTITUDE</span><strong>{analysis?.deployment_altitude_m != null ? `${analysis.deployment_altitude_m.toFixed(1)} m` : '—'}</strong></div>
      <div><span>DEPLOY TIME</span><strong>{analysis?.deployment_time_s != null ? `${analysis.deployment_time_s.toFixed(2)} s` : '—'}</strong></div>
      <div><span>LANDING TIME</span><strong>{analysis?.landing_time_s !== undefined ? `${analysis.landing_time_s.toFixed(1)} s` : '—'}</strong></div>
      <div><span>IMPACT SPEED</span><strong>{analysis?.impact_speed_m_s !== undefined ? `${analysis.impact_speed_m_s.toFixed(2)} m/s` : '—'}</strong></div>
    </div>
    {analysis?.mission_timeline && analysis.mission_timeline.length > 1 && <FlightVisualizer samples={analysis.mission_timeline} launchAngleDeg={Number(vehicle.launchAngle) || 85} />}
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
    <div className="mass-head derived"><span>Component</span><span>Mass [g]</span><span>xCG CÁTEDRA [mm]</span></div>
    <div className="mass-table">{rows.map((row) => {
      const computed = componentResult?.components.find((item) => item.name === row.name);
      return <div className="mass-row-wrap" key={row.id}><div className="mass-row derived">
        <span>{row.name}</span>
        <input type="number" value={row.massG} onChange={(e) => updateMass(row.id, e.target.value === '' ? '' : Number(e.target.value))}/>
        <output>{computed ? (totalLengthMm - computed.x_cg_mm).toFixed(1) : 'TBD'}</output>
      </div><small>{computed?.source ?? row.note}</small></div>;
    })}</div>
    {!planformReady && <div className="analysis-note">Fin xCG and CP remain blocked until tip chord, sweep and fin X are defined.</div>}
    {planformReady && vehicle.cd === '' && <div className="analysis-note">CG + CP available. Enter Cd to unlock trajectory, apogee, MaxQ and Mach.</div>}
    {error && <div className="analysis-error">API error: {error}</div>}
    <EngineeringEquations />
  </div>;
}
