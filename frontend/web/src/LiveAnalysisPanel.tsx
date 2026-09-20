import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MissionSample } from './missionTypes';
import { EngineeringEquations } from './EngineeringEquations';
import { RocketRealistic } from './RocketRealistic';

type NumericField = number | '';
type MotorLike = { designation: string; burn: NumericField; impulse: NumericField; propellantMass: NumericField; dryMass: NumericField; maxThrust: NumericField; propellant: string; officialAverageThrust?: NumericField; thrustCurve?: Array<[number, number]>; };
type VehicleLike = {
  totalLength: NumericField; diameter: NumericField; noseLength: NumericField; bayLength: NumericField; bodyLength: NumericField; finCount: NumericField;
  rootChord: NumericField; tipChord: NumericField; span: NumericField;
  sweep: NumericField; finX: NumericField; launchAngle: NumericField; cd: NumericField;
  parachuteCd: NumericField; parachuteArea: NumericField; deployAltitude: NumericField; deployDelay: NumericField;
  noseProfile: string;
  airfoil: string;
};
export type ComponentRow = { id: number; name: string; massG: NumericField; lengthMm: NumericField; diameterMm: NumericField; xCgMm?: NumericField; kind: string; note: string };
type ComponentOut = { name: string; mass_g: number; x_cg_mm: number; source: string };
type AssemblyStation = { key: string; name: string; x_start_mm: number | null; x_end_mm: number | null; raw_length_mm: number };
type UnifiedComponentOut = {
  name: string;
  mass_g: number;
  x_cg_mm_from_nose: number;
  x_cg_mm_from_support: number;
  source: string;
};
type ComponentResponse = { components: ComponentOut[]; total_mass_g: number; total_cg_mm: number };
type ComponentPayload = { name: string; mass_g: number; kind: string; x_start_mm?: number; x_end_mm?: number; x_cg_mm?: number; length_mm?: number; base_radius_mm?: number; leading_edge_x_mm?: number; root_chord_mm?: number; tip_chord_mm?: number; span_mm?: number; sweep_mm?: number; profile?: string; power_exponent?: number };
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

function CdWheelSelector({ value, onChange }: { value: NumericField; onChange: (value: NumericField) => void }) {
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const current = value === '' ? 0.345 : Number(value);
  const [draft, setDraft] = useState(current);
  const step = 0.005;
  const min = 0.05;
  const max = 1.5;
  const radius = 120;
  const start = Math.max(min, current - radius * step);
  const end = Math.min(max, current + radius * step);
  const count = Math.round((end - start) / step);
  const options = Array.from({ length: count + 1 }, (_, index) => Number((start + index * step).toFixed(3)));

  useEffect(() => {
    if (!open) return;
    setDraft(current);
    window.requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>('.active')?.scrollIntoView({ block: 'center' }));
  }, [open, current]);

  const updateDraftFromScroll = () => {
    const list = listRef.current;
    if (!list) return;
    const center = list.scrollTop + list.clientHeight / 2;
    let bestValue = draft;
    let bestDistance = Number.POSITIVE_INFINITY;
    list.querySelectorAll<HTMLButtonElement>('button[data-value]').forEach((button) => {
      const buttonCenter = button.offsetTop + button.offsetHeight / 2;
      const distance = Math.abs(buttonCenter - center);
      const option = Number(button.dataset.value);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestValue = option;
      }
    });
    setDraft(bestValue);
  };

  const confirm = () => {
    onChange(Number(draft.toFixed(3)));
    setOpen(false);
  };

  return <div className={open ? 'numeric-wheel-control editing' : 'numeric-wheel-control'}>
    <button type="button" className={open ? 'numeric-wheel-trigger active' : 'numeric-wheel-trigger'} onClick={() => setOpen(true)} aria-expanded={open} aria-label="Seleccionar Cd">
      <span>{value === '' ? '—' : Number(value).toFixed(3)}</span>
      <b>↕</b>
    </button>
    {open && typeof document !== 'undefined' && createPortal(
      <div className="numeric-wheel-overlay" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
        <div className="numeric-wheel-sheet" role="dialog" aria-modal="true" aria-label="Seleccionar Cd" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
          <div className="numeric-wheel-sheet-head"><span>SELECCIONAR Cd</span></div>
          <div className="numeric-wheel-viewport">
            <div className="numeric-wheel-list" ref={listRef} onScroll={updateDraftFromScroll}>
              {options.map((option) => <button type="button" key={option} data-value={option} className={Math.abs(option - draft) < 1e-9 ? 'active' : ''} onClick={(event) => {
                event.stopPropagation();
                setDraft(option);
                window.requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>('button[data-value="' + option + '"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
              }}>{option.toFixed(3)}</button>)}
            </div>
            <div className="numeric-wheel-focus-band" aria-hidden="true"/>
            <div className="numeric-wheel-fade top"/><div className="numeric-wheel-fade bottom"/>
          </div>
          <div className="numeric-wheel-actions">
            <button type="button" className="cancel" onClick={() => setOpen(false)}>CANCELAR</button>
            <button type="button" className="confirm" onClick={confirm}>✓ OK</button>
          </div>
        </div>
      </div>,
      document.body
    )}
  </div>;
}

function AnimatedValue({ value, decimals = 1, suffix = '' }: { value?: number; decimals?: number; suffix?: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (value == null || !Number.isFinite(value)) {
      setShown(0);
      return;
    }
    const duration = 720;
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(value * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  if (value == null || !Number.isFinite(value)) return <>—</>;
  return <>{shown.toFixed(decimals)}{suffix}</>;
}

export const initialComponentRows: ComponentRow[] = [
  { id: 1, name: 'Cofia', massG: 126, lengthMm: 180, diameterMm: 63, kind: 'nose', note: 'masa medida · xCG de envolvente de ojiva tangente' },
  { id: 2, name: 'C1', massG: 190, lengthMm: 215, diameterMm: 63, xCgMm: 272.5, kind: 'point_mass', note: 'masa medida · xCG provisional por centro de pieza ensamblada' },
  { id: 3, name: 'C2', massG: 146, lengthMm: 215, diameterMm: 63, xCgMm: 472.5, kind: 'point_mass', note: 'masa medida · xCG provisional por centro de pieza ensamblada' },
  { id: 4, name: 'Cola + aletas', massG: 260, lengthMm: 225, diameterMm: 63, xCgMm: 700.8, kind: 'point_mass', note: 'masa medida · xCG geométrico estimado con densidad de impresión uniforme' },
  { id: 5, name: 'Portamotor', massG: 148, lengthMm: 190, diameterMm: 54, xCgMm: 694, kind: 'point_mass', note: 'masa medida · xCG provisional en el centro del portamotor' },
  { id: 6, name: 'Paracaídas', massG: 30, lengthMm: 70, diameterMm: 52, xCgMm: 215, kind: 'point_mass', note: 'primero bajo la cofia · centro de cavidad delantera de 70 mm' },
  { id: 7, name: 'Carga útil', massG: 100, lengthMm: 50, diameterMm: 52, xCgMm: 285, kind: 'point_mass', note: 'primera mitad de la cavidad trasera de C1' },
  { id: 8, name: 'Electrónica', massG: 80, lengthMm: 50, diameterMm: 52, xCgMm: 335, kind: 'point_mass', note: 'al fondo de la cavidad trasera de C1' },
  { id: 9, name: 'Motor', massG: 490, lengthMm: 190, diameterMm: 50, kind: 'motor', note: 'xCG en el centro axial del motor' },
];

export function LiveAnalysisPanel({
  vehicle,
  runToken = 0,
  resetToken = 0,
  onAnalysisUpdate,
  motor,
  rows,
  onRowsChange,
  onOpenFlight,
  massStationsReady = true,
  assemblyStations = [],
  estimatedCd = 0.345,
  onCdChange,
  lang = 'es',
}: {
  vehicle: VehicleLike;
  runToken?: number;
  resetToken?: number;
  onAnalysisUpdate?: (analysis: Analysis | null, components: ComponentResponse | null) => void;
  motor: MotorLike;
  rows: ComponentRow[];
  onRowsChange: React.Dispatch<React.SetStateAction<ComponentRow[]>>;
  onOpenFlight?: () => void;
  massStationsReady?: boolean;
  assemblyStations?: AssemblyStation[];
  estimatedCd?: number;
  onCdChange?: (value: NumericField) => void;
  lang?: 'es' | 'en';
}) {
  const isEs = lang === 'es';
  const txt = (es: string, en: string) => isEs ? es : en;
  const componentName = (row: ComponentRow) => isEs ? row.name : ({ nose: 'Nose', body: 'Main body', motor: 'Motor', parachute: 'Parachute', electronics: 'Electronics', payload: 'Payload', fins: 'Fins · 4 total' } as Record<string,string>)[row.kind] ?? row.name;
  const displaySource = (source: string) => {
    if (!isEs) return source;
    if (source === 'geometry:axial_uniform') return 'geometría: distribución axial uniforme';
    if (source === 'estimate:drawing-derived-station') return 'estimado desde plano / estación axial';
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
  const [componentResult, setComponentResult] = useState<ComponentResponse | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [showMassEditor, setShowMassEditor] = useState(false);
  const [datumMode, setDatumMode] = useState<'support' | 'nose'>('support');
  const lastAutoRunToken = useRef(0);
  const cdIsEstimated = vehicle.cd !== '' && Math.abs(Number(vehicle.cd) - estimatedCd) < 1e-6;

  useEffect(() => {
    if (resetToken > 0) {
      onRowsChange(initialComponentRows);
      setAnalysis(null);
      setError('');
    }
  }, [resetToken]);

  const planformReady = [vehicle.tipChord, vehicle.sweep, vehicle.finX].every((v) => v !== '');
  const motorReady = motor.burn !== '' && Number(motor.burn) > 0 && motor.impulse !== '' && Number(motor.impulse) > 0 && motor.propellantMass !== '' && Number(motor.propellantMass) >= 0 && motor.dryMass !== '' && Number(motor.dryMass) > 0;
  const massesReady = rows.every((row) => row.massG !== '');
  const componentPayload = useMemo<ComponentPayload[]>(() => rows.flatMap<ComponentPayload>((row) => {
    const common = { name: row.name, mass_g: Number(row.massG) };
    if (row.kind === 'nose') return [{ ...common, kind: 'profile_shell', profile: vehicle.noseProfile, length_mm: Number(row.lengthMm) || Number(vehicle.noseLength), base_radius_mm: (Number(row.diameterMm) || Number(vehicle.diameter)) / 2, power_exponent: 0.75 }];
    if (row.kind === 'point_mass' && row.xCgMm !== '' && row.xCgMm != null) return [{ ...common, kind: 'point_mass', x_cg_mm: Number(row.xCgMm) }];
    if (row.kind === 'body') {
      const xStart = Number(vehicle.noseLength) + Number(vehicle.bayLength);
      return [{ ...common, kind: 'axial_uniform', x_start_mm: xStart, x_end_mm: Math.min(xStart + (Number(row.lengthMm) || Number(vehicle.bodyLength)), Number(vehicle.totalLength)) }];
    }
    if (row.kind === 'motor') {
      const end = Number(vehicle.totalLength);
      return [{ ...common, kind: 'axial_uniform', x_start_mm: Math.max(end - (Number(row.lengthMm) || 190), 0), x_end_mm: end }];
    }
    const bayStart = Number(vehicle.noseLength);
    const bayLength = Number(vehicle.bayLength);
    const parachuteLength = Number(rows.find((item) => item.kind === 'parachute')?.lengthMm) || bayLength / 3;
    const electronicsLength = Number(rows.find((item) => item.kind === 'electronics')?.lengthMm) || bayLength / 3;
    const payloadLength = Number(rows.find((item) => item.kind === 'payload')?.lengthMm) || bayLength / 3;
    if (row.kind === 'parachute') return [{ ...common, kind: 'axial_uniform', x_start_mm: bayStart, x_end_mm: Math.min(bayStart + parachuteLength, bayStart + bayLength) }];
    if (row.kind === 'electronics') return [{ ...common, kind: 'axial_uniform', x_start_mm: bayStart + parachuteLength, x_end_mm: Math.min(bayStart + parachuteLength + electronicsLength, bayStart + bayLength) }];
    if (row.kind === 'payload') return [{ ...common, kind: 'axial_uniform', x_start_mm: Math.max(bayStart + bayLength - payloadLength, bayStart), x_end_mm: bayStart + bayLength }];
    if (row.kind === 'fins' && planformReady) return [{ ...common, kind: 'trapezoidal_fin_set', leading_edge_x_mm: Number(vehicle.finX), root_chord_mm: Number(vehicle.rootChord), tip_chord_mm: Number(vehicle.tipChord), span_mm: Number(vehicle.span), sweep_mm: Number(vehicle.sweep) }];
    return [];
  }), [rows, vehicle, planformReady]);

  useEffect(() => {
    setAnalysis(null);
    if (!massStationsReady || !massesReady) { setComponentResult(null); return; }
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
  }, [componentPayload, massesReady, massStationsReady]);

  const updateMass = (id: number, value: NumericField) => {
    onRowsChange((current) => current.map((row) => row.id === id ? { ...row, massG: value, note: 'mass edited locally; xCG remains geometry-derived' } : row));
    setAnalysis(null);
  };

  const keepInputVisible = (event: React.FocusEvent<HTMLInputElement>) => {
    if (window.innerWidth > 820) return;
    window.setTimeout(() => event.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' }), 180);
  };

    const run = async () => {
    if (!massStationsReady || !planformReady || !componentResult || componentPayload.length !== rows.length) return;
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
  const cgCpSeparation = totalCgCatedra !== undefined && cpCatedra !== undefined ? Math.abs(totalCgCatedra - cpCatedra) : undefined;
  const displayCg = datumMode === 'support' ? totalCgCatedra : totalCgFromNose;
  const displayCp = datumMode === 'support' ? cpCatedra : analysis?.cp_x_mm_from_nose;
  const cgPct = displayCg !== undefined && totalLengthMm > 0 ? Math.max(2, Math.min(98, (displayCg / totalLengthMm) * 100)) : 50;
  const cpPct = displayCp !== undefined && totalLengthMm > 0 ? Math.max(2, Math.min(98, (displayCp / totalLengthMm) * 100)) : 50;

  return <div className={running ? 'panel mass-panel analysis-running' : 'panel mass-panel'} id="engineering-analysis" aria-busy={running}>
    <div className="panel-title compact"><div><p>{txt('PROPIEDADES DE MASA DERIVADAS DE LA GEOMETRÍA', 'GEOMETRY-DERIVED MASS PROPERTIES')}</p><h2>{txt('CG de componentes → CG del vehículo → CP → vuelo → recuperación', 'Component CG → vehicle CG → CP → flight → recovery')}</h2></div>
      <div className="analysis-run-row">
        <button
          className="run"
          disabled={!massStationsReady || !planformReady || !motorReady || !componentResult || componentPayload.length !== rows.length || vehicle.cd === '' || vehicle.launchAngle === '' || running}
          onClick={run}
        >
          {running && <span className="run-spinner" aria-hidden="true" />}
          <span>{running ? txt('EJECUTANDO ANÁLISIS…', 'RUNNING ANALYSIS…') : !massStationsReady ? txt('FIJAR xCG REALES PARA CONTINUAR', 'SET REAL xCG TO CONTINUE') : !planformReady ? txt('INGRESAR GEOMETRÍA DE ALETAS', 'ENTER FIN GEOMETRY') : !motorReady ? txt('COMPLETAR MOTOR', 'COMPLETE MOTOR') : vehicle.cd === '' || vehicle.launchAngle === '' ? txt('INGRESAR DATOS DE VUELO', 'ENTER FLIGHT INPUTS') : txt('EJECUTAR ANÁLISIS COMPLETO', 'RUN FULL ANALYSIS')}</span>
        </button>
        <div className={cdIsEstimated ? 'analysis-cd-control estimated' : 'analysis-cd-control manual'} title={txt('Cd usado por la simulación', 'Cd used by the simulation')}>
          <div className="analysis-cd-head"><span>Cd</span><small>{cdIsEstimated ? txt('ESTIMADO', 'ESTIMATED') : txt('MANUAL', 'MANUAL')}</small></div>
          <CdWheelSelector value={vehicle.cd} onChange={(value) => {
            onCdChange?.(value);
            setAnalysis(null);
          }}/>
          {cdIsEstimated
            ? <em className="analysis-cd-source">OPENROCKET</em>
            : <button className="analysis-cd-restore" type="button" onClick={() => { onCdChange?.(estimatedCd); setAnalysis(null); }} aria-label={txt('Restaurar Cd estimado', 'Restore estimated Cd')}>{txt('↺ USAR ESTIMADO', '↺ USE ESTIMATED')}</button>}
        </div>
      </div></div>
    {running && <div className="analysis-execution-live">
      <div className="analysis-execution-orbit"><i/><i/><b>Σ</b></div>
      <div><span>{txt('PROCESANDO MODELO', 'PROCESSING MODEL')}</span><strong>{txt('Calculando CG · CP · estabilidad…', 'Calculating CG · CP · stability…')}</strong></div>
    </div>}
    {analysis && !running && <section className="cdr-results-stage">
      <div className="cdr-results-head">
        <div><span>{txt('RESULTADOS CDR', 'CDR RESULTS')}</span><strong>{txt('Estabilidad del vehículo calculada', 'Vehicle stability calculated')}</strong></div>
        <b>✓ {txt('COMPLETADO', 'COMPLETE')}</b>
      </div>

      <div className="cdr-datum-switch" role="group" aria-label={txt('Datum longitudinal', 'Longitudinal datum')}>
        <span>{txt('DATUM', 'DATUM')}</span>
        <button type="button" className={datumMode === 'support' ? 'active' : ''} onClick={() => setDatumMode('support')}>{txt('APOYO · CÁTEDRA', 'SUPPORT · COURSE')}</button>
        <button type="button" className={datumMode === 'nose' ? 'active' : ''} onClick={() => setDatumMode('nose')}>{txt('PUNTA / NARIZ', 'NOSE TIP')}</button>
      </div>

      <div className="cdr-hero-values">
        <article className="cg">
          <span>CG · {datumMode === 'support' ? txt('DESDE APOYO', 'FROM SUPPORT') : txt('DESDE NARIZ', 'FROM NOSE')}</span>
          <strong><AnimatedValue value={displayCg} decimals={1} suffix=" mm"/></strong>
          <small>{txt('Centro de gravedad del vehículo', 'Vehicle center of gravity')}</small>
        </article>
        <article className="cp">
          <span>CP · {datumMode === 'support' ? txt('DESDE APOYO', 'FROM SUPPORT') : txt('DESDE NARIZ', 'FROM NOSE')}</span>
          <strong><AnimatedValue value={displayCp} decimals={1} suffix=" mm"/></strong>
          <small>{txt('Centro de presión aerodinámico', 'Aerodynamic center of pressure')}</small>
        </article>
      </div>

      <div className="cdr-stability-rail">
        <div className="cdr-rail-line"/>
        <i className="cp" style={{ left: cpPct + '%' }}><b>CP</b></i>
        <i className="cg" style={{ left: cgPct + '%' }}><b>CG</b></i>
        <span>0</span><em>{vehicle.totalLength} mm</em>
      </div>

      <div className="cdr-stability-summary">
        <div><span>{txt('SEPARACIÓN CG–CP', 'CG–CP SEPARATION')}</span><strong><AnimatedValue value={cgCpSeparation} decimals={1} suffix=" mm"/></strong></div>
        <div><span>{txt('MARGEN ESTÁTICO', 'STATIC MARGIN')}</span><strong><AnimatedValue value={analysis.static_margin_calibers} decimals={2} suffix=" cal"/></strong></div>
      </div>
      <div className={
        analysis.static_margin_calibers >= 1.5 && analysis.static_margin_calibers <= 2
          ? 'stability-status stable'
          : analysis.static_margin_calibers < 1.5
            ? 'stability-status warning'
            : 'stability-status review'
      }>
        <i />
        <strong>{
          analysis.static_margin_calibers >= 1.5 && analysis.static_margin_calibers <= 2
            ? txt('ESTABLE', 'STABLE')
            : analysis.static_margin_calibers < 1.5
              ? txt('MARGEN BAJO', 'LOW MARGIN')
              : txt('REVISAR ESTABILIDAD', 'CHECK STABILITY')
        }</strong>
        <span>{
          analysis.static_margin_calibers >= 1.5 && analysis.static_margin_calibers <= 2
            ? txt('Dentro del rango objetivo 1.5–2.0 cal', 'Within target range 1.5–2.0 cal')
            : analysis.static_margin_calibers < 1.5
              ? txt('Aumentá la separación CG–CP', 'Increase CG–CP separation')
              : txt('Margen superior al rango objetivo', 'Margin above target range')
        }</span>
      </div>

      <div className="cdr-secondary-results">
        <article><span>{txt('MASA TOTAL', 'TOTAL MASS')}</span><strong><AnimatedValue value={totalMass} decimals={1} suffix=" g"/></strong></article>
        <article><span>{txt('APOGEO', 'APOGEE')}</span><strong><AnimatedValue value={analysis.apogee_m} decimals={1} suffix=" m"/></strong></article>
        <article><span>{txt('Q MÁX', 'MAX Q')}</span><strong><AnimatedValue value={analysis.max_q_pa} decimals={0} suffix=" Pa"/></strong></article>
        <article><span>{txt('VELOCIDAD MÁX', 'MAX SPEED')}</span><strong><AnimatedValue value={analysis.max_speed_m_s} decimals={1} suffix=" m/s"/></strong></article>
        <article><span>{txt('MACH MÁX', 'MAX MACH')}</span><strong><AnimatedValue value={analysis.max_mach} decimals={3}/></strong></article>
        <article><span>{txt('IMPACTO', 'IMPACT')}</span><strong><AnimatedValue value={analysis.impact_speed_m_s} decimals={2} suffix=" m/s"/></strong></article>
      </div>

      <section className="cdr-vehicle-map">
        <div className="cdr-vehicle-map-head">
          <div><span>{txt('UBICACIÓN SOBRE EL VEHÍCULO', 'LOCATION ON VEHICLE')}</span><strong>{txt('CG TOTAL · CP TOTAL · CG DE COMPONENTES', 'TOTAL CG · TOTAL CP · COMPONENT CGs')}</strong></div>
          <b>{txt('ESCALA REAL', 'TRUE SCALE')}</b>
        </div>
        <RocketRealistic
          vehicle={vehicle}
          cgMm={totalCgFromNose ?? null}
          cpMm={analysis.cp_x_mm_from_nose ?? null}
          componentCgs={componentResult?.components ?? []}
          assemblyStations={assemblyStations}
          showComponentCgs
          lang={lang}
        />
      </section>
    </section>}
    {massStationsReady ? <div className="mass-editor-gate">
      <div>
        <span>{txt('MASAS Y xCG', 'MASSES & xCG')}</span>
        <strong>{txt('Derivados automáticamente desde PDR', 'Automatically derived from PDR')}</strong>
        <small>{txt('No necesitás volver a cargar datos. Abrí este editor sólo si querés ajustar una masa.', 'No re-entry required. Open only if you want to adjust a mass.')}</small>
      </div>
      <button type="button" onClick={() => setShowMassEditor((value) => !value)}>{showMassEditor ? txt('OCULTAR', 'HIDE') : txt('AJUSTAR', 'ADJUST')}</button>
    </div> : <div className="demo-banner">{txt('Geometría Fusion y masas medidas cargadas. El modelo de CG queda bloqueado hasta fijar xCG de Cofia, C1, C2, Cola + aletas, Portamotor e internos.', 'Fusion geometry and measured masses are loaded. CG stays blocked until xCG is fixed for Nose, C1, C2, Tail + fins, motor mount and internals.')}</div>}
    {massStationsReady && showMassEditor && <div className="mass-editor-collapsible">
      <div className="demo-banner">{txt('El backend conserva xCG derivado de la geometría; sólo la masa es editable.', 'The backend keeps geometry-derived xCG; only mass is editable.')}</div>
      <div className="mass-head derived"><span>{txt('Componente', 'Component')}</span><span>{txt('Masa [g]', 'Mass [g]')}</span><span>xCG {datumMode === 'support' ? txt('DESDE APOYO', 'FROM SUPPORT') : txt('DESDE NARIZ', 'FROM NOSE')} [mm]</span></div>
      <div className="mass-table">{rows.map((row) => {
        const computed = componentResult?.components.find((item) => item.name === row.name);
        return <div className="mass-row-wrap" key={row.id}><div className="mass-row derived">
          <span>{componentName(row)}</span>
          <input type="number" value={row.massG} disabled={row.kind === 'motor'} onFocus={keepInputVisible} title={row.kind === 'motor' ? txt('La masa del motor se deriva de la configuración activa.', 'Motor mass is derived from the active configuration.') : undefined} onChange={(e) => updateMass(row.id, e.target.value === '' ? '' : Number(e.target.value))}/>
          <output>{computed ? (datumMode === 'support' ? totalLengthMm - computed.x_cg_mm : computed.x_cg_mm).toFixed(1) : txt('POR DEFINIR', 'TBD')}</output>
        </div><small>{computed ? displaySource(computed.source) : displayNote(row)}</small></div>;
      })}</div>
    </div>}
    {!planformReady && <div className="analysis-note">{txt('El xCG de las aletas y el CP permanecen bloqueados hasta definir cuerda de punta, desplazamiento del borde de ataque y posición axial de la aleta.', 'Fin xCG and CP remain blocked until tip chord, sweep and fin X are defined.')}</div>}
    {massStationsReady && planformReady && vehicle.cd === '' && <div className="analysis-note">{txt('CG + CP disponibles. Ingresá Cd para habilitar trayectoria, apogeo, Q máx y Mach.', 'CG + CP available. Enter Cd to unlock trajectory, apogee, MaxQ and Mach.')}</div>}
    {error && <div className="analysis-error">{txt('Error de API', 'API error')}: {error}</div>}
    <EngineeringEquations lang={lang} />
  </div>;
}
