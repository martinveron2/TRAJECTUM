import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { FlightVisualizer, type MissionSample } from './FlightVisualizer';
import { EngineeringEquations } from './EngineeringEquations';

const FlightAnalysisCharts = React.lazy(() => import('./FlightAnalysisCharts').then((module) => ({ default: module.FlightAnalysisCharts })));

type NumericField = number | '';
type MotorLike = { designation: string; burn: NumericField; impulse: NumericField; propellantMass: NumericField; dryMass: NumericField; maxThrust: NumericField; propellant: string; officialAverageThrust?: NumericField; thrustCurve?: Array<[number, number]>; };
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
  motor,
  lang = 'es',
}: {
  vehicle: VehicleLike;
  runToken?: number;
  resetToken?: number;
  onAnalysisUpdate?: (analysis: Analysis | null, components: ComponentResponse | null) => void;
  motor: MotorLike;
  lang?: 'es' | 'en';
}) {
  const isEs = lang === 'es';
  const txt = (es: string, en: string) => isEs ? es : en;
  const componentName = (row: ComponentRow) => isEs ? row.name : ({ nose: 'Nose', body: 'Main body', motor: 'Motor', parachute: 'Parachute', electronics: 'Electronics', payload: 'Payload', fins: 'Fins · 4 total' } as Record<string,string>)[row.kind] ?? row.name;
  const displaySource = (source: string) => {
    if (!isEs) return source;
    if (source === 'geometry:axial_uniform') return 'geometría: distribución axial uniforme';
    if (source === 'geometry:trapezoidal_fin_planform') return 'geometría: planta trapezoidal de aletas';
    if (source.startsWith('geometry:') && source.endsWith('_shell')) return 'geometría: envolvente de cofia ' + source.slice(9, -6).replace(/_/g, ' ');
    return source;
  };
  const displayNote = (row: ComponentRow) => {
    if (!isEs) return row.note;
    if (row.note.startsWith('mass edited locally')) return 'masa editada localmente; xCG sigue derivado de la geometría';
    return ({
      nose: 'xCG a partir de la envolvente del perfil de cofia seleccionado',
      body: 'xCG a partir de la envolvente axial del cuerpo',
      motor: 'xCG a partir de la envolvente axial del motor',
      parachute: 'tercio superior del compartimiento modular · geometría de referencia',
      electronics: 'tercio medio del compartimiento modular · geometría de referencia',
      payload: 'tercio inferior del compartimiento modular · geometría de referencia',
      fins: 'xCG a partir de la planta trapezoidal de las aletas',
    } as Record<string,string>)[row.kind] ?? row.note;
  };
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

  useEffect(() => {
    const motorMass = motor.propellantMass === '' || motor.dryMass === '' ? '' : Number(motor.propellantMass) + Number(motor.dryMass);
    setRows((current) => current.map((row) => row.kind === 'motor' ? { ...row, massG: motorMass, note: 'motor mass derived from active configuration' } : row));
    setAnalysis(null);
  }, [motor.propellantMass, motor.dryMass, motor.designation]);

  const planformReady = [vehicle.tipChord, vehicle.sweep, vehicle.finX].every((v) => v !== '');
  const motorReady = motor.burn !== '' && Number(motor.burn) > 0 && motor.impulse !== '' && Number(motor.impulse) > 0 && motor.propellantMass !== '' && Number(motor.propellantMass) >= 0 && motor.dryMass !== '' && Number(motor.dryMass) > 0;
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
        motor_burn_time_s: Number(motor.burn),
        motor_total_impulse_n_s: Number(motor.impulse),
        motor_propellant_mass_g: Number(motor.propellantMass),
        motor_dry_mass_g: Number(motor.dryMass),
        motor_official_average_thrust_n: motor.officialAverageThrust === undefined || motor.officialAverageThrust === '' ? null : Number(motor.officialAverageThrust),
        motor_thrust_curve: motor.thrustCurve?.map(([time_s, thrust_n]) => ({ time_s, thrust_n })) ?? null,
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

  return <div className={running ? 'panel mass-panel analysis-running' : 'panel mass-panel'} id="engineering-analysis" aria-busy={running}>
    <div className="panel-title compact"><div><p>{txt('PROPIEDADES DE MASA DERIVADAS DE LA GEOMETRÍA', 'GEOMETRY-DERIVED MASS PROPERTIES')}</p><h2>{txt('CG de componentes → CG del vehículo → CP → vuelo → recuperación', 'Component CG → vehicle CG → CP → flight → recovery')}</h2></div>
      <button
        className="run"
        disabled={!planformReady || !motorReady || !componentResult || componentPayload.length !== rows.length || vehicle.cd === '' || vehicle.launchAngle === '' || running}
        onClick={run}
      >
        {running && <span className="run-spinner" aria-hidden="true" />}
        <span>{running ? txt('EJECUTANDO ANÁLISIS…', 'RUNNING ANALYSIS…') : !planformReady ? txt('INGRESAR GEOMETRÍA DE ALETAS', 'ENTER FIN GEOMETRY') : !motorReady ? txt('COMPLETAR MOTOR', 'COMPLETE MOTOR') : vehicle.cd === '' || vehicle.launchAngle === '' ? txt('INGRESAR DATOS DE VUELO', 'ENTER FLIGHT INPUTS') : txt('EJECUTAR ANÁLISIS COMPLETO', 'RUN FULL ANALYSIS')}</span>
      </button></div>
    {running && <div className="analysis-skeleton" aria-hidden="true">
      <i /><i /><i />
    </div>}
    <div className="module-state">
      <span className={componentResult ? 'module-on' : ''}>CG · {componentResult ? txt('LISTO', 'READY') : txt('ESPERA', 'WAIT')}</span>
      <span className={planformReady ? 'module-on' : ''}>CP · {planformReady ? txt('LISTO', 'READY') : txt('REQUIERE ALETAS', 'NEEDS FINS')}</span>
      <span className={vehicle.cd !== '' && planformReady ? 'module-on' : ''}>{txt('TRAYECTORIA', 'TRAJECTORY')} · {vehicle.cd !== '' && planformReady ? txt('LISTA', 'READY') : txt('REQUIERE Cd', 'NEEDS Cd')}</span>
      <span className={vehicle.cd !== '' && planformReady ? 'module-on' : ''}>{txt('RECUPERACIÓN', 'RECOVERY')} · {vehicle.cd !== '' && planformReady ? txt('LISTA', 'READY') : txt('DESPUÉS DEL VUELO', 'AFTER FLIGHT')}</span>
    </div>
    <div className="analysis-metrics wide">
      <div><span>{txt('MASA TOTAL', 'TOTAL MASS')}</span><strong>{totalMass !== undefined ? `${totalMass.toFixed(1)} g` : '—'}</strong></div>
      <div><span>{txt('CG CÁTEDRA · DESDE APOYO', 'CG · FROM SUPPORT')}</span><strong>{totalCgCatedra !== undefined ? `${totalCgCatedra.toFixed(1)} mm` : '—'}</strong><small>{totalCgFromNose !== undefined ? (isEs ? `interno: ${totalCgFromNose.toFixed(1)} mm desde punta` : `internal: ${totalCgFromNose.toFixed(1)} mm from nose`) : ''}</small></div>
      <div><span>{txt('CP CÁTEDRA · DESDE APOYO', 'CP · FROM SUPPORT')}</span><strong>{cpCatedra !== undefined ? `${cpCatedra.toFixed(1)} mm` : '—'}</strong><small>{analysis?.cp_x_mm_from_nose !== undefined ? (isEs ? `interno: ${analysis.cp_x_mm_from_nose.toFixed(1)} mm desde punta` : `internal: ${analysis.cp_x_mm_from_nose.toFixed(1)} mm from nose`) : ''}</small></div>
      <div><span>{txt('CP COFIA', 'NOSE CP')}</span><strong>{analysis?.nose_cp_x_mm_from_support !== undefined ? `${analysis.nose_cp_x_mm_from_support.toFixed(1)} mm` : '—'}</strong><small>{txt('desde apoyo', 'from support')}</small></div>
      <div><span>{txt('CP ALETAS', 'FINS CP')}</span><strong>{analysis?.fins_cp_x_mm_from_support !== undefined ? `${analysis.fins_cp_x_mm_from_support.toFixed(1)} mm` : '—'}</strong><small>{txt('desde apoyo', 'from support')}</small></div>
      <div><span>{txt('APOGEO', 'APOGEE')}</span><strong>{analysis?.apogee_m !== undefined ? `${analysis.apogee_m.toFixed(1)} m` : '—'}</strong></div>
      <div><span>{txt('Q MÁX', 'MAX Q')}</span><strong>{analysis?.max_q_pa !== undefined ? `${analysis.max_q_pa.toFixed(0)} Pa` : '—'}</strong></div>
      <div><span>{txt('VELOCIDAD MÁX', 'MAX SPEED')}</span><strong>{analysis?.max_speed_m_s !== undefined ? `${analysis.max_speed_m_s.toFixed(1)} m/s` : '—'}</strong></div>
      <div><span>{txt('MACH MÁX', 'MAX MACH')}</span><strong>{analysis?.max_mach !== undefined ? analysis.max_mach.toFixed(3) : '—'}</strong></div>
      <div><span>{txt('ALTITUD DE DESPLIEGUE', 'DEPLOY ALTITUDE')}</span><strong>{analysis?.deployment_altitude_m != null ? `${analysis.deployment_altitude_m.toFixed(1)} m` : '—'}</strong></div>
      <div><span>{txt('TIEMPO DE DESPLIEGUE', 'DEPLOY TIME')}</span><strong>{analysis?.deployment_time_s != null ? `${analysis.deployment_time_s.toFixed(2)} s` : '—'}</strong></div>
      <div><span>{txt('TIEMPO DE ATERRIZAJE', 'LANDING TIME')}</span><strong>{analysis?.landing_time_s !== undefined ? `${analysis.landing_time_s.toFixed(1)} s` : '—'}</strong></div>
      <div><span>{txt('VELOCIDAD DE IMPACTO', 'IMPACT SPEED')}</span><strong>{analysis?.impact_speed_m_s !== undefined ? `${analysis.impact_speed_m_s.toFixed(2)} m/s` : '—'}</strong></div>
    </div>
    {analysis?.mission_timeline && analysis.mission_timeline.length > 1 && <>
      <FlightVisualizer samples={analysis.mission_timeline} launchAngleDeg={Number(vehicle.launchAngle) || 85} lang={lang} />
      <Suspense fallback={<div className="panel flight-analysis-loading">{txt('CARGANDO GRÁFICOS DE INGENIERÍA…', 'LOADING ENGINEERING PLOTS…')}</div>}>
        <FlightAnalysisCharts samples={analysis.mission_timeline} motorBurnTimeS={Number(motor.burn) || 0} analysis={analysis} lang={lang} />
      </Suspense>
    </>}
        {analysis?.landing_time_s !== undefined && <div className="recovery-timeline">
      <div className="timeline-title"><span>{txt('SECUENCIA DE RECUPERACIÓN', 'RECOVERY SEQUENCE')}</span><strong>{txt('Vuelo → despliegue → aterrizaje', 'Flight → deployment → landing')}</strong></div>
      <div className="timeline-track">
        <div className="timeline-node complete"><b>1</b><span>{txt('Lanzamiento', 'Launch')}</span><em>t = 0 s</em></div>
        <div className="timeline-node complete"><b>2</b><span>{txt('Apogeo', 'Apogee')}</span><em>{analysis.time_to_apogee_s?.toFixed(2) ?? '—'} s</em></div>
        <div className="timeline-node complete"><b>3</b><span>{txt('Despliegue', 'Deploy')}</span><em>{analysis.deployment_altitude_m?.toFixed(1) ?? '—'} m</em></div>
        <div className="timeline-node complete"><b>4</b><span>{txt('Descenso con paracaídas', 'Parachute descent')}</span><em>Cd {Number(vehicle.parachuteCd).toFixed(2)}</em></div>
        <div className="timeline-node complete"><b>5</b><span>{txt('Aterrizaje', 'Landing')}</span><em>{analysis.impact_speed_m_s?.toFixed(2) ?? '—'} m/s</em></div>
      </div>
    </div>}
    <div className="demo-banner">{txt('Ingresá únicamente la MASA de cada componente. El backend calcula xCG a partir de la geometría o envolvente de cada componente.', 'Enter component MASS only. xCG is calculated by the backend from each component geometry/envelope.')}</div>
    <div className="mass-head derived"><span>{txt('Componente', 'Component')}</span><span>{txt('Masa [g]', 'Mass [g]')}</span><span>xCG {txt('CÁTEDRA', 'COURSE')} [mm]</span></div>
    <div className="mass-table">{rows.map((row) => {
      const computed = componentResult?.components.find((item) => item.name === row.name);
      return <div className="mass-row-wrap" key={row.id}><div className="mass-row derived">
        <span>{componentName(row)}</span>
        <input type="number" value={row.massG} disabled={row.kind === 'motor'} title={row.kind === 'motor' ? txt('La masa del motor se deriva de la configuración activa.', 'Motor mass is derived from the active configuration.') : undefined} onChange={(e) => updateMass(row.id, e.target.value === '' ? '' : Number(e.target.value))}/>
        <output>{computed ? (totalLengthMm - computed.x_cg_mm).toFixed(1) : txt('POR DEFINIR', 'TBD')}</output>
      </div><small>{computed ? displaySource(computed.source) : displayNote(row)}</small></div>;
    })}</div>
    {!planformReady && <div className="analysis-note">{txt('El xCG de las aletas y el CP permanecen bloqueados hasta definir cuerda de punta, desplazamiento del borde de ataque y posición axial de la aleta.', 'Fin xCG and CP remain blocked until tip chord, sweep and fin X are defined.')}</div>}
    {planformReady && vehicle.cd === '' && <div className="analysis-note">{txt('CG + CP disponibles. Ingresá Cd para habilitar trayectoria, apogeo, Q máx y Mach.', 'CG + CP available. Enter Cd to unlock trajectory, apogee, MaxQ and Mach.')}</div>}
    {error && <div className="analysis-error">{txt('Error de API', 'API error')}: {error}</div>}
    <EngineeringEquations lang={lang} />
  </div>;
}
