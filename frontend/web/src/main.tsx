import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import './styles.css';
import { LiveAnalysisPanel, initialComponentRows, type ComponentRow } from './LiveAnalysisPanel';
import { CadInteroperabilityPanel } from './CadInteroperabilityPanel';
import { RocketRealistic } from './RocketRealistic';
import { NoseProfileComparison } from './NoseProfileComparison';
import { buildEngineeringChartImages } from './engineeringChartExport';
import { MissionControl } from './MissionControl';
import { RequirementsMatrix, deriveRequirementStatus, type RequirementStatus, type RequirementStatusOverrides } from './RequirementsMatrix';
import { PROJECT_REQUIREMENTS } from './projectRequirements';
import pdrCad2d from './assets/pdr-cad-2d.webp';
import pdrCad3d from './assets/pdr-cad-3d.webp';

const FlightAnalysisCharts = React.lazy(() => import('./FlightAnalysisCharts').then((module) => ({ default: module.FlightAnalysisCharts })));
import {
  Home, Rocket, Gauge, ChartNoAxesCombined, Download, Box, SlidersHorizontal,
  Flame, Sigma, ClipboardCheck, ArrowLeft, Play, Globe2, ShieldCheck, RadioTower, FileChartColumn, Orbit, Eye, EyeOff, FileUp, ZoomIn, ZoomOut, Maximize2,
} from 'lucide-react';

type NumericField = number | '';

type Vehicle = {
  totalLength: NumericField;
  diameter: NumericField;
  noseLength: NumericField;
  bayLength: NumericField;
  bodyLength: NumericField;
  wall: NumericField;
  finCount: NumericField;
  rootChord: NumericField;
  tipChord: NumericField;
  span: NumericField;
  sweep: NumericField;
  finX: NumericField;
  airfoil: string;
  noseProfile: string;
  launchAngle: NumericField;
  cd: NumericField;
  parachuteCd: NumericField;
  parachuteArea: NumericField;
  deployAltitude: NumericField;
  deployDelay: NumericField;
  nozzleLength: NumericField;
  nozzleNeckDiameter: NumericField;
  nozzleExitDiameter: NumericField;
};

type TwinStation = {
  key: string;
  name: string;
  x_start_mm: number | null;
  x_end_mm: number | null;
  raw_length_mm: number;
};

type TwinAssembly = {
  datum: string;
  resolved: boolean;
  total_length_mm: number | null;
  blockers: string[];
  stations: TwinStation[];
};

type TwinValue = {
  value?: number | null;
  status?: string;
  note?: string;
};

type CurrentCp = {
  resolved: boolean;
  status?: string;
  method?: string;
  cp_x_mm_from_nose?: number | null;
  cp_x_mm_from_support?: number | null;
  cn_alpha_total?: number | null;
  blockers?: string[];
};

type CurrentTwin = {
  geometry?: {
    outer_diameter_mm?: TwinValue;
    nose_length_mm?: TwinValue;
    parts?: {
      c1_parachute_payload?: { raw_part_length_mm?: number };
      c2?: { raw_part_length_mm?: number };
      tail_fin_can?: {
        raw_part_length_mm?: number;
        root_le_from_tail_front_mm?: number;
      };
      motor_mount?: {
        raw_part_length_mm?: number;
        outer_diameter_mm?: number;
        inner_diameter_mm?: number;
      };
    };
  };
  fins?: {
    count?: TwinValue;
    root_chord_mm?: TwinValue;
    tip_chord_mm?: TwinValue;
    span_mm?: TwinValue;
    sweep_length_mm?: TwinValue;
    leading_edge_x_mm?: TwinValue;
  };
  aerodynamics?: { cd?: TwinValue };
  masses?: {
    status?: string;
    measured_structure_total_g?: number;
    measured_items?: Array<{ name: string; mass_g: number; status: string; x_cg_mm_from_nose?: number; x_cg_status?: string }>;
    known_internal_items?: Array<{ name: string; mass_g: number; status: string; x_cg_mm_from_nose?: number; x_cg_status?: string }>;
  };
};

const initialVehicle: Vehicle = {
  totalLength: 825.05,
  diameter: 63,
  noseLength: 200.05,
  bayLength: 185,
  bodyLength: 440,
  wall: '',
  finCount: 4,
  rootChord: 97.67,
  tipChord: 39.96,
  span: 52.5,
  sweep: 42,
  finX: 725.05,
  airfoil: 'NACA 0012',
  noseProfile: 'tangent_ogive',
  launchAngle: 85,
  cd: 0.345,
  parachuteCd: 1.5,
  parachuteArea: 0.20,
  deployAltitude: '',
  deployDelay: 0,
  nozzleLength: '',
  nozzleNeckDiameter: '',
  nozzleExitDiameter: '',
};

type MotorConfig = {
  id: string;
  label: string;
  designation: string;
  propellant: string;
  burn: NumericField;
  impulse: NumericField;
  maxThrust: NumericField;
  propellantMass: NumericField;
  dryMass: NumericField;
  officialAverageThrust?: NumericField;
  thrustCurve?: Array<[number, number]>;
};

const initialMotorConfigs: MotorConfig[] = [
  {
    id: 'motor-1',
    label: 'SIMULACIÓN REALISTA',
    designation: 'A-100 RN (29%H) · curva KNDX',
    propellant: 'KNDX',
    burn: 0.5,
    impulse: 207,
    maxThrust: 600,
    propellantMass: 140,
    dryMass: 350,
    officialAverageThrust: 441,
    thrustCurve: [[0.00,0],[0.05,600],[0.10,550],[0.20,530],[0.30,500],[0.40,400],[0.45,50],[0.50,0]],
  },
  {
    id: 'motor-2',
    label: 'REFERENCIA ANALÍTICA',
    designation: 'A-100 RN · equivalente rectangular 414 N',
    propellant: 'KNDX',
    burn: 0.5,
    impulse: 207,
    maxThrust: 414,
    propellantMass: 140,
    dryMass: 350,
    officialAverageThrust: 441,
  },
];

const motorAverageThrust = (motor: MotorConfig) => {
  if (motor.officialAverageThrust !== undefined && motor.officialAverageThrust !== '') return Number(motor.officialAverageThrust);
  const burn = Number(motor.burn);
  const impulse = Number(motor.impulse);
  return burn > 0 && Number.isFinite(impulse) ? impulse / burn : null;
};

function mm(value: NumericField) {
  return value === '' ? 'TBD' : `${value} mm`;
}

function Field({
  label,
  value,
  unit,
  onChange,
  status,
  step = 1,
  min = 0,
  readOnly = false,
}: {
  label: string;
  value: NumericField;
  unit?: string;
  onChange?: (value: NumericField) => void;
  status?: string;
  step?: number;
  min?: number;
  readOnly?: boolean;
}) {
  const fieldState = value === '' ? 'field-empty' : Number.isFinite(Number(value)) && Number(value) >= 0 ? 'field-valid' : 'field-warning';
  return (
    <div className={'field geometry-picker-field ' + fieldState}>
      <span className="field-label">
        {label}
        {status && <small>{status}</small>}
      </span>
      {readOnly ? (
        <div className="numeric-wheel-control">
          <div className="numeric-wheel-trigger" aria-readonly="true">
            <span>{value === '' ? '—' : Number(value).toFixed(String(step).includes('.') ? String(step).split('.')[1].length : 0)}</span>
            {unit && <em>{unit}</em>}
            <b>CAD</b>
          </div>
        </div>
      ) : (
        <NumericStepper value={value} onChange={onChange!} unit={unit} step={step} min={min}/>
      )}
    </div>
  );
}

function NumericStepper({
  value,
  onChange,
  unit,
  step = 1,
  min = 0,
}: {
  value: NumericField;
  onChange: (value: NumericField) => void;
  unit?: string;
  step?: number;
  min?: number;
}) {
  const [open, setOpen] = useState(false);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const current = value === '' ? min : Number(value);
  const [draft, setDraft] = useState(current);
  const precision = String(step).includes('.') ? String(step).split('.')[1].length : 0;
  const radius = 24;
  const options = Array.from({ length: radius * 2 + 1 }, (_, index) => {
    const raw = Math.max(min, current + (index - radius) * step);
    return Number(raw.toFixed(precision));
  }).filter((option, index, array) => index === 0 || option !== array[index - 1]);

  React.useEffect(() => {
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

  const closePicker = () => setOpen(false);
  const confirmPicker = () => {
    onChange(Number(draft.toFixed(precision)));
    setOpen(false);
  };

  return (
    <div className={open ? 'numeric-wheel-control editing' : 'numeric-wheel-control'}>
      <button
        type="button"
        className={open ? 'numeric-wheel-trigger active' : 'numeric-wheel-trigger'}
        onClick={() => setOpen(true)}
        aria-expanded={open}
      >
        <span>{value === '' ? '—' : Number(value).toFixed(precision)}</span>
        {unit && <em>{unit}</em>}
        <b>↕</b>
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div className="numeric-wheel-overlay" role="presentation" onPointerDown={(event) => {
          if (event.target === event.currentTarget) closePicker();
        }}>
          <div
            className="numeric-wheel-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Seleccionar valor"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="numeric-wheel-sheet-head">
              <span>SELECCIONAR VALOR</span>
            </div>
            <div className="numeric-wheel-viewport">
              <div className="numeric-wheel-list" ref={listRef} onScroll={updateDraftFromScroll}>
                {options.map((option) => <button
                  type="button"
                  key={option}
                  data-value={option}
                  className={option === draft ? 'active' : ''}
                  onClick={(event) => {
                    event.stopPropagation();
                    setDraft(option);
                    window.requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(`button[data-value="${option}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
                  }}
                >{option.toFixed(precision)}{unit ? ' ' + unit : ''}</button>)}
              </div>
              <div className="numeric-wheel-focus-band" aria-hidden="true"/>
              <div className="numeric-wheel-fade top"/><div className="numeric-wheel-fade bottom"/>
            </div>
            <div className="numeric-wheel-actions">
              <button
                type="button"
                className="cancel"
                onPointerDown={(event) => event.stopPropagation()}
                onTouchStart={(event) => { event.preventDefault(); event.stopPropagation(); closePicker(); }}
                onClick={(event) => { event.stopPropagation(); closePicker(); }}
              >CANCELAR</button>
              <button
                type="button"
                className="confirm"
                onPointerDown={(event) => event.stopPropagation()}
                onTouchStart={(event) => { event.preventDefault(); event.stopPropagation(); confirmPicker(); }}
                onClick={(event) => { event.stopPropagation(); confirmPicker(); }}
              >✓ OK</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function RocketSchematic({ vehicle }: { vehicle: Vehicle }) {
  const total = Number(vehicle.totalLength) || 860;
  const nose = Number(vehicle.noseLength) || 180;
  const bay = Number(vehicle.bayLength) || 180;
  const body = Number(vehicle.bodyLength) || 500;

  const x0 = 54;
  const usable = 520;
  const noseW = usable * (nose / total);
  const bayW = usable * (bay / total);
  const bodyW = usable * (body / total);
  const finX = vehicle.finX === '' ? x0 + usable - 90 : x0 + usable * (Number(vehicle.finX) / total);
  const finRoot = vehicle.rootChord === '' ? 60 : Math.max(25, usable * (Number(vehicle.rootChord) / total));
  const finTip = vehicle.tipChord === '' ? finRoot * 0.55 : Math.max(15, usable * (Number(vehicle.tipChord) / total));
  const sweep = vehicle.sweep === '' ? 20 : usable * (Number(vehicle.sweep) / total);

  return (
    <div className="schematic">
      <svg viewBox="0 0 650 230" role="img" aria-label="Parametric side view of rocket">
        <defs>
          <linearGradient id="bodyGlow" x1="0" x2="1">
            <stop offset="0%" stopColor="#dce7ff" stopOpacity=".95" />
            <stop offset="100%" stopColor="#86a8ff" stopOpacity=".72" />
          </linearGradient>
        </defs>

        <line x1="36" y1="115" x2="618" y2="115" className="axis" />
        <path
          d={`M ${x0} 115 Q ${x0 + noseW * 0.38} 64 ${x0 + noseW} 74 L ${x0 + noseW} 156 Q ${x0 + noseW * 0.38} 166 ${x0} 115 Z`}
          className="nose"
        />
        <rect x={x0 + noseW} y="74" width={bayW} height="82" className="bay" />
        <rect x={x0 + noseW + bayW} y="74" width={bodyW} height="82" className="body" />

        <line x1={x0 + noseW} y1="64" x2={x0 + noseW} y2="166" className="station" />
        <line x1={x0 + noseW + bayW} y1="64" x2={x0 + noseW + bayW} y2="166" className="station" />

        <polygon
          points={`${finX},156 ${finX + finRoot},156 ${finX + sweep + finTip},203 ${finX + sweep},203`}
          className="fin"
        />

        <text x={x0 + noseW / 2} y="51">NOSE {mm(vehicle.noseLength)}</text>
        <text x={x0 + noseW + bayW / 2} y="51">BAY {mm(vehicle.bayLength)}</text>
        <text x={x0 + noseW + bayW + bodyW / 2} y="51">BODY {mm(vehicle.bodyLength)}</text>
        <text x="54" y="221">L = {mm(vehicle.totalLength)} · Ø = {mm(vehicle.diameter)} · {vehicle.airfoil}</text>
      </svg>
      <div className="schematic-meta">
        <span><i className="dot frozen" /> Frozen geometry</span>
        <span><i className="dot provisional" /> Provisional</span>
        <span><i className="dot tbd" /> TBD blocks analysis</span>
      </div>
    </div>
  );
}

function App() {
  const [lang, setLang] = useState<'es' | 'en'>('es');
  const isEs = lang === 'es';
  const txt = (es: string, en: string) => isEs ? es : en;
  const [vehicle, setVehicle] = useState(initialVehicle);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [runToken, setRunToken] = useState(0);
  const [resetToken, setResetToken] = useState(0);
  const [showComponentCgs, setShowComponentCgs] = useState(true);
  const [analysisSummary, setAnalysisSummary] = useState<any>(null);
  const [componentSummary, setComponentSummary] = useState<any>(null);
  const [componentRows, setComponentRows] = useState<ComponentRow[]>(initialComponentRows);
  const [currentTwin, setCurrentTwin] = useState<CurrentTwin | null>(null);
  const [twinAssembly, setTwinAssembly] = useState<TwinAssembly | null>(null);
  const [currentCp, setCurrentCp] = useState<CurrentCp | null>(null);
  const [motorConfigs, setMotorConfigs] = useState<MotorConfig[]>(initialMotorConfigs);
  const [activeMotorId, setActiveMotorId] = useState('motor-1');
  const [showMotorEditor, setShowMotorEditor] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [mobileSection, setMobileSection] = useState<'home' | 'mdr' | 'pdr' | 'cdr' | 'frr' | 'lrr' | 'pfr' | 'vehicle' | 'geometry' | 'motor' | 'analysis' | 'plots' | 'model' | 'status' | 'cad'>('home');
  const [pdrTilt, setPdrTilt] = useState({ x: 0, y: 0 });
  const [pdrZoom, setPdrZoom] = useState(1);
  const [pdrSchematicFocused, setPdrSchematicFocused] = useState(false);
  const [pdrViewIndex, setPdrViewIndex] = useState(0);
  const [phaseFocusIndex, setPhaseFocusIndex] = useState(2);
  const [phaseStoryDragX, setPhaseStoryDragX] = useState(0);
  const [phaseStoryDragging, setPhaseStoryDragging] = useState(false);
  const [pdrTab, setPdrTab] = useState<'geometry' | 'schematic' | 'mass'>('geometry');
  const [showPdrCadImport, setShowPdrCadImport] = useState(false);
  const [showHeaderCadModal, setShowHeaderCadModal] = useState(false);
  const [cdrTab, setCdrTab] = useState<'stability' | 'trajectory' | 'propulsion'>('stability');
  const [cdrPositionFocus, setCdrPositionFocus] = useState<'cg' | 'cp' | 'margin'>('margin');
  const [exportPreparing, setExportPreparing] = useState(false);
  const [selectedRequirementId, setSelectedRequirementId] = useState('R1');
  const [requirementStatusOverrides, setRequirementStatusOverrides] = useState<RequirementStatusOverrides>(() => {
    try {
      const saved = window.localStorage.getItem('trajectum.requirement-statuses.v1');
      return saved ? JSON.parse(saved) as RequirementStatusOverrides : {};
    } catch {
      return {};
    }
  });

  const [missionControlOpen, setMissionControlOpen] = useState(false);
  const [pendingMissionLaunch, setPendingMissionLaunch] = useState(false);
  const motor = motorConfigs.find((item) => item.id === activeMotorId) ?? motorConfigs[0];
  const averageThrust = motorAverageThrust(motor);
  const estimatedCd = Number(currentTwin?.aerodynamics?.cd?.value ?? 0.345);

  React.useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch('/api/v1/digital-twin/current', { signal: controller.signal }).then((response) => response.ok ? response.json() : null),
      fetch('/api/v1/digital-twin/assembly', { signal: controller.signal }).then((response) => response.ok ? response.json() : null),
      fetch('/api/v1/digital-twin/cp', { signal: controller.signal }).then((response) => response.ok ? response.json() : null),
    ]).then(([design, assembly, cp]) => {
      if (design) setCurrentTwin(design as CurrentTwin);
      if (cp) setCurrentCp(cp as CurrentCp);
      if (assembly) {
        const twin = assembly as TwinAssembly;
        setTwinAssembly(twin);
        if (twin.resolved && twin.total_length_mm != null) {
          const source = design as CurrentTwin | null;
          setVehicle((current) => ({
            ...current,
            totalLength: Number(twin.total_length_mm!.toFixed(2)),
            diameter: Number(source?.geometry?.outer_diameter_mm?.value ?? current.diameter),
            noseLength: Number(source?.geometry?.nose_length_mm?.value ?? 180),
            wall: '',
            finCount: Number(source?.fins?.count?.value ?? 4),
            rootChord: Number(source?.fins?.root_chord_mm?.value ?? current.rootChord),
            tipChord: Number(source?.fins?.tip_chord_mm?.value ?? current.tipChord),
            span: Number(source?.fins?.span_mm?.value ?? current.span),
            sweep: Number(source?.fins?.sweep_length_mm?.value ?? current.sweep),
            finX: Number(source?.fins?.leading_edge_x_mm?.value ?? current.finX),
            airfoil: 'NACA 0012',
            cd: source?.aerodynamics?.cd?.value == null ? '' : Number(source.aerodynamics.cd.value),
          }));
        }
      }
    }).catch((error) => {
      if (error instanceof DOMException && error.name === 'AbortError') return;
    });
    return () => controller.abort();
  }, []);

  const updateRequirementStatus = (id: string, status: RequirementStatus) => {
    setRequirementStatusOverrides((current) => {
      const next = { ...current, [id]: status };
      try {
        window.localStorage.setItem('trajectum.requirement-statuses.v1', JSON.stringify(next));
      } catch {
        // Local persistence is best-effort; in-memory state remains authoritative.
      }
      return next;
    });
  };

  const navigateMobile = (target: typeof mobileSection) => {
    if (target === mobileSection) return;
    setMobileSection(target);
  };

  const selectPhase = (index: number) => {
    const phases: Array<typeof mobileSection> = ['mdr', 'pdr', 'analysis', 'frr', 'lrr', 'pfr'];
    setPhaseFocusIndex(index);
    navigateMobile(phases[index]);
  };

  const movePhaseFocus = (delta: number) => {
    setPhaseFocusIndex((current) => Math.max(0, Math.min(5, current + delta)));
  };

  const mobileNavIndex = mobileSection === 'home'
      ? 0
      : ['mdr','pdr','vehicle','geometry','motor','cad'].includes(mobileSection)
        ? 1
        : ['cdr','analysis','model','status','frr'].includes(mobileSection)
          ? 2
          : ['plots','lrr'].includes(mobileSection)
            ? 3
            : mobileSection === 'pfr'
              ? 4
              : 0;

  const update = <K extends keyof Vehicle>(key: K, value: Vehicle[K]) => {
    setVehicle((current) => ({ ...current, [key]: value }));
  };

  const updateComponentDesign = (id: number, key: 'massG' | 'lengthMm' | 'diameterMm', value: NumericField) => {
    setComponentRows((current) => current.map((row) => row.id === id ? { ...row, [key]: value } : row));
    const row = componentRows.find((item) => item.id === id);
    if (!row) return;
    if (key === 'lengthMm' && row.kind === 'nose') update('noseLength', value);
    if (key === 'lengthMm' && row.kind === 'body') update('bodyLength', value);
    if (key === 'diameterMm' && (row.kind === 'nose' || row.kind === 'body') && value !== '') update('diameter', value);
    if (key === 'massG' && row.kind === 'motor' && value !== '') {
      const dry = Math.max(Number(value) - (Number(motor.propellantMass) || 0), 1);
      updateMotor('dryMass', Number(dry.toFixed(1)));
    }
    setAnalysisSummary(null);
  };

  const updateMotor = <K extends keyof MotorConfig>(key: K, value: MotorConfig[K]) => {
    setMotorConfigs((current) => current.map((item) => item.id === activeMotorId ? { ...item, [key]: value } : item));
    setAnalysisSummary(null);
  };

  const activeMotorReady =
    motor.burn !== '' && Number(motor.burn) > 0 &&
    motor.impulse !== '' && Number(motor.impulse) > 0 &&
    motor.propellantMass !== '' && Number(motor.propellantMass) >= 0 &&
    motor.dryMass !== '' && Number(motor.dryMass) > 0 &&
    motor.designation.trim().length > 0;

  const importCadGeometry = (geometry: { totalLength: number; diameter: number; noseLength: number | null }) => {
    setVehicle((current) => {
      const noseLength = geometry.noseLength ?? current.noseLength;
      const currentBay = Number(current.bayLength) || 0;
      const lowerBody = Math.max(geometry.totalLength - Number(noseLength) - currentBay, 0);
      return {
        ...current,
        totalLength: Number(geometry.totalLength.toFixed(3)),
        diameter: Number(geometry.diameter.toFixed(3)),
        noseLength: typeof noseLength === 'number' ? Number(noseLength.toFixed(3)) : noseLength,
        bodyLength: Number(lowerBody.toFixed(3)),
      };
    });
  };

  const realMassStationsReady = currentTwin?.masses?.status != null && !currentTwin.masses.status.includes('cg-stations-pending');

  const blockers = useMemo(() => {
    const result: string[] = [];
    if (vehicle.tipChord === '') result.push(txt('Cuerda de punta', 'Fin tip chord'));
    if (vehicle.sweep === '') result.push(txt('Desplazamiento del borde de ataque', 'Leading-edge offset'));
    if (vehicle.finX === '') result.push(txt('Posición axial de la aleta', 'Fin axial location'));
    if (vehicle.cd === '') result.push(txt('Coeficiente de resistencia aerodinámica Cd', 'Drag coefficient Cd'));
    if (!motor.designation.trim()) result.push(txt('Designación del motor', 'Motor designation'));
    if (motor.burn === '' || Number(motor.burn) <= 0) result.push(txt('Tiempo de combustión del motor', 'Motor burn time'));
    if (motor.impulse === '' || Number(motor.impulse) <= 0) result.push(txt('Impulso total del motor', 'Motor total impulse'));
    if (motor.propellantMass === '' || Number(motor.propellantMass) < 0) result.push(txt('Masa de propelente', 'Propellant mass'));
    if (motor.dryMass === '' || Number(motor.dryMass) <= 0) result.push(txt('Masa seca del motor', 'Motor dry mass'));
    if (currentTwin?.masses?.status?.includes('cg-stations-pending')) result.push(txt('Estaciones xCG de componentes reales', 'Real component xCG stations'));
    return result;
  }, [vehicle, lang, motor, currentTwin]);

  const axialSum =
    (Number(vehicle.noseLength) || 0) +
    (Number(vehicle.bayLength) || 0) +
    (Number(vehicle.bodyLength) || 0);
  const geometryConsistent = twinAssembly?.resolved === true || (vehicle.totalLength !== '' && axialSum === Number(vehicle.totalLength));
  const ready = blockers.length === 0;
  const twinStationLabel = (key: string) => ({
    nose: txt('Cofia', 'Nose'),
    c1_parachute_payload: 'C1',
    c2: 'C2',
    tail_fin_can: txt('Cola + aletas', 'Tail + fins'),
  } as Record<string, string>)[key] ?? key;
  const mobileGuideStep = !geometryConsistent ? 'vehicle' : !activeMotorReady ? 'motor' : !analysisSummary ? 'analysis' : 'results';
  const mobileGuideCompleted = analysisSummary ? 4 : activeMotorReady && geometryConsistent ? 3 : geometryConsistent ? 2 : 1;

  const requirementContext = {
    totalLengthMm: Number(vehicle.totalLength),
    launchAngleDeg: Number(vehicle.launchAngle),
    payloadMassG: componentSummary?.components?.find((item: any) => item.name === 'Carga útil')?.mass_g ?? 100,
    analysis: analysisSummary,
  };
  const requirementStatuses = PROJECT_REQUIREMENTS.map((req) => requirementStatusOverrides[req.id] ?? deriveRequirementStatus(req.id, requirementContext));
  const requirementVerified = requirementStatuses.filter((status) => status === 'verified').length;
  const requirementProgress = requirementStatuses.filter((status) => status === 'progress').length;
  const stabilityMargin = analysisSummary?.static_margin_calibers;
  const stabilityState = stabilityMargin == null ? txt('SIN CALCULAR', 'NOT RUN') : stabilityMargin >= 1.0 ? txt('ESTABLE', 'STABLE') : txt('REVISAR', 'CHECK');
  const cdrTrajectoryPoints = (() => {
    const samples = analysisSummary?.mission_timeline ?? [];
    if (samples.length < 2) return '';
    const maxX = Math.max(...samples.map((sample: any) => Number(sample.x_m) || 0), 1);
    const maxH = Math.max(...samples.map((sample: any) => Number(sample.altitude_m) || 0), 1);
    return samples.map((sample: any) => {
      const x = 28 + ((Number(sample.x_m) || 0) / maxX) * 277;
      const y = 118 - ((Number(sample.altitude_m) || 0) / maxH) * 95;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  })();

  const triggerNavHaptic = () => {
    if (typeof window !== 'undefined' && navigator.vibrate) navigator.vibrate(20);
  };
  const handleNavPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    button.style.setProperty('--press-x', x + 'px');
    button.style.setProperty('--press-y', y + 'px');
    button.classList.remove('nav-releasing');
    button.classList.add('nav-pressing');
    triggerNavHaptic();

    const ripple = document.createElement('span');
    ripple.className = 'nav-touch-ripple';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    button.appendChild(ripple);
    requestAnimationFrame(() => ripple.classList.add('expand'));

    // The pressure response is a short autonomous burst: it starts on touch
    // and finishes even if the finger remains on the key.
    window.setTimeout(() => {
      button.classList.remove('nav-pressing');
      button.classList.add('nav-releasing');
    }, 150);
    window.setTimeout(() => button.classList.remove('nav-releasing'), 350);
    window.setTimeout(() => ripple.remove(), 460);
  };

  const openExportSheet = () => {
    setShowExportMenu(true);
    setExportPreparing(true);
    window.setTimeout(() => setExportPreparing(false), 1400);
  };

  const runFromTop = () => {
    setRunToken((value) => value + 1);
  };

  const goToAnalysis = () => {
    setRunToken((value) => value + 1);
    document.getElementById('engineering-analysis')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const continueMobileGuide = () => {
    if (mobileGuideStep === 'vehicle') {
      navigateMobile('vehicle');
      document.getElementById('vehicle-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (mobileGuideStep === 'motor') {
      navigateMobile('vehicle');
      document.getElementById('motor-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (mobileGuideStep === 'analysis') {
      navigateMobile('analysis');
      goToAnalysis();
      return;
    }
    navigateMobile('plots');
    document.querySelector('.flight-analysis-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const reset = () => {
    setVehicle({
      ...initialVehicle,
      totalLength: twinAssembly?.total_length_mm != null ? Math.round(twinAssembly.total_length_mm) : initialVehicle.totalLength,
      diameter: Number(currentTwin?.geometry?.outer_diameter_mm?.value ?? initialVehicle.diameter),
    });
    setMotorConfigs(initialMotorConfigs);
    setActiveMotorId('motor-1');
    setAnalysisSummary(null);
    setComponentSummary(null);
    setComponentRows(initialComponentRows);
    setResetToken((value) => value + 1);
  };

  const handleAnalysisUpdate = useCallback((analysis: any, components: any) => {
    // Mass properties are the live source of truth for CG. A full-analysis result
    // may be older than the latest mass/geometry edit, so never let it pin CG.
    setAnalysisSummary(analysis);
    setComponentSummary(components);
    if (pendingMissionLaunch && analysis?.mission_timeline?.length > 1) {
      window.setTimeout(() => {
        setPendingMissionLaunch(false);
        setMissionControlOpen(true);
      }, 1200);
    }
  }, [pendingMissionLaunch]);

  const liveCgFromNose = componentSummary?.total_cg_mm ?? analysisSummary?.cg_x_mm_from_nose ?? null;
  const liveCpFromNose = analysisSummary?.cp_x_mm_from_nose ?? currentCp?.cp_x_mm_from_nose ?? null;
  const liveCpFromSupport = analysisSummary?.cp_x_mm_from_support ?? currentCp?.cp_x_mm_from_support ?? null;

  const downloadBlob = (contents: BlobPart, type: string, filename: string) => {
    const blob = new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const formatReportNumber = (value: unknown, decimals = 1) => {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(decimals) : '—';
  };
  const roundReportNumber = (value: unknown, decimals = 1) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return '';
    const factor = 10 ** decimals;
    return Math.round(number * factor) / factor;
  };

  const exportReportPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text('TRAJECTUM · UTN-FRH-G07', 16, 18);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text('Reporte técnico de misión / Cátedra', 16, 25);
    const lines = [
      ['Masa total', formatReportNumber(analysisSummary?.total_mass_g ?? componentSummary?.total_mass_g, 1) + ' g'],
      ['CG desde apoyo', formatReportNumber(analysisSummary?.cg_x_mm_from_support ?? (componentSummary?.total_cg_mm != null ? Number(vehicle.totalLength) - componentSummary.total_cg_mm : null), 1) + ' mm'],
      ['CP desde apoyo', formatReportNumber(analysisSummary?.cp_x_mm_from_support, 1) + ' mm'],
      ['Margen estático', formatReportNumber(analysisSummary?.static_margin_calibers, 2) + ' calibres'],
      ['Apogeo', formatReportNumber(analysisSummary?.apogee_m, 1) + ' m'],
      ['Max Q', formatReportNumber(analysisSummary?.max_q_pa, 1) + ' Pa'],
      ['Ángulo de lanzamiento', formatReportNumber(vehicle.launchAngle, 1) + '°'],
      ['Motor', motor.designation || '—'],
    ];
    let y = 38;
    for (const [label, value] of lines) { doc.setFont('helvetica','bold'); doc.text(label + ':',16,y); doc.setFont('helvetica','normal'); doc.text(String(value),68,y); y += 7; }
    y += 5; doc.setFont('helvetica','bold'); doc.text('Cumplimiento R1-R11',16,y); y += 7; doc.setFont('helvetica','normal');
    PROJECT_REQUIREMENTS.forEach((req,index)=>{ const status=requirementStatuses[index]; doc.text(`${req.id} · ${req.titleEs} · ${status === 'verified' ? 'VERIFICADO' : status === 'progress' ? 'EN PROCESO' : 'ABIERTO'}`,16,y); y += 6; });
    doc.save('TRAJECTUM_Reporte_Catedra_UTN-FRH-G07.pdf');
    setShowExportMenu(false);
  };

  const exportRequirementsCsv = () => {
    const headers = ['id','titulo','objetivo','metodos','estado'];
    const rows = PROJECT_REQUIREMENTS.map((req,index)=>[
      req.id, req.titleEs, req.targetEs, req.methods.join('/'),
      requirementStatuses[index] === 'verified' ? 'VERIFICADO' : requirementStatuses[index] === 'progress' ? 'EN PROCESO' : 'ABIERTO'
    ]);
    const csv = [headers,...rows].map((row)=>row.map((value)=>'"'+String(value).replace(/"/g,'""')+'"').join(',')).join('\n');
    downloadBlob(csv,'text/csv;charset=utf-8','TRAJECTUM_Requerimientos_R1-R11.csv');
    setShowExportMenu(false);
  };

  const exportTelemetryJson = () => {
    downloadBlob(JSON.stringify({ project:'UTN-FRH-G07', launchAngleDeg:Number(vehicle.launchAngle), motor:motor.designation, telemetry:analysisSummary?.mission_timeline ?? [], analysis:analysisSummary }, null, 2),'application/json','TRAJECTUM_Telemetria.json');
    setShowExportMenu(false);
  };

  const exportJson = () => {
    const payload = {
      meta: { product: 'TRAJECTUM', version: 'v0.1.0-CDR', exportedAt: new Date().toISOString(), project: 'UTN-FRH-G07 / CDR', activeMotorId },
      vehicle,
      motorConfigurations: motorConfigs,
      activeMotor: motor,
      components: componentSummary,
      analysis: analysisSummary,
    };
    downloadBlob(JSON.stringify(payload, null, 2), 'application/json', 'trajectum-engineering-export.json');
    setShowExportMenu(false);
  };

  const exportTrajectoryCsv = () => {
    const samples = analysisSummary?.mission_timeline ?? [];
    const headers = ['t_s','phase','x_m','altitude_m','speed_m_s','vertical_speed_m_s','mach','q_pa','acceleration_g','parachute_deployed'];
    const escapeCsv = (value: unknown) => '"' + String(value ?? '').replace(/"/g, '""') + '"';
    const rows = [headers.join(','), ...samples.map((sample: any) => headers.map((key) => escapeCsv(sample[key])).join(','))];
    downloadBlob(rows.join('\n'), 'text/csv;charset=utf-8', 'trajectum-trajectory.csv');
    setShowExportMenu(false);
  };

  const exportChartsZip = async () => {
    const samples = analysisSummary?.mission_timeline ?? [];
    if (!samples.length) {
      goToAnalysis();
      setShowExportMenu(false);
      return;
    }
    const [{ zipSync }, chartImages] = await Promise.all([
      import('fflate'),
      buildEngineeringChartImages(samples, Number(motor.burn) || 0, analysisSummary ?? {}),
    ]);
    const archiveEntries = Object.fromEntries(
      chartImages.files.map((file) => [file.filename, new Uint8Array(file.buffer)]),
    );
    const zipped = zipSync(archiveEntries, { level: 6 });
    downloadBlob(zipped, 'application/zip', 'TRAJECTUM_Graficos_Engineering.zip');
    setShowExportMenu(false);
  };

  const exportExcel = async () => {
    const { default: writeXlsxFile } = await import('write-excel-file');
    const header = (value: string) => ({ value, fontWeight: 'bold' as const, backgroundColor: '#DCE6F1' });
    const cell = (value: any) => ({ value: value ?? '' });
    const pair = (name: string, value: any) => [header(name), cell(value)];
    const summary = [
      [header('TRAJECTUM — ENGINEERING EXPORT'), header('VALOR')],
      pair('Proyecto', 'UTN-FRH-G07 / CDR'), pair('Versión', 'v0.1.0-CDR'), pair('Exportado', new Date().toLocaleString()), pair('Motor activo', motor.designation || motor.label),
      pair('Masa total [g]', roundReportNumber(analysisSummary?.total_mass_g ?? componentSummary?.total_mass_g, 1)),
      pair('CG desde apoyo [mm]', roundReportNumber(componentSummary?.total_cg_mm != null ? Number(vehicle.totalLength) - componentSummary.total_cg_mm : analysisSummary?.cg_x_mm_from_support, 1)),
      pair('CP desde apoyo [mm]', roundReportNumber(analysisSummary?.cp_x_mm_from_support, 1)), pair('Margen estático [calibres]', roundReportNumber(analysisSummary?.static_margin_calibers, 2)),
      pair('Apogeo [m]', roundReportNumber(analysisSummary?.apogee_m, 1)), pair('Velocidad máxima [m/s]', roundReportNumber(analysisSummary?.max_speed_m_s, 1)), pair('Mach máximo', roundReportNumber(analysisSummary?.max_mach, 2)),
      pair('Q máxima [Pa]', roundReportNumber(analysisSummary?.max_q_pa, 1)), pair('Tiempo al apogeo [s]', roundReportNumber(analysisSummary?.time_to_apogee_s, 2)), pair('Tiempo de aterrizaje [s]', roundReportNumber(analysisSummary?.landing_time_s, 2)),
      pair('Velocidad de impacto [m/s]', roundReportNumber(analysisSummary?.impact_speed_m_s, 2)),
    ];
    const geometry = [
      [header('PARÁMETRO'), header('VALOR'), header('UNIDAD')],
      [cell('Longitud total'), cell(vehicle.totalLength), cell('mm')], [cell('Diámetro exterior'), cell(vehicle.diameter), cell('mm')], [cell('Longitud de cofia'), cell(vehicle.noseLength), cell('mm')],
      [cell('Compartimiento modular'), cell(vehicle.bayLength), cell('mm')], [cell('Cuerpo inferior'), cell(vehicle.bodyLength), cell('mm')], [cell('Espesor de pared'), cell(vehicle.wall), cell('mm')],
      [cell('Perfil de cofia'), cell(vehicle.noseProfile), cell('')], [cell('Perfil de aleta'), cell(vehicle.airfoil), cell('')], [cell('Cantidad de aletas'), cell(vehicle.finCount), cell('')],
      [cell('Cuerda raíz cr'), cell(vehicle.rootChord), cell('mm')], [cell('Cuerda punta ct'), cell(vehicle.tipChord), cell('mm')], [cell('Semienvergadura s'), cell(vehicle.span), cell('mm')],
      [cell('Desplazamiento borde de ataque Xf'), cell(vehicle.sweep), cell('mm')], [cell('Posición axial aleta'), cell(vehicle.finX), cell('mm')], [cell('Ángulo lanzamiento'), cell(vehicle.launchAngle), cell('deg')], [cell('Cd vehículo'), cell(vehicle.cd), cell('')],
    ];
    const comp = analysisSummary?.components ?? componentSummary?.components ?? [];
    const masses = [[header('COMPONENTE'), header('MASA [g]'), header('xCG DESDE NARIZ [mm]'), header('xCG DESDE APOYO [mm]'), header('FUENTE')], ...comp.map((item: any) => [cell(item.name), cell(roundReportNumber(item.mass_g, 1)), cell(roundReportNumber(item.x_cg_mm_from_nose ?? item.x_cg_mm, 1)), cell(roundReportNumber(item.x_cg_mm_from_support ?? (item.x_cg_mm != null ? Number(vehicle.totalLength) - item.x_cg_mm : null), 1)), cell(item.source)])];
    const cp = [[header('PARÁMETRO CP'), header('VALOR'), header('UNIDAD')], [cell('Método'), cell('Barrowman / perfil axisimétrico'), cell('')], [cell('CP total desde nariz'), cell(roundReportNumber(analysisSummary?.cp_x_mm_from_nose, 1)), cell('mm')], [cell('CP total desde apoyo'), cell(roundReportNumber(analysisSummary?.cp_x_mm_from_support, 1)), cell('mm')], [cell('CP cofia desde nariz'), cell(roundReportNumber(analysisSummary?.nose_cp_x_mm_from_nose, 1)), cell('mm')], [cell('CP cofia desde apoyo'), cell(roundReportNumber(analysisSummary?.nose_cp_x_mm_from_support, 1)), cell('mm')], [cell('CP aletas desde nariz'), cell(roundReportNumber(analysisSummary?.fins_cp_x_mm_from_nose, 1)), cell('mm')], [cell('CP aletas desde apoyo'), cell(roundReportNumber(analysisSummary?.fins_cp_x_mm_from_support, 1)), cell('mm')], [cell('Margen estático'), cell(roundReportNumber(analysisSummary?.static_margin_calibers, 2)), cell('calibres')]];
    const trajectory = [[header('t [s]'),header('FASE'),header('x [m]'),header('ALTITUD [m]'),header('VELOCIDAD [m/s]'),header('V VERTICAL [m/s]'),header('MACH'),header('Q [Pa]'),header('ACELERACIÓN [g]'),header('PARACAÍDAS')], ...(analysisSummary?.mission_timeline ?? []).map((sample: any) => [cell(sample.t_s),cell(sample.phase),cell(sample.x_m),cell(sample.altitude_m),cell(sample.speed_m_s),cell(sample.vertical_speed_m_s),cell(sample.mach),cell(sample.q_pa),cell(sample.acceleration_g),cell(sample.parachute_deployed ? 'SI' : 'NO')])];
    const motorSheet = [[header('CONFIGURACIÓN'),header('DESIGNACIÓN'),header('PROPELENTE'),header('COMBUSTIÓN [s]'),header('IMPULSO [N·s]'),header('EMPUJE MEDIO DERIVADO [N]'),header('EMPUJE MÁX [N]'),header('PROPELENTE [g]'),header('SECA [g]'),header('ACTIVA')], ...motorConfigs.map((item) => [cell(item.label),cell(item.designation),cell(item.propellant),cell(item.burn),cell(item.impulse),cell(motorAverageThrust(item)),cell(item.maxThrust),cell(item.propellantMass),cell(item.dryMass),cell(item.id === activeMotorId ? 'SI' : 'NO')])];
    const recovery = [[header('PARÁMETRO'),header('VALOR'),header('UNIDAD')],[cell('Cd paracaídas'),cell(roundReportNumber(vehicle.parachuteCd,2)),cell('')],[cell('Área paracaídas'),cell(roundReportNumber(vehicle.parachuteArea,2)),cell('m²')],[cell('Altitud despliegue configurada'),cell(roundReportNumber(vehicle.deployAltitude,1)),cell('m')],[cell('Retardo despliegue'),cell(roundReportNumber(vehicle.deployDelay,2)),cell('s')],[cell('Altitud despliegue simulada'),cell(roundReportNumber(analysisSummary?.deployment_altitude_m,1)),cell('m')],[cell('Tiempo despliegue'),cell(roundReportNumber(analysisSummary?.deployment_time_s,2)),cell('s')],[cell('Tiempo aterrizaje'),cell(roundReportNumber(analysisSummary?.landing_time_s,2)),cell('s')],[cell('Velocidad impacto'),cell(roundReportNumber(analysisSummary?.impact_speed_m_s,2)),cell('m/s')]];
    const model = [[header('MÓDULO'),header('MÉTODO / MODELO')],[cell('CG'),cell('Sumatoria de momentos de masa')],[cell('CP'),cell('Barrowman + perfil axisimétrico de cofia')],[cell('Trayectoria'),cell('Masa puntual 2D')],[cell('Integración'),cell('Runge–Kutta de cuarto orden (RK4)')],[cell('Resistencia'),cell('D = 1/2 ρ V² Cd A')],[cell('Atmósfera'),cell('ISA')],[cell('Recuperación'),cell('Modelo de descenso con paracaídas')]];
    const requirementsSheet = [
      [header('ID'),header('REQUERIMIENTO'),header('OBJETIVO'),header('MÉTODO'),header('ESTADO')],
      ...PROJECT_REQUIREMENTS.map((req,index)=>[
        cell(req.id),
        cell(req.titleEs),
        cell(req.targetEs),
        cell(req.methods.join('/')),
        cell(requirementStatuses[index] === 'verified' ? 'VERIFICADO' : requirementStatuses[index] === 'progress' ? 'EN PROCESO' : 'ABIERTO'),
      ]),
    ];
    const chartImages = await buildEngineeringChartImages(analysisSummary?.mission_timeline ?? [], Number(motor.burn) || 0, analysisSummary ?? {});
    await writeXlsxFile([summary, geometry, masses, cp, trajectory, motorSheet, recovery, model, requirementsSheet], {
      sheets: ['RESUMEN','GEOMETRIA','MASAS_CG','CP','TRAYECTORIA','MOTOR','RECUPERACION','MODELO','REQUERIMIENTOS'],
      images: [chartImages.summary, [], [], [], chartImages.trajectory, [], [], [], []],
      fileName: 'TRAJECTUM_Engineering_Export.xlsx',
    });
    setShowExportMenu(false);
  };

  return (
    <main className={'app-shell mobile-view-' + mobileSection}>
      <header className="topbar">
        <div className="brand-stack">
          <div className="brand-lockup" aria-label="TRAJECTUM">
            <svg className="brand-trajectory" viewBox="0 0 340 78" aria-hidden="true">
              <path className="brand-orbit-glow" d="M 2 58 Q 72 4 138 27 Q 180 43 220 18" />
              <path className="brand-orbit-line" d="M 2 58 Q 72 4 138 27 Q 180 43 220 18" />
              <circle className="brand-endpoint" cx="220" cy="18" r="3.4" />
              <circle className="brand-comet" r="4.2">
                <animateMotion dur="3.2s" repeatCount="indefinite" path="M 2 58 Q 72 4 138 27 Q 180 43 220 18" />
              </circle>
              <circle className="brand-comet brand-comet-tail" r="2.4">
                <animateMotion begin="-0.16s" dur="3.2s" repeatCount="indefinite" path="M 2 58 Q 72 4 138 27 Q 180 43 220 18" />
              </circle>
            </svg>
            <div className="brand-wordmark">
              <span className="brand-name">TRAJECTUM</span>
              <span className="brand-subline">{txt('INGENIERÍA · SIMULACIÓN · ANÁLISIS', 'ENGINEERING · SIMULATION · ANALYSIS')}</span>
            </div>
            <span className="brand-version">{twinAssembly?.resolved ? 'DEV · TWIN ' + Math.round(twinAssembly.total_length_mm ?? 0) + ' mm' : 'V0.1.0-CDR'}</span>
            <div className="mobile-header-tools">
              <button
                type="button"
                className="mobile-lang-pill"
                onClick={() => setLang((current) => current === 'es' ? 'en' : 'es')}
                aria-label={txt('Cambiar idioma', 'Change language')}
              >
                <Globe2 size={14} strokeWidth={1.8} />
                <span>{txt('IDIOMA', 'LANGUAGE')}</span>
                <b>{isEs ? 'ES' : 'EN'}</b>
              </button>
              <button
                type="button"
                className="mobile-header-export mobile-header-import compact"
                onClick={() => setShowHeaderCadModal(true)}
                aria-label={txt('Importar CAD', 'Import CAD')}
              >
                <FileUp size={15} strokeWidth={1.8} />
                <span>CAD</span>
              </button>
            </div>
          </div>
          <h1>{txt('Ingeniería del vehículo', 'Vehicle Engineering Workspace')}</h1>
        </div>
        <div className="top-actions">
          <button className="ghost" onClick={reset}>{txt('Restablecer caso UTN', 'Reset UTN baseline')}</button>
          <div className="export-control">
            <button className="ghost export-trigger" onClick={() => setShowExportMenu((value) => !value)} aria-expanded={showExportMenu}>
              {txt('EXPORTAR RESULTADOS', 'EXPORT RESULTS')} <span>▾</span>
            </button>
            {showExportMenu && <div className="export-menu">
              <button type="button" onClick={exportExcel}><strong>EXCEL TÉCNICO</strong><small>.XLSX · 8 HOJAS + GRÁFICOS</small></button>
              <button type="button" onClick={exportChartsZip}><strong>{txt('GRÁFICOS PNG', 'PNG PLOTS')}</strong><small>{txt('5 ARCHIVOS · ALTA RESOLUCIÓN · IMPRESIÓN', '5 FILES · HIGH RES · PRINT')}</small></button>
              <button type="button" onClick={exportJson}><strong>JSON</strong><small>{txt('REPRODUCIBLE / SOFTWARE', 'REPRODUCIBLE / SOFTWARE')}</small></button>
              <button type="button" onClick={exportTrajectoryCsv}><strong>CSV</strong><small>{txt('TRAYECTORIA TABULAR', 'TABULAR TRAJECTORY')}</small></button>
            </div>}
          </div>
          <button className="run" onClick={ready ? runFromTop : goToAnalysis}>
            {ready ? txt('EJECUTAR · ACTUALIZAR CG/CP', 'RUN · UPDATE CG/CP') : `${txt('ABRIR ANÁLISIS', 'OPEN ANALYSIS')} · ${blockers.length} ${txt('ENTRADAS', 'INPUTS')}`}
          </button>
          <button className="ghost lang-toggle" onClick={() => setLang((current) => current === 'es' ? 'en' : 'es')} title={txt('Cambiar a inglés', 'Switch to Spanish')}>{isEs ? 'EN' : 'ES'}</button>
        </div>
      </header>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '8px 12px',
          background: '#0b1f3a',
          borderTop: '1px solid #28558c',
          borderBottom: '1px solid #28558c',
          color: '#e8f2ff',
          fontSize: '12px',
          fontWeight: 800,
          letterSpacing: '.06em',
          textAlign: 'center',
          flexWrap: 'wrap',
        }}
        className="dev-twin-status"
        aria-label="TRAJECTUM development twin status"
      >
        <span>DEV · GEMELO ACTUAL</span>
        <strong>{twinAssembly?.total_length_mm != null ? Math.round(twinAssembly.total_length_mm) + ' mm' : 'CARGANDO…'}</strong>
        <span>Ø{currentTwin?.geometry?.outer_diameter_mm?.value ?? '—'} mm</span>
        <span>{currentTwin?.masses?.measured_structure_total_g ?? '—'} g estructura</span>
      </div>

      <nav className="status-strip" aria-label={txt('Navegación rápida del proyecto', 'Project quick navigation')}>
        <button className="status-item" type="button" onClick={() => document.getElementById('vehicle-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          <span>{txt('PROYECTO', 'PROJECT')}</span><strong>UTN-FRH-G07 / CDR</strong><i>↘</i>
        </button>
        <button className="status-item" type="button" onClick={() => document.getElementById('geometry-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          <span>{txt('GEOMETRÍA', 'GEOMETRY')}</span><strong className={twinAssembly?.resolved ? 'ok' : geometryConsistent ? 'ok' : 'bad'}>{twinAssembly?.resolved ? 'GEMELO ' + Math.round(twinAssembly.total_length_mm ?? 0) + ' mm' : geometryConsistent ? txt('CONSISTENTE', 'CONSISTENT') : txt('REVISAR LONGITUDES', 'CHECK LENGTHS')}</strong><i>↘</i>
        </button>
        <button className="status-item" type="button" onClick={() => document.getElementById('fins-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
          <span>{txt('PERFIL', 'AIRFOIL')}</span><strong>{vehicle.airfoil}</strong><i>↘</i>
        </button>
        <button className="status-item" type="button" onClick={() => document.getElementById('motor-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
          <span>MOTOR</span><strong>{motor.designation}</strong><i>↘</i>
        </button>
        <button className="status-item" type="button" onClick={() => document.getElementById('analysis-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          <span>{txt('CDR NUMÉRICO', 'NUMERIC CDR')}</span><strong className={ready ? 'ok' : 'warn'}>{ready ? txt('LISTO', 'READY') : txt('BLOQUEADO', 'BLOCKED')}</strong><i>↘</i>
        </button>
      </nav>

      <div className="mobile-content-stack">
      <section className="mobile-guide" aria-label={txt('Guía del proyecto', 'Project guide')}>
        <div
          className="mobile-project-header-card"
          onTouchStart={(event) => {
            event.currentTarget.dataset.touchX = String(event.touches[0]?.clientX ?? 0);
            setPhaseStoryDragging(true);
            setPhaseStoryDragX(0);
          }}
          onTouchMove={(event) => {
            const start = Number(event.currentTarget.dataset.touchX ?? 0);
            const x = event.touches[0]?.clientX ?? start;
            setPhaseStoryDragX(Math.max(-78, Math.min(78, x - start)));
          }}
          onTouchEnd={(event) => {
            const start = Number(event.currentTarget.dataset.touchX ?? 0);
            const end = event.changedTouches[0]?.clientX ?? start;
            const delta = end - start;
            if (Math.abs(delta) > 34) movePhaseFocus(delta < 0 ? 1 : -1);
            setPhaseStoryDragging(false);
            setPhaseStoryDragX(0);
          }}
          onTouchCancel={() => {
            setPhaseStoryDragging(false);
            setPhaseStoryDragX(0);
          }}
        >
          <div className="mobile-phase-progress story-progress" aria-hidden="true">
            {[0,1,2,3,4,5].map((index) => <i key={index} className={index === phaseFocusIndex ? 'active' : index < phaseFocusIndex ? 'past' : ''} />)}
          </div>

          <div className="mobile-project-story-viewport">
            <div
              className={phaseStoryDragging ? 'mobile-project-story-track dragging' : 'mobile-project-story-track'}
              style={{ transform: `translate3d(calc(-${phaseFocusIndex * (100 / 6)}% + ${phaseStoryDragX}px),0,0)` }}
            >
              {[
                { code: 'MDR', titleEs: 'DISEÑO DE MISIÓN / REQUERIMIENTOS', titleEn: 'MISSION DESIGN / REQUIREMENTS' },
                { code: 'PDR', titleEs: 'DISEÑO PRELIMINAR', titleEn: 'PRELIMINARY DESIGN' },
                { code: 'CDR', titleEs: 'DISEÑO CRÍTICO', titleEn: 'CRITICAL DESIGN' },
                { code: 'FRR', titleEs: 'LISTO PARA VUELO', titleEn: 'FLIGHT READINESS' },
                { code: 'LRR', titleEs: 'LISTO PARA LANZAMIENTO', titleEn: 'LAUNCH READINESS' },
                { code: 'PFR / MCR', titleEs: 'POST-VUELO Y CIERRE', titleEn: 'POST-FLIGHT & CLOSEOUT' },
              ].map((phase, index) => (
                <div className="mobile-project-story-slide" key={phase.code} aria-hidden={index !== phaseFocusIndex}>
                  <div className="mobile-guide-top">
                    <div>
                      <span>{txt('PROYECTO ACTIVO', 'ACTIVE PROJECT')}</span>
                      <strong>UTN-FRH-G07</strong>
                      <small className="mobile-phase-focus-title">{phase.code} · {txt(phase.titleEs, phase.titleEn)}</small>
                    </div>
                    <div className="mobile-guide-score"><b>{String(index + 1).padStart(2, '0')}/06</b><small>{txt('FASE ACTIVA', 'ACTIVE PHASE')}</small></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mobile-phase-selector-card">
          <div
            className="mobile-phase-wheel phase-grid-selector"
            aria-label={txt('Explorar fases del proyecto', 'Explore project phases')}
            onTouchStart={(event) => {
              event.currentTarget.dataset.touchX = String(event.touches[0]?.clientX ?? 0);
            }}
            onTouchEnd={(event) => {
              const start = Number(event.currentTarget.dataset.touchX ?? 0);
              const end = event.changedTouches[0]?.clientX ?? start;
              const delta = end - start;
              if (Math.abs(delta) > 34) movePhaseFocus(delta < 0 ? 1 : -1);
            }}
          >
            <button type="button" className={phaseFocusIndex === 0 ? 'focused' : ''} onClick={() => selectPhase(0)}><b>01</b><span>MDR</span><small>{txt('Misión / requisitos', 'Mission / requirements')}</small></button>
            <button type="button" className={phaseFocusIndex === 1 ? 'focused' : ''} onClick={() => selectPhase(1)}><b>02</b><span>PDR</span><small>{txt('Diseño preliminar', 'Preliminary design')}</small></button>
            <button type="button" className={phaseFocusIndex === 2 ? 'focused' : ''} onClick={() => selectPhase(2)}><b>03</b><span>CDR</span><small>{txt('Diseño crítico', 'Critical design')}</small></button>
            <button type="button" className={phaseFocusIndex === 3 ? 'focused' : ''} onClick={() => selectPhase(3)}><b>04</b><span>FRR</span><small>{txt('Listo para vuelo', 'Flight readiness')}</small></button>
            <button type="button" className={phaseFocusIndex === 4 ? 'focused' : ''} onClick={() => selectPhase(4)}><b>05</b><span>LRR</span><small>{txt('Listo para lanzamiento', 'Launch readiness')}</small></button>
            <button type="button" className={phaseFocusIndex === 5 ? 'focused' : ''} onClick={() => selectPhase(5)}><b>06</b><span>PFR</span><small>{txt('Post-vuelo / MCR', 'Post-flight / MCR')}</small></button>
            <div className="phase-wheel-hint">{txt('DESLIZÁ PARA CAMBIAR DE FASE', 'SWIPE TO CHANGE PHASE')}</div>
          </div>
        </div>

        <div className="mobile-guide-next">
          <span>{txt('SIGUIENTE PASO', 'NEXT STEP')}</span>
          <h2>{txt('Diseño preliminar del vehículo', 'Preliminary vehicle design')}</h2>
          <p>{txt('Definí geometría, esquema y distribución de masas en PDR. Cuando el diseño cierre, ejecutás el análisis completo y pasás a CDR.', 'Define geometry, schematic and mass distribution in PDR. Once the design closes, run the full analysis and move to CDR.')}</p>
        </div>

        <button type="button" className="mobile-guide-cta home-design-cta" onClick={() => navigateMobile('pdr')}>
          <span>{txt('ABRIR PDR · DISEÑO', 'OPEN PDR · DESIGN')}</span>
          <b>→</b>
        </button>

        <div className="mobile-guide-steps">
          <button type="button" className={geometryConsistent ? 'complete' : mobileGuideStep === 'vehicle' ? 'current' : ''} onClick={() => navigateMobile('pdr')}><b>PDR</b><span>{txt('DISEÑO', 'DESIGN')}</span><em>{geometryConsistent ? '✓' : '→'}</em></button>
          <button type="button" className={analysisSummary ? 'complete' : ''} onClick={() => navigateMobile('analysis')}><b>CDR</b><span>{txt('ANÁLISIS', 'ANALYSIS')}</span><em>{analysisSummary ? '✓' : '→'}</em></button>
        </div>

        <section className="mobile-home-dashboard" aria-label={txt('Resumen ejecutivo', 'Executive summary')}>
          <div className="mobile-home-dashboard-head">
            <div><span>{txt('DISEÑO EN CURSO', 'DESIGN IN PROGRESS')}</span><strong>{txt('Resumen preliminar del vehículo', 'Preliminary vehicle snapshot')}</strong></div>
            <button type="button" onClick={() => navigateMobile('mdr')}>{txt('VER MDR', 'VIEW MDR')} →</button>
          </div>
          <div className="mobile-home-metrics design-metrics">
            <article><span>{txt('LARGO TOTAL · GEMELO', 'TOTAL LENGTH · TWIN')}</span><strong>{twinAssembly?.total_length_mm != null ? Math.round(twinAssembly.total_length_mm) : vehicle.totalLength} mm</strong><small>{txt('ensamblaje CAD actual', 'current CAD assembly')}</small></article>
            <article><span>{txt('DIÁMETRO', 'DIAMETER')}</span><strong>Ø{currentTwin?.geometry?.outer_diameter_mm?.value ?? vehicle.diameter} mm</strong><small>{txt('envolvente CAD', 'CAD envelope')}</small></article>
            <article><span>{txt('MASA ESTRUCTURAL MEDIDA', 'MEASURED STRUCTURAL MASS')}</span><strong>{currentTwin?.masses?.measured_structure_total_g ?? componentRows.reduce((sum,row)=>sum+(Number(row.massG)||0),0).toFixed(0)} g</strong><small>{txt('piezas impresas medidas', 'measured printed parts')}</small></article>
            <article><span>{txt('REQUERIMIENTOS', 'REQUIREMENTS')}</span><strong>{requirementVerified}/11</strong><small>{requirementProgress} {txt('en proceso', 'in progress')}</small></article>
          </div>
          <button type="button" className="mobile-home-telemetry-link design-link" onClick={() => navigateMobile('pdr')}>
            <Rocket size={18}/>
            <span>{txt('CONTINUAR DISEÑO · GEOMETRÍA Y MASA', 'CONTINUE DESIGN · GEOMETRY & MASS')}</span>
            <b>→</b>
          </button>
        </section>
      </section>

      <section className="mobile-phase-screen mobile-mdr-screen" aria-label="MDR">
        <div className="mobile-screen-head">
          <button type="button" onClick={() => navigateMobile('home')} aria-label={txt('Volver', 'Back')}><ArrowLeft size={20} strokeWidth={1.8} /></button>
          <div><span>FASE 01 · KOM / MDR</span><h2>MDR · {txt('DISEÑO DE MISIÓN Y REQUERIMIENTOS', 'MISSION DESIGN & REQUIREMENTS')}</h2></div>
          <b className="current">1</b>
        </div>
        <div className="mobile-screen-copy">
          <strong>{txt('Definición de misión, restricciones y trazabilidad', 'Mission definition, constraints and traceability')}</strong>
          <p>{txt('La matriz R1–R11 es la fuente de verdad para verificar diseño, ensayo, inspección y análisis durante todo el ciclo.', 'The R1–R11 matrix is the source of truth for design, test, inspection and analysis across the lifecycle.')}</p>
        </div>
        <RequirementsMatrix
          lang={lang}
          totalLengthMm={Number(vehicle.totalLength)}
          launchAngleDeg={Number(vehicle.launchAngle)}
          payloadMassG={componentSummary?.components?.find((item: any) => item.name === 'Carga útil')?.mass_g ?? 100}
          analysis={analysisSummary}
          statusOverrides={requirementStatusOverrides}

          onStatusChange={updateRequirementStatus}

          selectedRequirementId={selectedRequirementId}

          onSelectRequirement={setSelectedRequirementId}

        />
      </section>

      <section className="mobile-phase-screen mobile-pdr-screen" aria-label="PDR">
        <div className="mobile-screen-head">
          <button type="button" onClick={() => navigateMobile('home')} aria-label={txt('Volver', 'Back')}><ArrowLeft size={20} strokeWidth={1.8} /></button>
          <div><span>FASE 02</span><h2>PDR · {txt('DISEÑO DEL VEHÍCULO', 'VEHICLE DESIGN')}</h2></div>
          <b className="complete">✓</b>
        </div>

        <div className="phase-internal-tabs pdr-tabs" role="tablist" aria-label={txt('Vistas PDR', 'PDR views')}>
          <button type="button" className={pdrTab === 'geometry' ? 'active' : ''} onClick={() => setPdrTab('geometry')}><b>01</b><span>{txt('GEOMETRÍA', 'GEOMETRY')}</span></button>
          <button type="button" className={pdrTab === 'schematic' ? 'active' : ''} onClick={() => setPdrTab('schematic')}><b>02</b><span>{txt('ESQUEMA', 'SCHEMATIC')}</span></button>
          <button type="button" className={pdrTab === 'mass' ? 'active' : ''} onClick={() => setPdrTab('mass')}><b>03</b><span>{txt('MASA', 'MASS')}</span></button>
        </div>

        {pdrTab === 'geometry' && <section className="phase-process-panel pdr-geometry-panel">
          <div className="phase-panel-head"><div><span>{txt('GEOMETRÍA Y PARÁMETROS', 'GEOMETRY & PARAMETERS')}</span></div><b className={twinAssembly?.resolved ? 'ok' : 'warn'}>{twinAssembly?.resolved ? '✓' : '!'}</b></div>

          {twinAssembly && <div className="pdr-mass-editor" aria-label={txt('Gemelo digital actual', 'Current digital twin')}>
            {twinAssembly.stations.map((station) => <article key={station.key} className="pdr-component-card">
              <div className="pdr-component-head">
                <strong>{twinStationLabel(station.key)}</strong>
                <span>{station.x_start_mm != null && station.x_end_mm != null ? 'x ' + station.x_start_mm.toFixed(0) + '–' + station.x_end_mm.toFixed(0) + ' mm' : 'x —'}</span>
              </div>
              <div className="pdr-component-fields">
                <label><span>{txt('LARGO PIEZA', 'PART LENGTH')}</span><output>{station.raw_length_mm.toFixed(0)} mm</output></label>
                <label><span>{txt('INICIO', 'START')}</span><output>{station.x_start_mm?.toFixed(0) ?? '—'} mm</output></label>
                <label><span>{txt('FIN', 'END')}</span><output>{station.x_end_mm?.toFixed(0) ?? '—'} mm</output></label>
              </div>
            </article>)}
          </div>}

          {twinAssembly && <div className="pdr-mass-total">
            <span>{txt('GEMELO CAD ACTUAL', 'CURRENT CAD TWIN')}</span>
            <strong>{twinAssembly.total_length_mm?.toFixed(0) ?? '—'} mm · Ø{currentTwin?.geometry?.outer_diameter_mm?.value ?? '—'} mm</strong>
            <small>{txt('Ensamblaje derivado de planos · masa estructural medida ', 'Drawing-derived assembly · measured structural mass ')}{currentTwin?.masses?.measured_structure_total_g ?? '—'} g</small>
          </div>}

          {currentCp?.resolved && <div className="pdr-mass-total">
            <span>{txt('CP · BARROWMAN', 'CP · BARROWMAN')}</span>
            <strong>{currentCp.cp_x_mm_from_nose?.toFixed(1)} mm {txt('desde nariz', 'from nose')} · {currentCp.cp_x_mm_from_support?.toFixed(1)} mm {txt('desde apoyo', 'from support')}</strong>
            <small>{txt('Derivado de la geometría Fusion actual · CG todavía pendiente', 'Derived from current Fusion geometry · CG still pending')}</small>
          </div>}

          <div className="pdr-input-grid">
            <label className="pdr-cad-locked"><span>{txt('LARGO TOTAL', 'TOTAL LENGTH')}</span><output>{vehicle.totalLength} mm <b>CAD</b></output></label>
            <label className="pdr-cad-locked"><span>{txt('DIÁMETRO', 'DIAMETER')}</span><output>Ø{vehicle.diameter} mm <b>CAD</b></output></label>
            <label className="pdr-cad-locked"><span>{txt('COFIA', 'NOSE')}</span><output>{txt('OJIVA TANGENTE', 'TANGENT OGIVE')} <b>CAD</b></output></label>
            <label className="pdr-cad-locked"><span>{txt('PERFIL DE ALETA', 'FIN AIRFOIL')}</span><output>{vehicle.airfoil} <b>CAD</b></output></label>
            <label className="pdr-cad-locked"><span>{txt('ALETAS', 'FINS')}</span><output>{vehicle.finCount} <b>CAD</b></output></label>
            <label className="pdr-cad-locked"><span>{txt('CUERDA RAÍZ', 'ROOT CHORD')}</span><output>{Number(vehicle.rootChord).toFixed(2)} mm <b>CAD</b></output></label>
            <label className="pdr-cad-locked"><span>{txt('CUERDA PUNTA', 'TIP CHORD')}</span><output>{Number(vehicle.tipChord).toFixed(2)} mm <b>CAD</b></output></label>
            <label className="pdr-cad-locked"><span>{txt('ENVERGADURA RADIAL', 'RADIAL SPAN')}</span><output>{Number(vehicle.span).toFixed(1)} mm <b>{txt('DERIVADO', 'DERIVED')}</b></output></label>
            <label className="pdr-cad-locked"><span>{txt('DESPLAZAMIENTO DE PUNTA', 'TIP OFFSET')}</span><output>≈{Number(vehicle.sweep).toFixed(0)} mm <b>{txt('DERIVADO', 'DERIVED')}</b></output></label>
            <label className="pdr-cad-locked"><span>{txt('INICIO ALETA DESDE NARIZ', 'FIN START FROM NOSE')}</span><output>{Number(vehicle.finX).toFixed(0)} mm <b>{txt('DERIVADO', 'DERIVED')}</b></output></label>
            <label><span>{txt('TOBERA · LARGO', 'NOZZLE · LENGTH')}</span><NumericStepper value={vehicle.nozzleLength} onChange={(value) => update('nozzleLength', value)} unit="mm" step={1}/></label>
            <label><span>{txt('TOBERA · Ø CUELLO', 'NOZZLE · NECK Ø')}</span><NumericStepper value={vehicle.nozzleNeckDiameter} onChange={(value) => update('nozzleNeckDiameter', value)} unit="mm" step={1}/></label>
            <label><span>{txt('TOBERA · Ø SALIDA', 'NOZZLE · EXIT Ø')}</span><NumericStepper value={vehicle.nozzleExitDiameter} onChange={(value) => update('nozzleExitDiameter', value)} unit="mm" step={1}/></label>
          </div>
          <div className="pdr-inline-actions">
            <button type="button" className="phase-secondary-link" onClick={() => navigateMobile('mdr')}><ClipboardCheck size={17}/><span>{requirementVerified}/11 {txt('REQUERIMIENTOS VERIFICADOS', 'REQUIREMENTS VERIFIED')}</span><b>→</b></button>
            <button type="button" className="phase-secondary-link cad-inline-trigger" onClick={() => setShowPdrCadImport((value) => !value)}><FileUp size={17}/><span>{txt('IMPORTAR CAD', 'IMPORT CAD')}</span><b>{showPdrCadImport ? '×' : '+'}</b></button>
          </div>
          {showPdrCadImport && <CadInteroperabilityPanel onGeometryImported={importCadGeometry} lang={lang} compact />}
        </section>}

        {pdrTab === 'schematic' && <section
          className={`phase-process-panel mobile-pdr-vehicle pdr-schematic-panel${pdrSchematicFocused ? ' focused' : ''}`}
          style={{ '--tilt-x': pdrTilt.x + 'deg', '--tilt-y': pdrTilt.y + 'deg', '--pdr-zoom': pdrZoom } as React.CSSProperties}
          onPointerDown={(event) => {
            setPdrSchematicFocused(true);
            event.currentTarget.focus?.({ preventScroll: true });
          }}
          onPointerMove={(event) => {
            if (event.pointerType !== 'touch' && event.buttons === 0) return;
            const rect = event.currentTarget.getBoundingClientRect();
            const px = (event.clientX - rect.left) / rect.width - .5;
            const py = (event.clientY - rect.top) / rect.height - .5;
            setPdrTilt({ x: Math.max(-5, Math.min(5, -py * 10)), y: Math.max(-7, Math.min(7, px * 14)) });
          }}
          onPointerLeave={() => setPdrTilt({ x: 0, y: 0 })}
          onPointerUp={() => setPdrTilt({ x: 0, y: 0 })}
        >
          <div className="mobile-pdr-vehicle-head">
            <div>
              <span>{pdrViewIndex === 0 ? txt('VISTA PRINCIPAL', 'PRIMARY VIEW') : pdrViewIndex === 1 ? txt('VISTA 3D', '3D VIEW') : txt('COMPONENTES', 'COMPONENTS')}</span>
              <strong>{pdrViewIndex === 0 ? txt('CG · CP · estaciones sincronizadas', 'CG · CP · synchronized stations') : pdrViewIndex === 1 ? txt('Vista CAD del ensamblaje', 'CAD assembly view') : txt('Despiece y referencias del conjunto', 'Assembly components and references')}</strong>
            </div>
            <div className="pdr-schematic-tools" onPointerDown={(event) => event.stopPropagation()}>
              <button type="button" onClick={() => setPdrZoom((value) => Math.max(.82, +(value - .1).toFixed(2)))} aria-label={txt('Alejar esquema', 'Zoom out')}><ZoomOut size={16}/></button>
              <button type="button" className="zoom-readout" onClick={() => setPdrZoom(1)} aria-label={txt('Restablecer zoom', 'Reset zoom')}>{Math.round(pdrZoom * 100)}%</button>
              <button type="button" onClick={() => setPdrZoom((value) => Math.min(1.35, +(value + .1).toFixed(2)))} aria-label={txt('Acercar esquema', 'Zoom in')}><ZoomIn size={16}/></button>
              <button type="button" onClick={() => { setPdrZoom(1); setPdrTilt({ x: 0, y: 0 }); }} aria-label={txt('Centrar esquema', 'Center schematic')}><Maximize2 size={16}/></button>
            </div>
          </div>

          <div className="pdr-view-selector" role="tablist" aria-label={txt('Vistas del esquema', 'Schematic views')}>
            {[
              { label: txt('COMPLETO', 'FULL'), sub: 'CG + CP' },
              { label: '3D', sub: txt('ENSAMBLE', 'ASSEMBLY') },
              { label: txt('COMPONENTES', 'COMPONENTS'), sub: txt('DESPIECE', 'PARTS') },
            ].map((view, index) => <button key={view.label} type="button" className={pdrViewIndex === index ? 'active' : ''} onClick={() => { setPdrViewIndex(index); setPdrZoom(1); }}><span>{view.label}</span><small>{view.sub}</small></button>)}
          </div>

          <div
            className={`mobile-pdr-model pdr-view-${pdrViewIndex}`}
            onTouchStart={(event) => {
              if (event.touches.length > 1) {
                event.currentTarget.dataset.multiTouch = '1';
                event.currentTarget.dataset.touchX = '';
                return;
              }
              event.currentTarget.dataset.multiTouch = '';
              event.currentTarget.dataset.touchX = String(event.touches[0]?.clientX ?? 0);
            }}
            onTouchMove={(event) => {
              if (event.touches.length > 1) {
                event.currentTarget.dataset.multiTouch = '1';
                event.currentTarget.dataset.touchX = '';
              }
            }}
            onTouchEnd={(event) => {
              if (event.currentTarget.dataset.multiTouch === '1') {
                if (event.touches.length === 0) event.currentTarget.dataset.multiTouch = '';
                return;
              }
              const start = Number(event.currentTarget.dataset.touchX ?? 0);
              const end = event.changedTouches[0]?.clientX ?? start;
              const delta = end - start;
              if (start && Math.abs(delta) > 42) {
                setPdrViewIndex((current) => delta < 0 ? Math.min(2, current + 1) : Math.max(0, current - 1));
                setPdrZoom(1);
              }
            }}
          >
            <div className="pdr-flip-stage" key={pdrViewIndex}>
              {pdrViewIndex === 0 ? <RocketRealistic
                vehicle={vehicle}
                cgMm={liveCgFromNose}
                cpMm={liveCpFromNose}
                componentCgs={componentSummary?.components ?? []}
                assemblyStations={twinAssembly?.stations ?? []}
                showComponentCgs
                lang={lang}
              /> : <div className="pdr-cad-image-frame">
                <img
                  src={pdrViewIndex === 1 ? pdrCad2d : pdrCad3d}
                  alt={pdrViewIndex === 1 ? txt('Vista 3D CAD del cohete', '3D CAD rocket view') : txt('Vista de componentes del conjunto', 'Assembly components view')}
                  draggable={false}
                />
              </div>}
            </div>
          </div>
          <div className="pdr-view-dots" aria-hidden="true"><i className={pdrViewIndex === 0 ? 'active' : ''}/><i className={pdrViewIndex === 1 ? 'active' : ''}/><i className={pdrViewIndex === 2 ? 'active' : ''}/></div>
          <div className="schematic-live-stats">
            <span><b>{vehicle.totalLength}</b> mm {txt('LARGO', 'LENGTH')}</span>
            <span><b>Ø{vehicle.diameter}</b> mm</span>
            <span><b>{vehicle.finCount}</b> {txt('ALETAS', 'FINS')}</span>
          </div>
        </section>}

        {pdrTab === 'mass' && <section className="phase-process-panel pdr-mass-panel">
          <div className="phase-panel-head"><div><span>{txt('MASAS REALES', 'REAL MASSES')}</span><strong>{txt('Estructura pesada · xCG provisional desde planos', 'Measured structure · provisional xCG from drawings')}</strong></div><b>{currentTwin?.masses?.measured_structure_total_g != null ? Math.round(currentTwin.masses.measured_structure_total_g) + 'g' : '—'}</b></div>
          <div className="pdr-mass-editor">
            {(currentTwin?.masses?.measured_items ?? []).map((item) => <article key={item.name} className="pdr-component-card">
              <div className="pdr-component-head"><strong>{item.name}</strong><span>{item.x_cg_mm_from_nose != null ? `xCG ≈ ${item.x_cg_mm_from_nose.toFixed(1)} mm` : 'xCG —'}</span></div>
              <div className="pdr-component-fields">
                <label><span>{txt('MASA MEDIDA', 'MEASURED MASS')}</span><output>{item.mass_g.toFixed(0)} g</output></label>
                <label><span>{txt('FUENTE', 'SOURCE')}</span><output>{txt('BALANZA', 'SCALE')}</output></label>
                <label><span>xCG</span><output>{item.x_cg_mm_from_nose != null ? `≈ ${item.x_cg_mm_from_nose.toFixed(1)} mm` : txt('PENDIENTE', 'PENDING')}</output></label>
              </div>
            </article>)}
            {(currentTwin?.masses?.known_internal_items ?? []).map((item) => <article key={item.name} className="pdr-component-card">
              <div className="pdr-component-head"><strong>{item.name}</strong><span>{txt('INTERNO', 'INTERNAL')} · {item.x_cg_mm_from_nose != null ? `xCG ≈ ${item.x_cg_mm_from_nose.toFixed(1)} mm` : 'xCG —'}</span></div>
              <div className="pdr-component-fields">
                <label><span>{txt('MASA', 'MASS')}</span><output>{item.mass_g.toFixed(0)} g</output></label>
                <label><span>{txt('ESTADO', 'STATUS')}</span><output>{txt('CONFIRMADA', 'CONFIRMED')}</output></label>
                <label><span>xCG</span><output>{item.x_cg_mm_from_nose != null ? `≈ ${item.x_cg_mm_from_nose.toFixed(1)} mm` : txt('PENDIENTE', 'PENDING')}</output></label>
              </div>
            </article>)}
          </div>
          <div className="pdr-mass-total">
            <span>{txt('ESTRUCTURA MEDIDA', 'MEASURED STRUCTURE')}</span>
            <strong>{currentTwin?.masses?.measured_structure_total_g ?? '—'} g</strong>
            <small>{txt('xCG provisional estimado desde planos; reemplazar por propiedades de masa CAD o medición de balance antes de congelar el CDR.', 'Provisional xCG estimated from drawings; replace with CAD mass properties or balance measurement before freezing the CDR.')}</small>
          </div>
        </section>}

        <button type="button" className="cdr-analysis-primary pdr-analysis-launch" disabled={!ready} onClick={() => {
          setRunToken((value) => value + 1);
          navigateMobile('analysis');
        }}>
          <span className="cdr-analysis-primary-icon"><Sigma size={23}/></span>
          <span className="cdr-analysis-primary-copy">
            <small>{txt('CIERRE PDR → CDR', 'PDR CLOSEOUT → CDR')}</small>
            <strong>{txt('EJECUTAR ANÁLISIS COMPLETO', 'RUN FULL ANALYSIS')}</strong>
            <em>{txt('Calcula masa · CG · CP · margen · trayectoria', 'Calculates mass · CG · CP · margin · trajectory')}</em>
          </span>
          <b>→</b>
        </button>
      </section>

      <section className="mobile-phase-screen mobile-cdr-screen" aria-label="CDR">
        <div className="mobile-screen-head">
          <button type="button" onClick={() => navigateMobile('home')} aria-label={txt('Volver', 'Back')}><ArrowLeft size={20} strokeWidth={1.8} /></button>
          <div><span>FASE 03 · {txt('ACTUAL', 'CURRENT')}</span><h2>CDR · {txt('ANÁLISIS CRÍTICO', 'CRITICAL ANALYSIS')}</h2></div>
          <b className={analysisSummary ? 'complete' : 'current'}>{analysisSummary ? '✓' : '3'}</b>
        </div>
        <button
          type="button"
          className={analysisSummary ? 'cdr-analysis-primary recalculated' : 'cdr-analysis-primary'}
          disabled={!ready}
          onClick={() => setRunToken((value) => value + 1)}
        >
          <span className="cdr-analysis-primary-icon"><Sigma size={23}/></span>
          <span className="cdr-analysis-primary-copy">
            <small>{txt('PASO PRINCIPAL · CDR', 'PRIMARY STEP · CDR')}</small>
            <strong>{analysisSummary ? txt('RECALCULAR ANÁLISIS CDR', 'RECALCULATE CDR ANALYSIS') : txt('EJECUTAR ANÁLISIS COMPLETO', 'RUN FULL ANALYSIS')}</strong>
            <em>{txt('Calcula masa · CG · CP · margen · trayectoria', 'Calculates mass · CG · CP · margin · trajectory')}</em>
          </span>
          <b>→</b>
        </button>

        <div className="phase-internal-tabs cdr-tabs" role="tablist" aria-label={txt('Vistas CDR', 'CDR views')}>
          <button type="button" className={cdrTab === 'stability' ? 'active' : ''} onClick={() => setCdrTab('stability')}><Gauge size={16}/><span>CG / CP</span></button>
          <button type="button" className={cdrTab === 'trajectory' ? 'active' : ''} onClick={() => setCdrTab('trajectory')}><ChartNoAxesCombined size={16}/><span>{txt('TRAYECTORIA', 'TRAJECTORY')}</span></button>
          <button type="button" className={cdrTab === 'propulsion' ? 'active' : ''} onClick={() => setCdrTab('propulsion')}><Flame size={16}/><span>{txt('MOTOR', 'MOTOR')}</span></button>
        </div>

        {cdrTab === 'stability' && <section className="phase-process-panel cdr-stability-panel">
          <div className="phase-panel-head"><div><span>{txt('AERODINÁMICA Y ESTABILIDAD', 'AERODYNAMICS & STABILITY')}</span><strong>CG ↔ CP · Barrowman</strong></div><b className={stabilityMargin != null && stabilityMargin >= 1 ? 'ok' : 'warn'}>{stabilityMargin != null ? stabilityMargin.toFixed(2) : '—'}</b></div>
          <div className="stability-summary-grid cdr-result-widgets">
            <button type="button" className={cdrPositionFocus === 'cg' ? 'active cg-widget' : 'cg-widget'} onClick={() => setCdrPositionFocus('cg')}>
              <span>CG</span>
              <strong>{liveCgFromNose != null ? (Number(vehicle.totalLength) - liveCgFromNose).toFixed(1) + ' mm' : '—'}</strong>
              <small>{txt('desde apoyo · tocar para ubicar', 'from support · tap to locate')}</small>
            </button>
            <button type="button" className={cdrPositionFocus === 'cp' ? 'active cp-widget' : 'cp-widget'} onClick={() => setCdrPositionFocus('cp')}>
              <span>CP</span>
              <strong>{liveCpFromSupport != null ? liveCpFromSupport.toFixed(1) + ' mm' : '—'}</strong>
              <small>{txt('Barrowman · tocar para ubicar', 'Barrowman · tap to locate')}</small>
            </button>
            <button type="button" className={cdrPositionFocus === 'margin' ? 'active margin-widget' : 'margin-widget'} onClick={() => setCdrPositionFocus('margin')}>
              <span>{txt('MARGEN ESTÁTICO', 'STATIC MARGIN')}</span>
              <strong>{stabilityMargin != null ? stabilityMargin.toFixed(2) + ' cal' : '—'}</strong>
              <small>{stabilityState}</small>
            </button>
          </div>
          <div className={'stability-axis focus-' + cdrPositionFocus} aria-label={txt('Posición relativa de CG y CP', 'Relative CG and CP position')}>
            <div className="stability-axis-line"/>
            {liveCgFromNose != null && <i className="cg-marker" style={{ left: Math.max(4, Math.min(96, liveCgFromNose / Number(vehicle.totalLength) * 100)) + '%' }}><b>CG</b></i>}
            {liveCpFromNose != null && <i className="cp-marker" style={{ left: Math.max(4, Math.min(96, liveCpFromNose / Number(vehicle.totalLength) * 100)) + '%' }}><b>CP</b></i>}
            <span>0</span><em>{vehicle.totalLength} mm</em>
          </div>
          <div className="cdr-position-detail">
            {cdrPositionFocus === 'cg' && <><b>CG</b><span>{txt('Centro de gravedad calculado por sumatoria de momentos de masa.', 'Center of gravity calculated from the mass-moment summation.')}</span></>}
            {cdrPositionFocus === 'cp' && <><b>CP</b><span>{txt('Centro de presión calculado con Barrowman para cofia + aletas.', 'Center of pressure calculated with Barrowman for nose + fins.')}</span></>}
            {cdrPositionFocus === 'margin' && <><b>Δ CG–CP</b><span>{stabilityMargin != null ? txt('Separación equivalente: ', 'Equivalent separation: ') + (stabilityMargin * Number(vehicle.diameter)).toFixed(1) + ' mm · ' + stabilityMargin.toFixed(2) + ' cal' : txt('Ejecutá el análisis para obtener la separación y el margen.', 'Run analysis to obtain separation and margin.')}</span></>}
          </div>
          <button type="button" className="phase-secondary-link" onClick={() => navigateMobile('analysis')}><Sigma size={17}/><span>{txt('VER DESGLOSE MATEMÁTICO', 'VIEW MATH BREAKDOWN')}</span><b>→</b></button>
        </section>}

        {cdrTab === 'trajectory' && <section className="phase-process-panel cdr-trajectory-panel">
          <div className="phase-panel-head"><div><span>{txt('RESULTADO DE TRAYECTORIA', 'TRAJECTORY RESULT')}</span><strong>{txt('Cálculo, no reproducción', 'Calculation, not playback')}</strong></div><b>{analysisSummary?.apogee_m != null ? analysisSummary.apogee_m.toFixed(0) + 'm' : '—'}</b></div>
          <div className="cdr-result-curve">
            <svg viewBox="0 0 320 145" role="img" aria-label={txt('Curva analítica de trayectoria', 'Analytical trajectory curve')}>
              <path className="chart-grid" d="M28 18V118H305 M28 93H305 M28 68H305 M28 43H305"/>
              {cdrTrajectoryPoints ? <polyline className="cdr-trajectory-line" points={cdrTrajectoryPoints}/> : <path className="cdr-trajectory-line placeholder" d="M28 118 C58 40 105 18 161 25 C220 32 260 65 305 118"/>}
              <circle cx="161" cy="25" r="4" className="cdr-apogee-dot"/>
              <text x="145" y="15">{analysisSummary?.apogee_m != null ? analysisSummary.apogee_m.toFixed(1) + ' m' : 'APOGEO'}</text>
              <text x="28" y="137">{vehicle.launchAngle || 85}°</text>
            </svg>
          </div>
          <div className="propulsion-metrics">
            <div><span>{txt('APOGEO', 'APOGEE')}</span><strong>{analysisSummary?.apogee_m != null ? analysisSummary.apogee_m.toFixed(1) + ' m' : '—'}</strong></div>
            <div><span>q<sub>max</sub></span><strong>{analysisSummary?.max_q_pa != null ? analysisSummary.max_q_pa.toFixed(0) + ' Pa' : '—'}</strong></div>
            <div><span>{txt('V MÁX', 'MAX V')}</span><strong>{analysisSummary?.max_speed_m_s != null ? analysisSummary.max_speed_m_s.toFixed(1) + ' m/s' : '—'}</strong></div>
          </div>
          <button type="button" className="phase-secondary-link" onClick={() => { if (!analysisSummary && ready) setRunToken((value)=>value+1); else navigateMobile('plots'); }}><Play size={17}/><span>{analysisSummary ? txt('IR AL SIMULADOR DE VUELO', 'OPEN FLIGHT SIMULATOR') : txt('EJECUTAR CÁLCULO CDR', 'RUN CDR CALCULATION')}</span><b>→</b></button>
        </section>}

        {cdrTab === 'propulsion' && <section className="phase-process-panel cdr-propulsion-panel">
          <div className="phase-panel-head"><div><span>{txt('PERFIL PROPULSIVO', 'PROPULSIVE PROFILE')}</span><strong>{motor.designation || 'A-100 RN'} · {motor.propellant || 'KNDX'}</strong></div><b>{motor.maxThrust || '—'} N</b></div>
          <div className="thrust-chart">
            <svg viewBox="0 0 320 150" role="img" aria-label={txt('Curva de empuje versus tiempo', 'Thrust versus time curve')}>
              <path className="chart-grid" d="M34 18V126H302 M34 99H302 M34 72H302 M34 45H302"/>
              <polyline className="thrust-line" points="34,126 61,18 88,27 141,31 195,36 249,54 276,117 302,126"/>
              <line className="thrust-fill-baseline" x1="34" y1="126" x2="302" y2="126"/>
              <text x="8" y="22">600</text><text x="11" y="75">300</text><text x="18" y="130">0</text>
              <text x="31" y="145">0.0</text><text x="275" y="145">0.5 s</text>
            </svg>
          </div>
          <div className="propulsion-metrics">
            <div><span>{txt('IMPULSO', 'IMPULSE')}</span><strong>{motor.impulse} N·s</strong></div>
            <div><span>{txt('PROMEDIO', 'AVERAGE')}</span><strong>{averageThrust?.toFixed(0) ?? '—'} N</strong></div>
            <div><span>{txt('COMBUSTIÓN', 'BURN')}</span><strong>{motor.burn} s</strong></div>
          </div>
          <button type="button" className="phase-secondary-link" onClick={() => navigateMobile('motor')}><Flame size={17}/><span>{txt('CONFIGURAR MOTOR', 'CONFIGURE MOTOR')}</span><b>→</b></button>
        </section>}

      </section>

      <section className="mobile-phase-screen mobile-frr-screen" aria-label="FRR">
        <div className="mobile-screen-head">
          <button type="button" onClick={() => navigateMobile('home')} aria-label={txt('Volver', 'Back')}><ArrowLeft size={20} strokeWidth={1.8} /></button>
          <div><span>FASE 04</span><h2>FRR · {txt('VERIFICACIÓN Y MOTOR', 'VERIFICATION & MOTOR')}</h2></div>
          <b className={analysisSummary && ready ? 'complete' : 'current'}>{analysisSummary && ready ? '✓' : '4'}</b>
        </div>
        <div className="mobile-screen-copy">
          <strong>{txt('Verificación final antes del lanzamiento', 'Final verification before flight')}</strong>
          <p>{txt('Revisá geometría, motor, estabilidad, trayectoria y recuperación antes de habilitar la preparación de lanzamiento.', 'Review geometry, motor, stability, trajectory and recovery before launch preparation.')}</p>
        </div>
        <div className="mobile-readiness-grid">
          <button type="button" className={geometryConsistent ? 'ready' : ''} onClick={() => navigateMobile('pdr')}><Box size={19}/><span>{txt('GEOMETRÍA', 'GEOMETRY')}</span><strong>{geometryConsistent ? txt('VERIFICADA', 'VERIFIED') : txt('REVISAR', 'CHECK')}</strong></button>
          <button type="button" className={activeMotorReady ? 'ready' : ''} onClick={() => navigateMobile('motor')}><Flame size={19}/><span>MOTOR</span><strong>{activeMotorReady ? txt('VERIFICADO', 'VERIFIED') : txt('REVISAR', 'CHECK')}</strong></button>
          <button type="button" className={analysisSummary?.static_margin_calibers != null ? 'ready' : ''} onClick={() => navigateMobile('analysis')}><ShieldCheck size={19}/><span>{txt('ESTABILIDAD', 'STABILITY')}</span><strong>{analysisSummary?.static_margin_calibers != null ? analysisSummary.static_margin_calibers.toFixed(2) + ' cal' : '—'}</strong></button>
          <button type="button" className={analysisSummary?.landing_time_s != null ? 'ready' : ''} onClick={() => navigateMobile('analysis')}><ClipboardCheck size={19}/><span>{txt('RECUPERACIÓN', 'RECOVERY')}</span><strong>{analysisSummary?.landing_time_s != null ? txt('LISTA', 'READY') : txt('PENDIENTE', 'PENDING')}</strong></button>
        </div>
        <button type="button" className="phase-primary-action" disabled={!analysisSummary || !ready} onClick={() => navigateMobile('lrr')}>
          <RadioTower size={20} /><span>{txt('CONTINUAR A LRR', 'CONTINUE TO LRR')}</span><b>→</b>
        </button>
      </section>

      <section className="mobile-phase-screen mobile-lrr-screen" aria-label="LRR">
        <div className="mobile-screen-head">
          <button type="button" onClick={() => navigateMobile('home')} aria-label={txt('Volver', 'Back')}><ArrowLeft size={20} strokeWidth={1.8} /></button>
          <div><span>FASE 05</span><h2>LRR · {txt('SIMULACIÓN DE VUELO EN TIEMPO REAL', 'REAL-TIME FLIGHT SIMULATION')}</h2></div>
          <b className="current">5</b>
        </div>
        <div className="mobile-screen-copy">
          <strong>{txt('Centro de misión listo', 'Mission control ready')}</strong>
          <p>{txt('Esta fase concentra la simulación de misión en vivo y la secuencia completa de lanzamiento.', 'This phase contains the live mission simulation and full launch sequence.')}</p>
        </div>
        <button
          type="button"
          className={pendingMissionLaunch ? 'mission-launch-cta preparing' : 'mission-launch-cta lrr-primary'}
          disabled={!ready || pendingMissionLaunch}
          onClick={() => {
            setPendingMissionLaunch(true);
            if (analysisSummary?.mission_timeline?.length > 1) {
              window.setTimeout(() => {
                setPendingMissionLaunch(false);
                setMissionControlOpen(true);
              }, 1450);
              return;
            }
            setRunToken((value) => value + 1);
          }}
        >
          <span className="mission-launch-icon"><Rocket size={24} strokeWidth={1.8} /></span>
          <span className="mission-launch-copy">
            <small>{txt('MODO MISIÓN', 'MISSION MODE')}</small>
            <strong>{pendingMissionLaunch ? txt('INICIANDO VUELO…', 'INITIALIZING FLIGHT…') : txt('DESPEGAR / INICIAR SIMULACIÓN', 'LAUNCH / START SIMULATION')}</strong>
          </span>
          {pendingMissionLaunch ? <i className="mission-launch-spinner" /> : <b>→</b>}
        </button>
        <div className="mobile-lrr-summary">
          <div><span>{txt('MOTOR', 'MOTOR')}</span><strong>{motor.designation || '—'}</strong></div>
          <div><span>{txt('ÁNGULO', 'ANGLE')}</span><strong>{vehicle.launchAngle === '' ? '—' : vehicle.launchAngle + '°'}</strong></div>
          <div><span>{txt('APOGEO PREVISTO', 'PREDICTED APOGEE')}</span><strong>{analysisSummary?.apogee_m != null ? analysisSummary.apogee_m.toFixed(1) + ' m' : '—'}</strong></div>
          <div><span>MAX MACH</span><strong>{analysisSummary?.max_mach != null ? analysisSummary.max_mach.toFixed(3) : '—'}</strong></div>
        </div>
      </section>

      <section className="mobile-phase-screen mobile-pfr-screen" aria-label="PFR">
        <div className="mobile-screen-head">
          <button type="button" onClick={() => navigateMobile('home')} aria-label={txt('Volver', 'Back')}><ArrowLeft size={20} strokeWidth={1.8} /></button>
          <div><span>FASE 06</span><h2>PFR / MCR · {txt('REPORTES Y EXPORTACIÓN', 'REPORTS & EXPORT')}</h2></div>
          <b className={analysisSummary ? 'complete' : 'current'}>{analysisSummary ? '✓' : '6'}</b>
        </div>
        <div className="mobile-screen-copy">
          <strong>{txt('Telemetría, resultados y cierre técnico', 'Telemetry, results and technical closeout')}</strong>
          <p>{txt('Revisá la corrida completa, compará los hitos y exportá la evidencia técnica de la misión.', 'Review the full run, compare mission events and export the technical evidence.')}</p>
        </div>
        <div className="mobile-action-list">
          <button type="button" onClick={() => navigateMobile('plots')}><span><ChartNoAxesCombined size={18}/></span><div><strong>{txt('TELEMETRÍA Y GRÁFICOS', 'TELEMETRY & PLOTS')}</strong><small>{txt('Altitud · velocidad · Mach · Max Q', 'Altitude · speed · Mach · Max Q')}</small></div><b>→</b></button>
          <button type="button" onClick={() => navigateMobile('analysis')}><span><FileChartColumn size={18}/></span><div><strong>{txt('RESULTADOS COMPLETOS', 'FULL RESULTS')}</strong><small>{txt('CG · CP · estabilidad · recuperación', 'CG · CP · stability · recovery')}</small></div><b>→</b></button>
          <button type="button" onClick={openExportSheet}><span><Download size={18}/></span><div><strong>{txt('EXPORTAR MISIÓN', 'EXPORT MISSION')}</strong><small>Excel · PNG · JSON · CSV</small></div><b>→</b></button>
        </div>
      </section>

      <div className="mobile-context-bar">
        <button type="button" onClick={() => navigateMobile(['vehicle','geometry','motor','cad','analysis'].includes(mobileSection) ? 'pdr' : 'analysis')} aria-label={txt('Volver', 'Back')}><ArrowLeft size={19} strokeWidth={1.8} /></button>
        <div>
          <span>{['vehicle','geometry','motor','cad'].includes(mobileSection) ? 'PDR' : 'CDR'}</span>
          <strong>{
            mobileSection === 'vehicle' ? txt('PARÁMETROS DEL VEHÍCULO', 'VEHICLE PARAMETERS') :
            mobileSection === 'geometry' ? txt('DISEÑO DEL COHETE', 'VEHICLE DESIGN') :
            mobileSection === 'motor' ? txt('CONFIGURACIÓN DEL MOTOR', 'MOTOR CONFIGURATION') :
            mobileSection === 'cad' ? txt('IMPORTAR CAD / FUSION', 'IMPORT CAD / FUSION') :
            mobileSection === 'plots' ? txt('SIMULADOR DE VUELO · 85°', 'FLIGHT SIMULATOR · 85°') :
            mobileSection === 'model' ? txt('MODELO MATEMÁTICO', 'MATHEMATICAL MODEL') :
            mobileSection === 'status' ? txt('ESTADO DEL CDR', 'CDR STATUS') :
            mobileSection === 'analysis' ? txt('ANÁLISIS CDR · CG / CP', 'CDR ANALYSIS · CG / CP') :
            txt('RESULTADOS DEL CDR', 'CDR RESULTS')
          }</strong>
        </div>
      </div>

      <section className="workspace">
        <aside className="panel editor" id="vehicle-editor">
          <div className="panel-title">
            <div>
              <p>{txt('ENTRADA', 'INPUT')}</p>
              <h2>{txt('Editor paramétrico del vehículo', 'Parametric Vehicle Editor')}</h2>
            </div>
            <span className="live-badge">{txt('EN VIVO', 'LIVE')}</span>
          </div>

          <h3>{txt('Geometría principal', 'Primary geometry')}</h3>
          <div className="airfoil-row nose-selector">
            <label>
              <span>{txt('Familia de perfil de cofia', 'Nose profile family')}</span>
              <select value={vehicle.noseProfile} onChange={(e) => update('noseProfile', e.target.value)}>
                <option value="tangent_ogive">{txt('Ojiva tangente', 'Tangent ogive')}</option>
                <option value="von_karman">Von Kármán</option>
                <option value="power_series">{txt('Serie de potencias n=0.75', 'Power series n=0.75')}</option>
              </select>
            </label>
            <span className="info-badge">{txt('misma L · mismo Ø', 'same L · same Ø')}</span>
          </div>
          <div className="field-grid">
            <Field label={txt('Longitud total ensamblada', 'Assembled total length')} value={vehicle.totalLength} unit="mm" status={txt('CAD · con solapes', 'CAD · with overlaps')} readOnly step={1} />
            <Field label={txt('Diámetro exterior', 'Outer diameter')} value={vehicle.diameter} unit="mm" status={txt('plano Fusion', 'Fusion drawing')} readOnly step={1} />
            <Field label={txt('Longitud de cofia', 'Nose length')} value={vehicle.noseLength} unit="mm" status={txt('plano Fusion', 'Fusion drawing')} readOnly step={1} />
            <Field label="C1 · porta paracaídas / carga útil" value={currentTwin?.geometry?.parts?.c1_parachute_payload?.raw_part_length_mm ?? 215} unit="mm" status={txt('largo de pieza', 'part length')} readOnly step={1} />
            <Field label="C2" value={currentTwin?.geometry?.parts?.c2?.raw_part_length_mm ?? 215} unit="mm" status={txt('largo de pieza', 'part length')} readOnly step={1} />
            <Field label={txt('Cola + alojamiento de aletas', 'Tail + fin can')} value={currentTwin?.geometry?.parts?.tail_fin_can?.raw_part_length_mm ?? 225} unit="mm" status={txt('largo de pieza', 'part length')} readOnly step={1} />
            <Field label={txt('Solape cofia → C1', 'Nose → C1 overlap')} value={15} unit="mm" status={txt('derivado del plano', 'drawing-derived')} readOnly step={1} />
            <Field label={txt('Solape C1 → C2', 'C1 → C2 overlap')} value={15} unit="mm" status={txt('derivado del plano', 'drawing-derived')} readOnly step={1} />
            <Field label={txt('Solape C2 → cola', 'C2 → tail overlap')} value={16} unit="mm" status={txt('derivado del plano', 'drawing-derived')} readOnly step={1} />
            <Field label={txt('Portamotor · largo', 'Motor mount · length')} value={currentTwin?.geometry?.parts?.motor_mount?.raw_part_length_mm ?? 190} unit="mm" status={txt('interno · plano Fusion', 'internal · Fusion drawing')} readOnly step={1} />
            <Field label={txt('Portamotor · Ø exterior', 'Motor mount · outer Ø')} value={currentTwin?.geometry?.parts?.motor_mount?.outer_diameter_mm ?? 54} unit="mm" status={txt('plano Fusion', 'Fusion drawing')} readOnly step={1} />
            <Field label={txt('Portamotor · Ø interior', 'Motor mount · inner Ø')} value={currentTwin?.geometry?.parts?.motor_mount?.inner_diameter_mm ?? 33} unit="mm" status={txt('plano Fusion', 'Fusion drawing')} readOnly step={1} />
          </div>

          <div className="section-heading">
            <h3 id="fins-section">{txt('Aletas', 'Fins')}</h3>
            <span>{txt('planta trapezoidal', 'trapezoidal planform')}</span>
          </div>
          <div className="airfoil-row">
            <label>
              <span>{txt('Perfil de sección transversal', 'Cross-section profile')}</span>
              <select value={vehicle.airfoil} onChange={(e) => update('airfoil', e.target.value)} disabled>
                <option>NACA 0012</option>
                <option>NACA 0009</option>
                <option>NACA 0015</option>
                <option>NACA 2412</option>
                <option>{txt('PERSONALIZADO', 'CUSTOM')}</option>
              </select>
            </label>
            <span className="info-badge">{txt('Corrección profesor / PDR', 'Professor / PDR correction')}</span>
          </div>
          <div className="field-grid">
            <Field label={txt('Cantidad de aletas', 'Fin count')} value={vehicle.finCount} status={txt('Fusion', 'Fusion')} readOnly step={1} />
            <Field label={txt('Cuerda de raíz (cr)', 'Root chord (cr)')} value={vehicle.rootChord} unit="mm" status={txt('plano Fusion', 'Fusion drawing')} readOnly step={0.01} />
            <Field label={txt('Cuerda de punta (ct)', 'Tip chord (ct)')} value={vehicle.tipChord} unit="mm" status={txt('plano Fusion', 'Fusion drawing')} readOnly step={0.01} />
            <Field label={txt('Semienvergadura radial (s)', 'Radial semispan (s)')} value={vehicle.span} unit="mm" status={txt('(168−63)/2', '(168−63)/2')} readOnly step={0.1} />
            <Field label={txt('Desplazamiento del borde de ataque (Xf)', 'Leading-edge offset (Xf)')} value={vehicle.sweep} unit="mm" status={txt('derivado vista 1:1', 'derived from 1:1 view')} readOnly step={0.1} />
            <Field label={txt('Borde de ataque raíz desde la nariz', 'Root leading edge from nose')} value={vehicle.finX} unit="mm" status={txt('564 + 125', '564 + 125')} readOnly step={1} />
          </div>

          <div className="section-heading">
            <h3>{txt('Tobera', 'Nozzle')}</h3>
            <span>{txt('geometría CAD · no altera física hasta validar', 'CAD geometry · physics unchanged until validated')}</span>
          </div>
          <div className="field-grid">
            <Field label={txt('Longitud de tobera', 'Nozzle length')} value={vehicle.nozzleLength} unit="mm" status={txt('por medir', 'to measure')} onChange={(v) => update('nozzleLength', v)} />
            <Field label={txt('Diámetro de cuello', 'Neck diameter')} value={vehicle.nozzleNeckDiameter} unit="mm" status={txt('por medir', 'to measure')} onChange={(v) => update('nozzleNeckDiameter', v)} />
            <Field label={txt('Diámetro de salida', 'Exit diameter')} value={vehicle.nozzleExitDiameter} unit="mm" status={txt('por medir', 'to measure')} onChange={(v) => update('nozzleExitDiameter', v)} />
          </div>

          <button className="advanced-toggle" onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? txt('Ocultar', 'Hide') : txt('Mostrar', 'Show')} {txt('entradas de vuelo', 'flight inputs')}
          </button>
          {showAdvanced && (
            <div className="field-grid advanced">
              <Field label={txt('Ángulo de lanzamiento', 'Launch angle')} value={vehicle.launchAngle} unit="deg" status="TP" onChange={(v) => update('launchAngle', v)} />
              <Field label={txt('Coeficiente de resistencia aerodinámica (Cd)', 'Drag coefficient (Cd)')} value={vehicle.cd} status={txt('estimado · Niskanen/OpenRocket', 'estimated · Niskanen/OpenRocket')} onChange={(v) => update('cd', v)} />
              <Field label={txt('Coeficiente de resistencia del paracaídas (Cd)', 'Parachute drag coefficient (Cd)')} value={vehicle.parachuteCd} status={txt('recuperación', 'recovery')} onChange={(v) => update('parachuteCd', v)} />
              <Field label={txt('Área del paracaídas', 'Parachute area')} value={vehicle.parachuteArea} unit="m²" status={txt('recuperación', 'recovery')} onChange={(v) => update('parachuteArea', v)} />
              <Field label={txt('Altitud de despliegue', 'Deploy altitude')} value={vehicle.deployAltitude} unit="m" status={txt('vacío = apogeo', 'blank = apogee')} onChange={(v) => update('deployAltitude', v)} />
              <Field label={txt('Retardo de despliegue', 'Deploy delay')} value={vehicle.deployDelay} unit="s" status={txt('recuperación', 'recovery')} onChange={(v) => update('deployDelay', v)} />
            </div>
          )}
        </aside>

        <section className="right-column">
          <div className="panel visual" id="geometry-panel">
            <div className="panel-title">
              <div>
                <p>{txt('GEOMETRÍA', 'GEOMETRY')}</p>
                <h2>{txt('Vista lateral paramétrica', 'Parametric side view')}</h2>
              </div>
              <div className="visual-tools">
                <button
                  type="button"
                  className={showComponentCgs ? 'technical-toggle cg-toggle active' : 'technical-toggle cg-toggle'}
                  onClick={() => setShowComponentCgs((value) => !value)}
                  aria-pressed={showComponentCgs}
                  title={showComponentCgs ? txt('Ocultar CGs de componentes', 'Hide component CGs') : txt('Mostrar CGs de componentes', 'Show component CGs')}
                >
                  {showComponentCgs ? <Eye size={15} strokeWidth={1.8} /> : <EyeOff size={15} strokeWidth={1.8} />}
                  <span>{showComponentCgs ? txt('CGs VISIBLES', 'CGs VISIBLE') : txt('MOSTRAR CGs', 'SHOW CGs')}</span>
                </button>
                <span className="scale-note">{txt('vista técnica · dimensiones en vivo', 'technical view · live dimensions')}</span>
              </div>
            </div>
            <RocketRealistic
              vehicle={vehicle}
              cgMm={liveCgFromNose}
              cpMm={liveCpFromNose}
              componentCgs={componentSummary?.components ?? []}
              assemblyStations={twinAssembly?.stations ?? []}
              showComponentCgs={showComponentCgs}
              lang={lang}
            />
          </div>

          <NoseProfileComparison
            selected={vehicle.noseProfile}
            onSelect={(profile) => update('noseProfile', profile)}
            lang={lang}
          />

          <div className="result-grid">
            <article className="metric-card">
              <span>CG</span>
              <strong>{liveCgFromNose !== null ? `${(Number(vehicle.totalLength) - liveCgFromNose).toFixed(1)} mm` : '—'}</strong>
              <small>{txt('desde apoyo · referencia cátedra', 'from support · course reference')}</small>
            </article>
            <article className="metric-card">
              <span>CP</span>
              <strong>{liveCpFromSupport != null ? `${liveCpFromSupport.toFixed(1)} mm` : '—'}</strong>
              <small>{txt('desde apoyo · Barrowman/perfil', 'from support · Barrowman/profile')}</small>
            </article>
            <article className="metric-card">
              <span>{txt('APOGEO', 'APOGEE')}</span>
              <strong>{analysisSummary?.apogee_m !== undefined ? `${analysisSummary.apogee_m.toFixed(1)} m` : '—'}</strong>
              <small>{txt('resultado de trayectoria', 'trajectory result')}</small>
            </article>
            <article className="metric-card">
              <span>q<sub>max</sub></span>
              <strong>{analysisSummary?.max_q_pa !== undefined ? `${analysisSummary.max_q_pa.toFixed(0)} Pa` : '—'}</strong>
              <small>{txt('resultado de trayectoria', 'trajectory result')}</small>
            </article>
          </div>

          <div id="analysis-panel" className="section-anchor">
          <LiveAnalysisPanel
            vehicle={vehicle}
            runToken={runToken}
            resetToken={resetToken}
            onAnalysisUpdate={handleAnalysisUpdate}
            motor={motor}
            rows={componentRows}
            onRowsChange={setComponentRows}
            massStationsReady={realMassStationsReady}
            assemblyStations={twinAssembly?.stations ?? []}
            estimatedCd={estimatedCd}
            onCdChange={(value) => {
              update('cd', value);
              setAnalysisSummary(null);
            }}
            onOpenFlight={() => {
              if (analysisSummary?.mission_timeline?.length > 1) setMissionControlOpen(true);
              else {
                setPendingMissionLaunch(true);
                setRunToken((value) => value + 1);
              }
            }}
            lang={lang}
          />
          {analysisSummary?.mission_timeline?.length > 1 && <div className="desktop-flight-results">
            <button type="button" className="phase-secondary-link desktop-flight-launch" onClick={() => setMissionControlOpen(true)}><Play size={17}/><span>{txt('ABRIR SIMULACIÓN DE VUELO', 'OPEN FLIGHT SIMULATION')}</span><b>→</b></button>
            <Suspense fallback={<div className="panel flight-analysis-loading">{txt('CARGANDO RESULTADOS DE VUELO…', 'LOADING FLIGHT RESULTS…')}</div>}>
              <FlightAnalysisCharts samples={analysisSummary.mission_timeline} motorBurnTimeS={Number(motor.burn) || 0} analysis={analysisSummary} lang={lang}/>
            </Suspense>
          </div>}
          {mobileSection === 'plots' && analysisSummary?.mission_timeline?.length > 1 && <Suspense fallback={<div className="panel flight-analysis-loading">{txt('CARGANDO RESULTADOS DE VUELO…', 'LOADING FLIGHT RESULTS…')}</div>}>
            <FlightAnalysisCharts samples={analysisSummary.mission_timeline} motorBurnTimeS={Number(motor.burn) || 0} analysis={analysisSummary} lang={lang}/>
          </Suspense>}
          </div>
          <div className="panel readiness">
            <div className="panel-title compact">
              <div>
                <p>{txt('TRAZABILIDAD', 'TRACEABILITY')}</p>
                <h2>{txt('Estado del CDR', 'CDR readiness')}</h2>
              </div>
              <strong className="score">{5 - Math.min(blockers.length, 5)}/5</strong>
            </div>
            <div className="readiness-grid">
              <div className="ready-row complete"><b>01</b><span>{txt('Geometría principal', 'Principal geometry')}</span><em>{vehicle.totalLength} / 180 / C1 215 / C2 215 / COLA 225 / Ø{vehicle.diameter}</em></div>
              <div className="ready-row complete"><b>02</b><span>{txt('Perfil de aleta', 'Fin profile')}</span><em>{vehicle.airfoil}</em></div>
              <div className={`ready-row ${vehicle.tipChord !== '' && vehicle.sweep !== '' && vehicle.finX !== '' ? 'complete' : ''}`}><b>03</b><span>{txt('Planta de aleta', 'Fin planform')}</span><em>{vehicle.tipChord !== '' && vehicle.sweep !== '' && vehicle.finX !== '' ? txt('LISTA', 'READY') : txt('POR DEFINIR', 'TBD')}</em></div>
              <div className={`ready-row ${realMassStationsReady ? 'complete' : ''}`}><b>04</b><span>{txt('Masas / xCG', 'Masses / xCG')}</span><em>{realMassStationsReady ? txt('LISTO', 'READY') : txt('870 g MEDIDOS · xCG PENDIENTE', '870 g MEASURED · xCG PENDING')}</em></div>
              <div className={`ready-row ${vehicle.cd !== '' ? 'complete' : ''}`}><b>05</b><span>{txt('Modelo de resistencia', 'Drag model')}</span><em>{vehicle.cd === '' ? txt('POR DEFINIR', 'TBD') : `Cd ${vehicle.cd}`}</em></div>
            </div>
            <div className="blocker-box">
              <span>{txt('BLOQUEOS DEL ANÁLISIS', 'ANALYSIS BLOCKERS')}</span>
              <div>{blockers.map((blocker) => <code key={blocker}>{blocker}</code>)}</div>
            </div>
          </div>

          <div className="panel motor-panel motor-config-panel" id="motor-panel">
            <div className="motor-summary">
              <p>{txt('MOTOR · CONFIGURACIÓN ACTIVA', 'MOTOR · ACTIVE CONFIGURATION')}</p>
              <h2>{motor.designation || txt('SIN DEFINIR', 'UNDEFINED')}</h2>
              <span>{motor.propellant || '—'}</span>
              <div className="motor-tabs">
                {motorConfigs.map((item) => <button
                  type="button"
                  key={item.id}
                  className={item.id === activeMotorId ? 'motor-tab active' : 'motor-tab'}
                  onClick={() => { setActiveMotorId(item.id); setAnalysisSummary(null); }}
                >
                  <b>{item.label}</b>
                  <small>{item.designation || txt('SIN CARGAR', 'EMPTY')}</small>
                </button>)}
              </div>
              <button className="motor-edit-toggle" type="button" onClick={() => setShowMotorEditor((value) => !value)}>
                {showMotorEditor ? txt('CERRAR EDICIÓN', 'CLOSE EDITOR') : txt('EDITAR MOTOR', 'EDIT MOTOR')}
              </button>
            </div>

            <div className="motor-data">
              <dl>
                <div><dt>{txt('Combustión', 'Burn')}</dt><dd>{motor.burn === '' ? '—' : String(motor.burn) + ' s'}</dd></div>
                <div><dt>{txt('Impulso', 'Impulse')}</dt><dd>{motor.impulse === '' ? '—' : String(motor.impulse) + ' N·s'}</dd></div>
                <div><dt>{txt('Empuje medio oficial', 'Official avg thrust')}</dt><dd>{averageThrust == null ? '—' : averageThrust.toFixed(1) + ' N'}</dd></div>
                <div><dt>{txt('Empuje máximo', 'Max thrust')}</dt><dd>{motor.maxThrust === '' ? '—' : String(motor.maxThrust) + ' N'}</dd></div>
                <div><dt>{txt('Propelente', 'Propellant')}</dt><dd>{motor.propellantMass === '' ? '—' : String(motor.propellantMass) + ' g'}</dd></div>
                <div><dt>{txt('Masa seca', 'Dry')}</dt><dd>{motor.dryMass === '' ? '—' : String(motor.dryMass) + ' g'}</dd></div>
              </dl>
              {!activeMotorReady && <small className="motor-consistency-note motor-warning">{txt('Completá tiempo de combustión, impulso, masa de propelente y masa seca para habilitar esta configuración.', 'Complete burn time, impulse, propellant mass and dry mass to enable this configuration.')}</small>}
              {activeMotorReady && <small className="motor-consistency-note">{motor.thrustCurve?.length ? txt('La simulación usa la curva Empuje–Tiempo A-100 RN punto a punto; el promedio oficial se conserva como dato de referencia.', 'Simulation uses the A-100 RN thrust-time curve point by point; official average thrust is kept as reference data.') : txt('Sin curva cargada: la simulación usa el modelo rectangular I/t.', 'No curve loaded: simulation uses the rectangular I/t model.')}</small>}
            </div>

            {showMotorEditor && <div className="motor-editor">
              <label><span>{txt('NOMBRE DE CONFIGURACIÓN', 'CONFIGURATION NAME')}</span><input value={motor.label} onChange={(e) => updateMotor('label', e.target.value)} /></label>
              <label><span>{txt('DESIGNACIÓN', 'DESIGNATION')}</span><input value={motor.designation} onChange={(e) => updateMotor('designation', e.target.value)} placeholder="A-100 RN (29%H)" /></label>
              <label><span>{txt('PROPELENTE', 'PROPELLANT')}</span><input value={motor.propellant} onChange={(e) => updateMotor('propellant', e.target.value)} placeholder="KNDX" /></label>
              <label><span>{txt('COMBUSTIÓN', 'BURN TIME')}</span><div className="motor-input"><input type="number" value={motor.burn} onChange={(e) => updateMotor('burn', e.target.value === '' ? '' : Number(e.target.value))}/><em>s</em></div></label>
              <label><span>{txt('IMPULSO TOTAL', 'TOTAL IMPULSE')}</span><div className="motor-input"><input type="number" value={motor.impulse} onChange={(e) => updateMotor('impulse', e.target.value === '' ? '' : Number(e.target.value))}/><em>N·s</em></div></label>
              <label><span>{txt('EMPUJE MÁXIMO', 'MAX THRUST')}</span><div className="motor-input"><input type="number" value={motor.maxThrust} onChange={(e) => updateMotor('maxThrust', e.target.value === '' ? '' : Number(e.target.value))}/><em>N</em></div></label>
              <label><span>{txt('MASA DE PROPELENTE', 'PROPELLANT MASS')}</span><div className="motor-input"><input type="number" value={motor.propellantMass} onChange={(e) => updateMotor('propellantMass', e.target.value === '' ? '' : Number(e.target.value))}/><em>g</em></div></label>
              <label><span>{txt('MASA SECA', 'DRY MASS')}</span><div className="motor-input"><input type="number" value={motor.dryMass} onChange={(e) => updateMotor('dryMass', e.target.value === '' ? '' : Number(e.target.value))}/><em>g</em></div></label>
              <div className="motor-derived">
                <span>{txt('EMPUJE MEDIO DERIVADO', 'DERIVED AVG THRUST')}</span>
                <strong>{averageThrust == null ? '—' : averageThrust.toFixed(2) + ' N'}</strong>
                <small>I / t</small>
              </div>
            </div>}
          </div>
        </section>
      </section>
      </div>

      {missionControlOpen && analysisSummary?.mission_timeline?.length > 1 && <MissionControl
        samples={analysisSummary.mission_timeline}
        motorBurnTimeS={Number(motor.burn) || 0}
        analysis={analysisSummary}
        launchAngleDeg={Number(vehicle.launchAngle) || 85}
        lang={lang}
        onClose={() => setMissionControlOpen(false)}
        onViewResults={() => {
          setMissionControlOpen(false);
          navigateMobile('plots');
        }}
      />}

      <nav
        className="mobile-command-bar"
        aria-label={txt('Navegación móvil', 'Mobile navigation')}
        style={{ '--nav-index': mobileNavIndex } as React.CSSProperties}
      >
        <i className="mobile-nav-slider" aria-hidden="true" />
        <button type="button" className={mobileSection === 'home' ? 'active' : ''} onPointerDown={handleNavPointerDown} onClick={() => navigateMobile('home')}>
          <span className="mobile-nav-icon"><Home size={20} strokeWidth={1.8} /></span>
          <small>{txt('INICIO', 'HOME')}</small>
        </button>
        <button type="button" className={['pdr','vehicle','geometry','motor'].includes(mobileSection) ? 'active' : ''} onPointerDown={handleNavPointerDown} onClick={() => navigateMobile('pdr')}>
          <span className="mobile-nav-icon"><Rocket size={20} strokeWidth={1.8} /></span>
          <small>PDR</small>
        </button>
        <button type="button" className={['cdr','analysis','model','status'].includes(mobileSection) ? 'mobile-primary active' : 'mobile-primary'} onPointerDown={handleNavPointerDown} onClick={() => navigateMobile('analysis')}>
          <span className="mobile-nav-icon primary"><Gauge size={26} strokeWidth={1.8} /></span>
          <small>CDR</small>
        </button>
        <button type="button" disabled={pendingMissionLaunch} className={pendingMissionLaunch ? 'flight-nav-button preparing active' : missionControlOpen ? 'flight-nav-button active' : 'flight-nav-button'} onPointerDown={handleNavPointerDown} onClick={() => {
          if (pendingMissionLaunch) return;
          setPendingMissionLaunch(true);
          if (analysisSummary?.mission_timeline?.length > 1) {
            window.setTimeout(() => {
              setPendingMissionLaunch(false);
              setMissionControlOpen(true);
            }, 1150);
          } else {
            setRunToken((value) => value + 1);
          }
        }}>
          <span className="mobile-nav-icon">{pendingMissionLaunch ? <i className="bottom-flight-spinner" aria-hidden="true" /> : <Play size={20} strokeWidth={1.8} />}</span>
          <small>{pendingMissionLaunch ? txt('PREPARANDO', 'PREPARING') : txt('VUELO', 'FLIGHT')}</small>
        </button>
        <button type="button" className={exportPreparing ? 'active export-nav-button preparing' : showExportMenu ? 'active export-nav-button' : 'export-nav-button'} onPointerDown={handleNavPointerDown} onClick={() => showExportMenu ? setShowExportMenu(false) : openExportSheet()}>
          <span className="mobile-nav-icon">{exportPreparing ? <i className="bottom-flight-spinner" aria-hidden="true" /> : <Download size={20} strokeWidth={1.8} />}</span>
          <small>{exportPreparing ? txt('PREPARANDO', 'PREPARING') : txt('EXPORTAR', 'EXPORT')}</small>
        </button>
      </nav>

      {showHeaderCadModal && typeof document !== 'undefined' && createPortal(
        <div className="header-cad-backdrop" onPointerDown={(event) => {
          if (event.target === event.currentTarget) setShowHeaderCadModal(false);
        }}>
          <section className="header-cad-modal" onPointerDown={(event) => event.stopPropagation()}>
            <div className="header-cad-modal-head">
              <div><span>{txt('GEOMETRÍA EXTERNA', 'EXTERNAL GEOMETRY')}</span><strong>{txt('IMPORTAR CAD AL PDR', 'IMPORT CAD INTO PDR')}</strong></div>
              <button type="button" onClick={() => setShowHeaderCadModal(false)} aria-label={txt('Cerrar', 'Close')}>×</button>
            </div>
            <CadInteroperabilityPanel
              onGeometryImported={(geometry) => {
                importCadGeometry(geometry);
                setPdrTab('geometry');
                setShowHeaderCadModal(false);
                navigateMobile('pdr');
              }}
              lang={lang}
              compact
            />
          </section>
        </div>,
        document.body
      )}

      {showExportMenu && <div className="mobile-export-backdrop" onClick={() => { setShowExportMenu(false);  }}>
        <div className="mobile-export-sheet" onClick={(event) => event.stopPropagation()}>
          <div className="mobile-export-head">
            <div><span>{txt('SALIDA', 'OUTPUT')}</span><strong>{txt('EXPORTAR RESULTADOS', 'EXPORT RESULTS')}</strong></div>
            <button type="button" onClick={() => { setShowExportMenu(false); setExportPreparing(false); }} aria-label={txt('Cerrar', 'Close')}>×</button>
          </div>
          {exportPreparing ? <div className="mobile-export-preparing">
            <span>{txt('COMPILANDO DATOS UTN-FRH-G07', 'COMPILING UTN-FRH-G07 DATA')}</span>
            <strong>{txt('Preparando paquete técnico…', 'Preparing technical package…')}</strong>
            <i><b /></i>
          </div> : <div className="export-action-grid">
            <button type="button" onClick={exportReportPdf}><span className="export-action-icon">PDF</span><div><strong>{txt('INFORME CÁTEDRA', 'COURSE REPORT')}</strong><small>{txt('Resumen técnico + R1–R11', 'Technical summary + R1–R11')}</small></div><b>↓</b></button>
            <button type="button" onClick={exportExcel}><span className="export-action-icon">XLS</span><div><strong>EXCEL TÉCNICO</strong><small>{txt('R1–R11 · masas · CG/CP · trayectoria · motor', 'R1–R11 · mass · CG/CP · trajectory · motor')}</small></div><b>↓</b></button>
            <button type="button" onClick={exportTelemetryJson}><span className="export-action-icon">{'{ }'}</span><div><strong>{txt('TELEMETRÍA JSON', 'TELEMETRY JSON')}</strong><small>{txt('Corrida completa y metadatos', 'Full run and metadata')}</small></div><b>↓</b></button>
          </div>}
        </div>
      </div>}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);