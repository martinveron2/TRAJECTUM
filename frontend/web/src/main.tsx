import React, { useCallback, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { LiveAnalysisPanel } from './LiveAnalysisPanel';
import { CadInteroperabilityPanel } from './CadInteroperabilityPanel';
import { RocketRealistic } from './RocketRealistic';
import { NoseProfileComparison } from './NoseProfileComparison';

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

const motor = {
  designation: 'A-100 RN (29%H)',
  propellant: 'KNDX',
  burn: 0.5,
  impulse: 207,
  averageThrust: 414,
  maxThrust: 600,
  propellantMass: 140,
  dryMass: 350,
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
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {status && <small>{status}</small>}
      </span>
      <span className="input-wrap">
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

  const update = <K extends keyof Vehicle>(key: K, value: Vehicle[K]) => {
    setVehicle((current) => ({ ...current, [key]: value }));
  };

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
    return result;
  }, [vehicle, lang]);

  const axialSum =
    (Number(vehicle.noseLength) || 0) +
    (Number(vehicle.bayLength) || 0) +
    (Number(vehicle.bodyLength) || 0);
  const geometryConsistent = vehicle.totalLength !== '' && axialSum === Number(vehicle.totalLength);
  const ready = blockers.length === 0;

  const runFromTop = () => {
    setRunToken((value) => value + 1);
  };

  const goToAnalysis = () => {
    setRunToken((value) => value + 1);
    document.getElementById('engineering-analysis')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const reset = () => {
    setVehicle(initialVehicle);
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

  const exportCase = () => {
    const blob = new Blob([JSON.stringify({ vehicle, motor }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'trajectum-vehicle-draft.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">TRAJECTUM · v0.1.0-CDR</p>
          <h1>{txt('Ingeniería del vehículo', 'Vehicle Engineering Workspace')}</h1>
        </div>
        <div className="top-actions">
          <button className="ghost" onClick={reset}>{txt('Restablecer caso UTN', 'Reset UTN baseline')}</button>
          <button className="ghost" onClick={exportCase}>{txt('Exportar borrador JSON', 'Export draft JSON')}</button>
          <button className="run" onClick={ready ? runFromTop : goToAnalysis}>
            {ready ? txt('EJECUTAR · ACTUALIZAR CG/CP', 'RUN · UPDATE CG/CP') : `${txt('ABRIR ANÁLISIS', 'OPEN ANALYSIS')} · ${blockers.length} ${txt('ENTRADAS', 'INPUTS')}`}
          </button>
          <button className="ghost lang-toggle" onClick={() => setLang((current) => current === 'es' ? 'en' : 'es')} title={txt('Cambiar a inglés', 'Switch to Spanish')}>{isEs ? 'EN' : 'ES'}</button>
        </div>
      </header>

      <section className="status-strip">
        <div><span>{txt('CASO', 'CASE')}</span><strong>UTN-FRH-G07 / CDR</strong></div>
        <div><span>{txt('GEOMETRÍA', 'GEOMETRY')}</span><strong className={geometryConsistent ? 'ok' : 'bad'}>{geometryConsistent ? txt('CONSISTENTE', 'CONSISTENT') : txt('REVISAR LONGITUDES', 'CHECK LENGTHS')}</strong></div>
        <div><span>{txt('PERFIL', 'AIRFOIL')}</span><strong>{vehicle.airfoil}</strong></div>
        <div><span>MOTOR</span><strong>{motor.designation}</strong></div>
        <div><span>{txt('CDR NUMÉRICO', 'NUMERIC CDR')}</span><strong className={ready ? 'ok' : 'warn'}>{ready ? txt('LISTO', 'READY') : txt('BLOQUEADO', 'BLOCKED')}</strong></div>
      </section>

      <section className="workspace">
        <aside className="panel editor">
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
            <h3>{txt('Aletas', 'Fins')}</h3>
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
          <div className="panel visual">
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

          <LiveAnalysisPanel
            vehicle={vehicle}
            runToken={runToken}
            resetToken={resetToken}
            onAnalysisUpdate={handleAnalysisUpdate}
            lang={lang}
          />
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

          <div className="panel motor-panel">
            <div>
              <p>{txt('MOTOR · ESPECIFICACIÓN TP', 'MOTOR · TP SPECIFICATION')}</p>
              <h2>{motor.designation}</h2>
              <span>{motor.propellant}</span>
            </div>
            <dl>
              <div><dt>{txt('Combustión', 'Burn')}</dt><dd>{motor.burn} s</dd></div>
              <div><dt>{txt('Impulso', 'Impulse')}</dt><dd>{motor.impulse} N·s</dd></div>
              <div><dt>{txt('Empuje medio', 'Avg thrust')}</dt><dd>{motor.averageThrust} N</dd></div>
              <div><dt>{txt('Empuje máximo', 'Max thrust')}</dt><dd>{motor.maxThrust} N</dd></div>
              <div><dt>{txt('Propelente', 'Propellant')}</dt><dd>{motor.propellantMass} g</dd></div>
              <div><dt>{txt('Masa seca', 'Dry')}</dt><dd>{motor.dryMass} g</dd></div>
            </dl>
            <small className="motor-consistency-note">{txt('Empuje medio mostrado = I/t = 207 N·s / 0.5 s = 414 N. El valor TP 441 N queda marcado para reconciliación con la curva real de empuje.', 'Displayed average thrust = I/t = 207 N·s / 0.5 s = 414 N. The TP value of 441 N remains flagged for reconciliation with the actual thrust curve.')}</small>
          </div>
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);