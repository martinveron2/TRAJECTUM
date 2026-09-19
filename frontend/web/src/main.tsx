import React, { useCallback, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { LiveAnalysisPanel } from './LiveAnalysisPanel';
import { CadInteroperabilityPanel } from './CadInteroperabilityPanel';
import { RocketRealistic } from './RocketRealistic';
import { NoseProfileComparison } from './NoseProfileComparison';
import { buildEngineeringChartImages } from './engineeringChartExport';
import {
  Home, Rocket, Gauge, ChartNoAxesCombined, Download, Box, SlidersHorizontal,
  Flame, Sigma, ClipboardCheck, ArrowLeft, Play,
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
};

const initialVehicle: Vehicle = {
  totalLength: 860,
  diameter: 63,
  noseLength: 180,
  bayLength: 180,
  bodyLength: 500,
  wall: 2,
  finCount: 4,
  rootChord: 80,
  tipChord: 40,
  span: 50,
  sweep: 20,
  finX: 760,
  airfoil: 'NACA 0012',
  noseProfile: 'tangent_ogive',
  launchAngle: 85,
  cd: 0.55,
  parachuteCd: 1.5,
  parachuteArea: 0.20,
  deployAltitude: '',
  deployDelay: 0,
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
};

const initialMotorConfigs: MotorConfig[] = [
  {
    id: 'motor-1',
    label: 'CONFIGURACIÓN 1',
    designation: 'A-100 RN (29%H)',
    propellant: 'KNDX',
    burn: 0.5,
    impulse: 207,
    maxThrust: 600,
    propellantMass: 140,
    dryMass: 350,
  },
  {
    id: 'motor-2',
    label: 'CONFIGURACIÓN 2',
    designation: '',
    propellant: '',
    burn: '',
    impulse: '',
    maxThrust: '',
    propellantMass: '',
    dryMass: '',
  },
];

const motorAverageThrust = (motor: MotorConfig) => {
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
}: {
  label: string;
  value: NumericField;
  unit?: string;
  onChange: (value: NumericField) => void;
  status?: string;
}) {
  const fieldState = value === '' ? 'field-empty' : Number.isFinite(Number(value)) && Number(value) >= 0 ? 'field-valid' : 'field-warning';
  return (
    <label className={'field ' + fieldState}>
      <span className="field-label">
        {label}
        {status && <small>{status}</small>}
      </span>
      <span className={'input-wrap ' + fieldState}>
        <input
          type="number"
          value={value}
          placeholder="TBD"
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
        {unit && <em>{unit}</em>}
      </span>
    </label>
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
  const [motorConfigs, setMotorConfigs] = useState<MotorConfig[]>(initialMotorConfigs);
  const [activeMotorId, setActiveMotorId] = useState('motor-1');
  const [showMotorEditor, setShowMotorEditor] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [mobileSection, setMobileSection] = useState<'home' | 'pdr' | 'cdr' | 'vehicle' | 'geometry' | 'motor' | 'analysis' | 'plots' | 'model' | 'status'>('home');
  const [mobileNavBusy, setMobileNavBusy] = useState(false);
  const [mobileNavDirection, setMobileNavDirection] = useState<'forward' | 'back'>('forward');
  const motor = motorConfigs.find((item) => item.id === activeMotorId) ?? motorConfigs[0];
  const averageThrust = motorAverageThrust(motor);

  const navigateMobile = (target: typeof mobileSection) => {
    if (target === mobileSection) return;
    const order = ['home', 'pdr', 'vehicle', 'geometry', 'motor', 'cdr', 'analysis', 'plots', 'model', 'status'];
    setMobileNavDirection(order.indexOf(target) >= order.indexOf(mobileSection) ? 'forward' : 'back');
    setMobileSection(target);
    setMobileNavBusy(true);
    window.setTimeout(() => setMobileNavBusy(false), 230);
  };

  const mobileNavIndex = showExportMenu
    ? 4
    : mobileSection === 'home'
      ? 0
      : ['pdr','vehicle','geometry','motor'].includes(mobileSection)
        ? 1
        : ['cdr','analysis','model','status'].includes(mobileSection)
          ? 2
          : mobileSection === 'plots'
            ? 3
            : 0;

  const update = <K extends keyof Vehicle>(key: K, value: Vehicle[K]) => {
    setVehicle((current) => ({ ...current, [key]: value }));
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
    return result;
  }, [vehicle, lang, motor]);

  const axialSum =
    (Number(vehicle.noseLength) || 0) +
    (Number(vehicle.bayLength) || 0) +
    (Number(vehicle.bodyLength) || 0);
  const geometryConsistent = vehicle.totalLength !== '' && axialSum === Number(vehicle.totalLength);
  const ready = blockers.length === 0;
  const mobileGuideStep = !geometryConsistent ? 'vehicle' : !activeMotorReady ? 'motor' : !analysisSummary ? 'analysis' : 'results';
  const mobileGuideCompleted = analysisSummary ? 4 : activeMotorReady && geometryConsistent ? 3 : geometryConsistent ? 2 : 1;

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
    setVehicle(initialVehicle);
    setMotorConfigs(initialMotorConfigs);
    setActiveMotorId('motor-1');
    setAnalysisSummary(null);
    setComponentSummary(null);
    setResetToken((value) => value + 1);
  };

  const handleAnalysisUpdate = useCallback((analysis: any, components: any) => {
    // Mass properties are the live source of truth for CG. A full-analysis result
    // may be older than the latest mass/geometry edit, so never let it pin CG.
    setAnalysisSummary(analysis);
    setComponentSummary(components);
  }, []);

  const liveCgFromNose = componentSummary?.total_cg_mm ?? analysisSummary?.cg_x_mm_from_nose ?? null;

  const downloadBlob = (contents: BlobPart, type: string, filename: string) => {
    const blob = new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
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
    const headers = ['t_s','phase','x_m','altitude_m','speed_m_s','vertical_speed_m_s','mach','q_pa','parachute_deployed'];
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
      pair('Masa total [g]', analysisSummary?.total_mass_g ?? componentSummary?.total_mass_g ?? ''),
      pair('CG desde apoyo [mm]', componentSummary?.total_cg_mm != null ? Number(vehicle.totalLength) - componentSummary.total_cg_mm : analysisSummary?.cg_x_mm_from_support ?? ''),
      pair('CP desde apoyo [mm]', analysisSummary?.cp_x_mm_from_support ?? ''), pair('Margen estático [calibres]', analysisSummary?.static_margin_calibers ?? ''),
      pair('Apogeo [m]', analysisSummary?.apogee_m ?? ''), pair('Velocidad máxima [m/s]', analysisSummary?.max_speed_m_s ?? ''), pair('Mach máximo', analysisSummary?.max_mach ?? ''),
      pair('Q máxima [Pa]', analysisSummary?.max_q_pa ?? ''), pair('Tiempo al apogeo [s]', analysisSummary?.time_to_apogee_s ?? ''), pair('Tiempo de aterrizaje [s]', analysisSummary?.landing_time_s ?? ''),
      pair('Velocidad de impacto [m/s]', analysisSummary?.impact_speed_m_s ?? ''),
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
    const masses = [[header('COMPONENTE'), header('MASA [g]'), header('xCG DESDE NARIZ [mm]'), header('xCG DESDE APOYO [mm]'), header('FUENTE')], ...comp.map((item: any) => [cell(item.name), cell(item.mass_g), cell(item.x_cg_mm_from_nose ?? item.x_cg_mm), cell(item.x_cg_mm_from_support ?? (item.x_cg_mm != null ? Number(vehicle.totalLength) - item.x_cg_mm : '')), cell(item.source)])];
    const cp = [[header('PARÁMETRO CP'), header('VALOR'), header('UNIDAD')], [cell('Método'), cell('Barrowman / perfil axisimétrico'), cell('')], [cell('CP total desde nariz'), cell(analysisSummary?.cp_x_mm_from_nose), cell('mm')], [cell('CP total desde apoyo'), cell(analysisSummary?.cp_x_mm_from_support), cell('mm')], [cell('CP cofia desde nariz'), cell(analysisSummary?.nose_cp_x_mm_from_nose), cell('mm')], [cell('CP cofia desde apoyo'), cell(analysisSummary?.nose_cp_x_mm_from_support), cell('mm')], [cell('CP aletas desde nariz'), cell(analysisSummary?.fins_cp_x_mm_from_nose), cell('mm')], [cell('CP aletas desde apoyo'), cell(analysisSummary?.fins_cp_x_mm_from_support), cell('mm')], [cell('Margen estático'), cell(analysisSummary?.static_margin_calibers), cell('calibres')]];
    const trajectory = [[header('t [s]'),header('FASE'),header('x [m]'),header('ALTITUD [m]'),header('VELOCIDAD [m/s]'),header('V VERTICAL [m/s]'),header('MACH'),header('Q [Pa]'),header('PARACAÍDAS')], ...(analysisSummary?.mission_timeline ?? []).map((sample: any) => [cell(sample.t_s),cell(sample.phase),cell(sample.x_m),cell(sample.altitude_m),cell(sample.speed_m_s),cell(sample.vertical_speed_m_s),cell(sample.mach),cell(sample.q_pa),cell(sample.parachute_deployed ? 'SI' : 'NO')])];
    const motorSheet = [[header('CONFIGURACIÓN'),header('DESIGNACIÓN'),header('PROPELENTE'),header('COMBUSTIÓN [s]'),header('IMPULSO [N·s]'),header('EMPUJE MEDIO DERIVADO [N]'),header('EMPUJE MÁX [N]'),header('PROPELENTE [g]'),header('SECA [g]'),header('ACTIVA')], ...motorConfigs.map((item) => [cell(item.label),cell(item.designation),cell(item.propellant),cell(item.burn),cell(item.impulse),cell(motorAverageThrust(item)),cell(item.maxThrust),cell(item.propellantMass),cell(item.dryMass),cell(item.id === activeMotorId ? 'SI' : 'NO')])];
    const recovery = [[header('PARÁMETRO'),header('VALOR'),header('UNIDAD')],[cell('Cd paracaídas'),cell(vehicle.parachuteCd),cell('')],[cell('Área paracaídas'),cell(vehicle.parachuteArea),cell('m²')],[cell('Altitud despliegue configurada'),cell(vehicle.deployAltitude),cell('m')],[cell('Retardo despliegue'),cell(vehicle.deployDelay),cell('s')],[cell('Altitud despliegue simulada'),cell(analysisSummary?.deployment_altitude_m),cell('m')],[cell('Tiempo despliegue'),cell(analysisSummary?.deployment_time_s),cell('s')],[cell('Tiempo aterrizaje'),cell(analysisSummary?.landing_time_s),cell('s')],[cell('Velocidad impacto'),cell(analysisSummary?.impact_speed_m_s),cell('m/s')]];
    const model = [[header('MÓDULO'),header('MÉTODO / MODELO')],[cell('CG'),cell('Sumatoria de momentos de masa')],[cell('CP'),cell('Barrowman + perfil axisimétrico de cofia')],[cell('Trayectoria'),cell('Masa puntual 2D')],[cell('Integración'),cell('Runge–Kutta de cuarto orden (RK4)')],[cell('Resistencia'),cell('D = 1/2 ρ V² Cd A')],[cell('Atmósfera'),cell('ISA')],[cell('Recuperación'),cell('Modelo de descenso con paracaídas')]];
    const chartImages = await buildEngineeringChartImages(analysisSummary?.mission_timeline ?? [], Number(motor.burn) || 0, analysisSummary ?? {});
    await writeXlsxFile([summary, geometry, masses, cp, trajectory, motorSheet, recovery, model], {
      sheets: ['RESUMEN','GEOMETRIA','MASAS_CG','CP','TRAYECTORIA','MOTOR','RECUPERACION','MODELO'],
      images: [chartImages.summary, [], [], [], chartImages.trajectory, [], [], []],
      fileName: 'TRAJECTUM_Engineering_Export.xlsx',
    });
    setShowExportMenu(false);
  };

  return (
    <main className={'app-shell mobile-view-' + mobileSection + (mobileNavBusy ? ' mobile-nav-busy mobile-nav-' + mobileNavDirection : '')}>
      <div className={mobileNavBusy ? 'mobile-route-feedback active' : 'mobile-route-feedback'} aria-hidden={!mobileNavBusy}>
        <i />
        <span>{txt('ABRIENDO MÓDULO', 'OPENING MODULE')}</span>
      </div>
      <header className="topbar">
        <div className="brand-stack">
          <div className="brand-lockup" aria-label="TRAJECTUM">
            <svg className="brand-trajectory" viewBox="0 0 340 78" aria-hidden="true">
              <path className="brand-orbit-glow" d="M 2 58 Q 72 4 158 29 Q 236 52 330 11" />
              <path className="brand-orbit-line" d="M 2 58 Q 72 4 158 29 Q 236 52 330 11" />
              <circle className="brand-endpoint" cx="330" cy="11" r="3.4" />
              <circle className="brand-comet" r="4.2">
                <animateMotion dur="3.2s" repeatCount="indefinite" path="M 2 58 Q 72 4 158 29 Q 236 52 330 11" />
              </circle>
              <circle className="brand-comet brand-comet-tail" r="2.4">
                <animateMotion begin="-0.16s" dur="3.2s" repeatCount="indefinite" path="M 2 58 Q 72 4 158 29 Q 236 52 330 11" />
              </circle>
            </svg>
            <div className="brand-wordmark">
              <span className="brand-name">TRAJECTUM</span>
              <span className="brand-subline">{txt('INGENIERÍA DEL VEHÍCULO · SIMULACIÓN · ANÁLISIS', 'VEHICLE ENGINEERING · SIMULATION · ANALYSIS')}</span>
            </div>
            <span className="brand-version">V0.1.0-CDR</span>
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

      <nav className="status-strip" aria-label={txt('Navegación rápida del proyecto', 'Project quick navigation')}>
        <button className="status-item" type="button" onClick={() => document.getElementById('vehicle-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          <span>{txt('PROYECTO', 'PROJECT')}</span><strong>UTN-FRH-G07 / CDR</strong><i>↘</i>
        </button>
        <button className="status-item" type="button" onClick={() => document.getElementById('geometry-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          <span>{txt('GEOMETRÍA', 'GEOMETRY')}</span><strong className={geometryConsistent ? 'ok' : 'bad'}>{geometryConsistent ? txt('CONSISTENTE', 'CONSISTENT') : txt('REVISAR LONGITUDES', 'CHECK LENGTHS')}</strong><i>↘</i>
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

      <section className="mobile-guide" aria-label={txt('Guía del proyecto', 'Project guide')}>
        <div className="mobile-guide-top">
          <div>
            <span>{txt('PROYECTO ACTIVO', 'ACTIVE PROJECT')}</span>
            <strong>UTN-FRH-G07 / CDR</strong>
          </div>
          <div className="mobile-guide-score"><b>{mobileGuideCompleted}/4</b><small>{txt('ETAPAS', 'STAGES')}</small></div>
        </div>

        <div className="mobile-guide-progress" aria-hidden="true">
          {[1,2,3,4].map((step) => <i key={step} className={step <= mobileGuideCompleted ? 'done' : step === mobileGuideCompleted + 1 ? 'current' : ''} />)}
        </div>

        <div className="mobile-guide-next">
          <span>{txt('SIGUIENTE PASO', 'NEXT STEP')}</span>
          <h2>{
            mobileGuideStep === 'vehicle' ? txt('Revisar geometría del vehículo', 'Review vehicle geometry') :
            mobileGuideStep === 'motor' ? txt('Completar configuración del motor', 'Complete motor configuration') :
            mobileGuideStep === 'analysis' ? txt('Todo listo para simular', 'Ready to simulate') :
            txt('Análisis completado', 'Analysis complete')
          }</h2>
          <p>{
            mobileGuideStep === 'vehicle' ? txt('Confirmá las dimensiones principales antes de continuar.', 'Confirm the main dimensions before continuing.') :
            mobileGuideStep === 'motor' ? txt('Cargá los datos mínimos del motor para habilitar la simulación.', 'Enter the minimum motor data to enable simulation.') :
            mobileGuideStep === 'analysis' ? txt('La configuración está completa. Ejecutá el análisis y TRAJECTUM te lleva a los resultados.', 'Configuration is complete. Run the analysis and TRAJECTUM will take you to the results.') :
            txt('Revisá resultados, gráficos y exportá el informe técnico.', 'Review results, plots and export the engineering report.')
          }</p>
        </div>

        <button type="button" className="mobile-guide-cta" onClick={continueMobileGuide}>
          <span>{
            mobileGuideStep === 'vehicle' ? txt('CONTINUAR CON VEHÍCULO', 'CONTINUE WITH VEHICLE') :
            mobileGuideStep === 'motor' ? txt('REVISAR MOTOR', 'REVIEW MOTOR') :
            mobileGuideStep === 'analysis' ? txt('EJECUTAR ANÁLISIS', 'RUN ANALYSIS') :
            txt('VER RESULTADOS', 'VIEW RESULTS')
          }</span>
          <b>→</b>
        </button>

        <div className="mobile-guide-steps">
          <button type="button" className={geometryConsistent ? 'complete' : mobileGuideStep === 'vehicle' ? 'current' : ''} onClick={() => { navigateMobile('vehicle'); document.getElementById('vehicle-editor')?.scrollIntoView({ behavior:'smooth', block:'start' }); }}><b>01</b><span>{txt('VEHÍCULO', 'VEHICLE')}</span><em>{geometryConsistent ? '✓' : '→'}</em></button>
          <button type="button" className={activeMotorReady ? 'complete' : mobileGuideStep === 'motor' ? 'current' : ''} onClick={() => document.getElementById('motor-panel')?.scrollIntoView({ behavior:'smooth', block:'center' })}><b>02</b><span>MOTOR</span><em>{activeMotorReady ? '✓' : '→'}</em></button>
          <button type="button" className={analysisSummary ? 'complete' : mobileGuideStep === 'analysis' ? 'current' : ''} onClick={() => { navigateMobile('analysis'); goToAnalysis(); }}><b>03</b><span>{txt('ANÁLISIS', 'ANALYSIS')}</span><em>{analysisSummary ? '✓' : '→'}</em></button>
          <button type="button" className={analysisSummary ? 'current' : ''} onClick={() => document.querySelector('.flight-analysis-panel')?.scrollIntoView({ behavior:'smooth', block:'start' })}><b>04</b><span>{txt('RESULTADOS', 'RESULTS')}</span><em>{analysisSummary ? '→' : '·'}</em></button>
        </div>
      </section>

      <section className="mobile-phase-screen mobile-pdr-screen" aria-label="PDR">
        <div className="mobile-screen-head">
          <button type="button" onClick={() => navigateMobile('home')} aria-label={txt('Volver', 'Back')}><ArrowLeft size={20} strokeWidth={1.8} /></button>
          <div><span>FASE 01</span><h2>PDR · {txt('DISEÑO PRELIMINAR', 'PRELIMINARY DESIGN')}</h2></div>
          <b className="complete">✓</b>
        </div>
        <div className="mobile-screen-copy">
          <strong>{txt('Definí la arquitectura del vehículo', 'Define the vehicle architecture')}</strong>
          <p>{txt('Geometría, perfil de cofia, aletas y configuración base. Entrá sólo al módulo que necesitás.', 'Geometry, nose profile, fins and baseline configuration. Open only the module you need.')}</p>
        </div>
        <div className="mobile-action-grid">
          <button type="button" onClick={() => navigateMobile('geometry')}><span><Box size={18} strokeWidth={1.8} /></span><strong>{txt('VER COHETE', 'VIEW VEHICLE')}</strong><small>{txt('Geometría visual', 'Visual geometry')}</small><b>→</b></button>
          <button type="button" onClick={() => navigateMobile('vehicle')}><span><SlidersHorizontal size={18} strokeWidth={1.8} /></span><strong>{txt('PARÁMETROS', 'PARAMETERS')}</strong><small>{txt('Editor paramétrico', 'Parametric editor')}</small><b>→</b></button>
          <button type="button" onClick={() => navigateMobile('motor')}><span><Flame size={18} strokeWidth={1.8} /></span><strong>MOTOR</strong><small>{txt('Seleccionar y editar', 'Select and edit')}</small><b>→</b></button>
          <button type="button" onClick={() => navigateMobile('cdr')}><span><Gauge size={18} strokeWidth={1.8} /></span><strong>{txt('IR A CDR', 'GO TO CDR')}</strong><small>{txt('Análisis detallado', 'Detailed analysis')}</small><b>→</b></button>
        </div>
      </section>

      <section className="mobile-phase-screen mobile-cdr-screen" aria-label="CDR">
        <div className="mobile-screen-head">
          <button type="button" onClick={() => navigateMobile('home')} aria-label={txt('Volver', 'Back')}><ArrowLeft size={20} strokeWidth={1.8} /></button>
          <div><span>FASE 02 · {txt('ACTUAL', 'CURRENT')}</span><h2>CDR · {txt('DISEÑO CRÍTICO', 'CRITICAL DESIGN')}</h2></div>
          <b className={analysisSummary ? 'complete' : 'current'}>{analysisSummary ? '✓' : '2'}</b>
        </div>
        <div className="mobile-cdr-status">
          <button type="button" className={componentSummary ? 'ready' : ''} onClick={() => navigateMobile('analysis')}><span>CG</span><strong>{componentSummary ? txt('LISTO', 'READY') : txt('REVISAR', 'CHECK')}</strong></button>
          <button type="button" className={analysisSummary?.cp_x_mm_from_nose != null ? 'ready' : ''} onClick={() => navigateMobile('analysis')}><span>CP</span><strong>{analysisSummary?.cp_x_mm_from_nose != null ? txt('LISTO', 'READY') : txt('REVISAR', 'CHECK')}</strong></button>
          <button type="button" className={analysisSummary?.apogee_m != null ? 'ready' : ''} onClick={() => navigateMobile('analysis')}><span>{txt('TRAYECTORIA', 'TRAJECTORY')}</span><strong>{analysisSummary?.apogee_m != null ? txt('LISTA', 'READY') : txt('PENDIENTE', 'PENDING')}</strong></button>
          <button type="button" className={analysisSummary?.landing_time_s != null ? 'ready' : ''} onClick={() => navigateMobile('analysis')}><span>{txt('RECUPERACIÓN', 'RECOVERY')}</span><strong>{analysisSummary?.landing_time_s != null ? txt('LISTA', 'READY') : txt('PENDIENTE', 'PENDING')}</strong></button>
        </div>
        <div className="mobile-action-list">
          <button type="button" onClick={() => { navigateMobile('analysis'); if (!analysisSummary && ready) setRunToken((value) => value + 1); }}><span><Play size={18} strokeWidth={1.8} /></span><div><strong>{analysisSummary ? txt('RESULTADOS DEL CDR', 'CDR RESULTS') : txt('EJECUTAR CDR', 'RUN CDR')}</strong><small>{txt('CG · CP · trayectoria · recuperación', 'CG · CP · trajectory · recovery')}</small></div><b>→</b></button>
          <button type="button" onClick={() => navigateMobile('plots')}><span><ChartNoAxesCombined size={18} strokeWidth={1.8} /></span><div><strong>{txt('GRÁFICOS', 'PLOTS')}</strong><small>{txt('Análisis de vuelo interactivo', 'Interactive flight analysis')}</small></div><b>→</b></button>
          <button type="button" onClick={() => navigateMobile('model')}><span><Sigma size={18} strokeWidth={1.8} /></span><div><strong>{txt('MODELO MATEMÁTICO', 'MATHEMATICAL MODEL')}</strong><small>{txt('Ecuaciones y métodos', 'Equations and methods')}</small></div><b>→</b></button>
          <button type="button" onClick={() => navigateMobile('status')}><span><ClipboardCheck size={18} strokeWidth={1.8} /></span><div><strong>{txt('ESTADO DEL CDR', 'CDR STATUS')}</strong><small>{txt('Trazabilidad y bloqueos', 'Traceability and blockers')}</small></div><b>→</b></button>
        </div>
      </section>

      <section className="mobile-project-phases" aria-label={txt('Fases del proyecto', 'Project phases')}>
        <button type="button" className="complete" onClick={() => navigateMobile('pdr')}><b>01</b><span>PDR</span><small>{txt('Diseño', 'Design')}</small></button>
        <button type="button" className="current" onClick={() => navigateMobile('cdr')}><b>02</b><span>CDR</span><small>{txt('Análisis', 'Analysis')}</small></button>
        <button type="button" disabled><b>03</b><span>FRR</span><small>{txt('Preparación', 'Readiness')}</small></button>
        <button type="button" disabled><b>04</b><span>{txt('VUELO', 'FLIGHT')}</span><small>{txt('Misión', 'Mission')}</small></button>
        <button type="button" disabled><b>05</b><span>PFR</span><small>{txt('Cierre', 'Closeout')}</small></button>
      </section>

      <div className="mobile-context-bar">
        <button type="button" onClick={() => navigateMobile(['vehicle','geometry','motor'].includes(mobileSection) ? 'pdr' : 'cdr')} aria-label={txt('Volver', 'Back')}><ArrowLeft size={19} strokeWidth={1.8} /></button>
        <div>
          <span>{['vehicle','geometry','motor'].includes(mobileSection) ? 'PDR' : 'CDR'}</span>
          <strong>{
            mobileSection === 'vehicle' ? txt('PARÁMETROS DEL VEHÍCULO', 'VEHICLE PARAMETERS') :
            mobileSection === 'geometry' ? txt('DISEÑO DEL COHETE', 'VEHICLE DESIGN') :
            mobileSection === 'motor' ? txt('CONFIGURACIÓN DEL MOTOR', 'MOTOR CONFIGURATION') :
            mobileSection === 'plots' ? txt('GRÁFICOS DE VUELO', 'FLIGHT PLOTS') :
            mobileSection === 'model' ? txt('MODELO MATEMÁTICO', 'MATHEMATICAL MODEL') :
            mobileSection === 'status' ? txt('ESTADO DEL CDR', 'CDR STATUS') :
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
            <Field label={txt('Longitud total', 'Total length')} value={vehicle.totalLength} unit="mm" status={txt('fijado', 'frozen')} onChange={(v) => update('totalLength', v)} />
            <Field label={txt('Diámetro exterior', 'Outer diameter')} value={vehicle.diameter} unit="mm" status={txt('fijado', 'frozen')} onChange={(v) => update('diameter', v)} />
            <Field label={txt('Longitud de cofia', 'Nose length')} value={vehicle.noseLength} unit="mm" status={txt('fijado', 'frozen')} onChange={(v) => update('noseLength', v)} />
            <Field label={txt('Compartimiento modular', 'Modular bay')} value={vehicle.bayLength} unit="mm" status={txt('fijado', 'frozen')} onChange={(v) => update('bayLength', v)} />
            <Field label={txt('Cuerpo inferior', 'Lower body')} value={vehicle.bodyLength} unit="mm" status={txt('fijado', 'frozen')} onChange={(v) => update('bodyLength', v)} />
            <Field label={txt('Espesor de pared', 'Wall thickness')} value={vehicle.wall} unit="mm" status={txt('provisional', 'provisional')} onChange={(v) => update('wall', v)} />
          </div>

          <div className="section-heading">
            <h3 id="fins-section">{txt('Aletas', 'Fins')}</h3>
            <span>{txt('planta trapezoidal', 'trapezoidal planform')}</span>
          </div>
          <div className="airfoil-row">
            <label>
              <span>{txt('Perfil de sección transversal', 'Cross-section profile')}</span>
              <select value={vehicle.airfoil} onChange={(e) => update('airfoil', e.target.value)}>
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
            <Field label={txt('Cantidad de aletas', 'Fin count')} value={vehicle.finCount} status={txt('fijado', 'frozen')} onChange={(v) => update('finCount', v)} />
            <Field label={txt('Cuerda de raíz (cr)', 'Root chord (cr)')} value={vehicle.rootChord} unit="mm" status={txt('provisional', 'provisional')} onChange={(v) => update('rootChord', v)} />
            <Field label={txt('Cuerda de punta (ct)', 'Tip chord (ct)')} value={vehicle.tipChord} unit="mm" status={txt('referencia', 'reference')} onChange={(v) => update('tipChord', v)} />
            <Field label={txt('Semienvergadura de la aleta (s)', 'Fin semispan (s)')} value={vehicle.span} unit="mm" status={txt('provisional', 'provisional')} onChange={(v) => update('span', v)} />
            <Field label={txt('Desplazamiento del borde de ataque (Xf)', 'Leading-edge offset (Xf)')} value={vehicle.sweep} unit="mm" status={txt('referencia', 'reference')} onChange={(v) => update('sweep', v)} />
            <Field label={txt('Posición del borde de ataque de la raíz desde la nariz', 'Root leading-edge position from nose')} value={vehicle.finX} unit="mm" status={txt('referencia', 'reference')} onChange={(v) => update('finX', v)} />
          </div>

          <button className="advanced-toggle" onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? txt('Ocultar', 'Hide') : txt('Mostrar', 'Show')} {txt('entradas de vuelo', 'flight inputs')}
          </button>
          {showAdvanced && (
            <div className="field-grid advanced">
              <Field label={txt('Ángulo de lanzamiento', 'Launch angle')} value={vehicle.launchAngle} unit="deg" status="TP" onChange={(v) => update('launchAngle', v)} />
              <Field label={txt('Coeficiente de resistencia aerodinámica (Cd)', 'Drag coefficient (Cd)')} value={vehicle.cd} status={txt('referencia', 'reference')} onChange={(v) => update('cd', v)} />
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
                  className={showComponentCgs ? 'technical-toggle active' : 'technical-toggle'}
                  onClick={() => setShowComponentCgs((value) => !value)}
                  aria-pressed={showComponentCgs}
                >
                  {showComponentCgs ? txt('OCULTAR CG DE COMPONENTES', 'HIDE COMPONENT CGs') : txt('MOSTRAR CG DE COMPONENTES', 'SHOW COMPONENT CGs')}
                </button>
                <span className="scale-note">{txt('vista técnica · dimensiones en vivo', 'technical view · live dimensions')}</span>
              </div>
            </div>
            <RocketRealistic
              vehicle={vehicle}
              cgMm={liveCgFromNose}
              cpMm={analysisSummary?.cp_x_mm_from_nose ?? null}
              componentCgs={componentSummary?.components ?? []}
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
              <strong>{analysisSummary?.cp_x_mm_from_support !== undefined ? `${analysisSummary.cp_x_mm_from_support.toFixed(1)} mm` : analysisSummary?.cp_x_mm_from_nose !== undefined ? `${(Number(vehicle.totalLength) - analysisSummary.cp_x_mm_from_nose).toFixed(1)} mm` : '—'}</strong>
              <small>{txt('desde apoyo · Barrowman/perfil', 'from support · Barrowman/profile')}</small>
            </article>
            <article className="metric-card">
              <span>{txt('APOGEO', 'APOGEE')}</span>
              <strong>{analysisSummary?.apogee_m !== undefined ? `${analysisSummary.apogee_m.toFixed(1)} m` : '—'}</strong>
              <small>{txt('resultado de trayectoria', 'trajectory result')}</small>
            </article>
            <article className="metric-card">
              <span>{txt('Q MÁX', 'MAX Q')}</span>
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
            lang={lang}
          />
          </div>
          <CadInteroperabilityPanel onGeometryImported={importCadGeometry} lang={lang} />

          <div className="panel readiness">
            <div className="panel-title compact">
              <div>
                <p>{txt('TRAZABILIDAD', 'TRACEABILITY')}</p>
                <h2>{txt('Estado del CDR', 'CDR readiness')}</h2>
              </div>
              <strong className="score">{5 - Math.min(blockers.length, 5)}/5</strong>
            </div>
            <div className="readiness-grid">
              <div className="ready-row complete"><b>01</b><span>{txt('Geometría principal', 'Principal geometry')}</span><em>860 / 180 / 180 / 500 / Ø63</em></div>
              <div className="ready-row complete"><b>02</b><span>{txt('Perfil de aleta', 'Fin profile')}</span><em>{vehicle.airfoil}</em></div>
              <div className={`ready-row ${vehicle.tipChord !== '' && vehicle.sweep !== '' && vehicle.finX !== '' ? 'complete' : ''}`}><b>03</b><span>{txt('Planta de aleta', 'Fin planform')}</span><em>{vehicle.tipChord !== '' && vehicle.sweep !== '' && vehicle.finX !== '' ? txt('LISTA', 'READY') : txt('POR DEFINIR', 'TBD')}</em></div>
              <div className="ready-row complete"><b>04</b><span>{txt('Tabla de masas', 'Mass table')}</span><em>{txt('PRECARGADA · EDITABLE', 'PRELOADED · EDITABLE')}</em></div>
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
                <div><dt>{txt('Empuje medio', 'Avg thrust')}</dt><dd>{averageThrust == null ? '—' : averageThrust.toFixed(1) + ' N'}</dd></div>
                <div><dt>{txt('Empuje máximo', 'Max thrust')}</dt><dd>{motor.maxThrust === '' ? '—' : String(motor.maxThrust) + ' N'}</dd></div>
                <div><dt>{txt('Propelente', 'Propellant')}</dt><dd>{motor.propellantMass === '' ? '—' : String(motor.propellantMass) + ' g'}</dd></div>
                <div><dt>{txt('Masa seca', 'Dry')}</dt><dd>{motor.dryMass === '' ? '—' : String(motor.dryMass) + ' g'}</dd></div>
              </dl>
              {!activeMotorReady && <small className="motor-consistency-note motor-warning">{txt('Completá tiempo de combustión, impulso, masa de propelente y masa seca para habilitar esta configuración.', 'Complete burn time, impulse, propellant mass and dry mass to enable this configuration.')}</small>}
              {activeMotorReady && <small className="motor-consistency-note">{txt('El empuje medio usado por la simulación rectangular se deriva automáticamente como I/t.', 'Average thrust for the rectangular-thrust simulation is derived automatically as I/t.')}</small>}
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

      <nav
        className="mobile-command-bar"
        aria-label={txt('Navegación móvil', 'Mobile navigation')}
        style={{ '--nav-index': mobileNavIndex } as React.CSSProperties}
      >
        <i className="mobile-nav-slider" aria-hidden="true" />
        <button type="button" className={mobileSection === 'home' ? 'active' : ''} onClick={() => navigateMobile('home')}>
          <span className="mobile-nav-icon"><Home size={20} strokeWidth={1.8} /></span>
          <small>{txt('INICIO', 'HOME')}</small>
        </button>
        <button type="button" className={['pdr','vehicle','geometry','motor'].includes(mobileSection) ? 'active' : ''} onClick={() => navigateMobile('pdr')}>
          <span className="mobile-nav-icon"><Rocket size={20} strokeWidth={1.8} /></span>
          <small>PDR</small>
        </button>
        <button type="button" className={['cdr','analysis','model','status'].includes(mobileSection) ? 'mobile-primary active' : 'mobile-primary'} onClick={() => navigateMobile('cdr')}>
          <span className="mobile-nav-icon primary"><Gauge size={26} strokeWidth={1.8} /></span>
          <small>CDR</small>
        </button>
        <button type="button" className={mobileSection === 'plots' ? 'active' : ''} onClick={() => navigateMobile('plots')}>
          <span className="mobile-nav-icon"><ChartNoAxesCombined size={20} strokeWidth={1.8} /></span>
          <small>{txt('GRÁFICOS', 'PLOTS')}</small>
        </button>
        <button type="button" className={showExportMenu ? 'active' : ''} onClick={() => setShowExportMenu((value) => !value)}>
          <span className="mobile-nav-icon"><Download size={20} strokeWidth={1.8} /></span>
          <small>{txt('EXPORTAR', 'EXPORT')}</small>
        </button>
      </nav>

      {showExportMenu && <div className="mobile-export-backdrop" onClick={() => { setShowExportMenu(false);  }}>
        <div className="mobile-export-sheet" onClick={(event) => event.stopPropagation()}>
          <div className="mobile-export-head">
            <div><span>{txt('SALIDA', 'OUTPUT')}</span><strong>{txt('EXPORTAR RESULTADOS', 'EXPORT RESULTS')}</strong></div>
            <button type="button" onClick={() => { setShowExportMenu(false);  }} aria-label={txt('Cerrar', 'Close')}>×</button>
          </div>
          <button type="button" onClick={exportExcel}><strong>EXCEL TÉCNICO</strong><small>.XLSX · 8 HOJAS + GRÁFICOS</small></button>
          <button type="button" onClick={exportChartsZip}><strong>{txt('GRÁFICOS PNG', 'PNG PLOTS')}</strong><small>{txt('5 ARCHIVOS · ALTA RESOLUCIÓN', '5 FILES · HIGH RES')}</small></button>
          <button type="button" onClick={exportJson}><strong>JSON</strong><small>{txt('PROYECTO REPRODUCIBLE / SOFTWARE', 'REPRODUCIBLE PROJECT / SOFTWARE')}</small></button>
          <button type="button" onClick={exportTrajectoryCsv}><strong>CSV</strong><small>{txt('TRAYECTORIA TABULAR', 'TABULAR TRAJECTORY')}</small></button>
        </div>
      </div>}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);