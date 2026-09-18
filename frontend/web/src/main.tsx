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
    if (vehicle.tipChord === '') result.push('Fin tip chord');
    if (vehicle.sweep === '') result.push('Fin sweep');
    if (vehicle.finX === '') result.push('Fin axial location');
    if (vehicle.cd === '') result.push('Drag coefficient Cd');
    return result;
  }, [vehicle]);

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
          <h1>Vehicle Engineering Workspace</h1>
        </div>
        <div className="top-actions">
          <button className="ghost" onClick={reset}>Reset UTN baseline</button>
          <button className="ghost" onClick={exportCase}>Export draft JSON</button>
          <button className="run" onClick={ready ? runFromTop : goToAnalysis}>
            {ready ? 'RUN · UPDATE CG/CP' : `OPEN ANALYSIS · ${blockers.length} INPUTS`}
          </button>
        </div>
      </header>

      <section className="status-strip">
        <div><span>CASE</span><strong>UTN-FRH-G07 / CDR</strong></div>
        <div><span>GEOMETRY</span><strong className={geometryConsistent ? 'ok' : 'bad'}>{geometryConsistent ? 'CONSISTENT' : 'CHECK LENGTHS'}</strong></div>
        <div><span>AIRFOIL</span><strong>{vehicle.airfoil}</strong></div>
        <div><span>MOTOR</span><strong>{motor.designation}</strong></div>
        <div><span>NUMERIC CDR</span><strong className={ready ? 'ok' : 'warn'}>{ready ? 'READY' : 'BLOCKED'}</strong></div>
      </section>

      <section className="workspace">
        <aside className="panel editor">
          <div className="panel-title">
            <div>
              <p>INPUT</p>
              <h2>Parametric Vehicle Editor</h2>
            </div>
            <span className="live-badge">LIVE</span>
          </div>

          <h3>Primary geometry</h3>
          <div className="airfoil-row nose-selector">
            <label>
              <span>Nose profile family</span>
              <select value={vehicle.noseProfile} onChange={(e) => update('noseProfile', e.target.value)}>
                <option value="tangent_ogive">Tangent ogive</option>
                <option value="von_karman">Von Kármán</option>
                <option value="power_series">Power series n=0.75</option>
              </select>
            </label>
            <span className="info-badge">same L · same Ø</span>
          </div>
          <div className="field-grid">
            <Field label="Total length" value={vehicle.totalLength} unit="mm" status="frozen" onChange={(v) => update('totalLength', v)} />
            <Field label="Outer diameter" value={vehicle.diameter} unit="mm" status="frozen" onChange={(v) => update('diameter', v)} />
            <Field label="Nose length" value={vehicle.noseLength} unit="mm" status="frozen" onChange={(v) => update('noseLength', v)} />
            <Field label="Modular bay" value={vehicle.bayLength} unit="mm" status="frozen" onChange={(v) => update('bayLength', v)} />
            <Field label="Lower body" value={vehicle.bodyLength} unit="mm" status="frozen" onChange={(v) => update('bodyLength', v)} />
            <Field label="Wall thickness" value={vehicle.wall} unit="mm" status="provisional" onChange={(v) => update('wall', v)} />
          </div>

          <div className="section-heading">
            <h3>Fins</h3>
            <span>trapezoidal planform</span>
          </div>
          <div className="airfoil-row">
            <label>
              <span>Cross-section profile</span>
              <select value={vehicle.airfoil} onChange={(e) => update('airfoil', e.target.value)}>
                <option>NACA 0012</option>
                <option>NACA 0009</option>
                <option>NACA 0015</option>
                <option>NACA 2412</option>
                <option>CUSTOM</option>
              </select>
            </label>
            <span className="info-badge">Professor / PDR correction</span>
          </div>
          <div className="field-grid">
            <Field label="Fin count" value={vehicle.finCount} status="frozen" onChange={(v) => update('finCount', v)} />
            <Field label="Root chord" value={vehicle.rootChord} unit="mm" status="provisional" onChange={(v) => update('rootChord', v)} />
            <Field label="Tip chord" value={vehicle.tipChord} unit="mm" status="demo" onChange={(v) => update('tipChord', v)} />
            <Field label="Span" value={vehicle.span} unit="mm" status="provisional" onChange={(v) => update('span', v)} />
            <Field label="Sweep" value={vehicle.sweep} unit="mm" status="demo" onChange={(v) => update('sweep', v)} />
            <Field label="Leading-edge X" value={vehicle.finX} unit="mm" status="demo" onChange={(v) => update('finX', v)} />
          </div>

          <button className="advanced-toggle" onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? 'Hide' : 'Show'} flight inputs
          </button>
          {showAdvanced && (
            <div className="field-grid advanced">
              <Field label="Launch angle" value={vehicle.launchAngle} unit="deg" status="TP" onChange={(v) => update('launchAngle', v)} />
              <Field label="Drag coefficient Cd" value={vehicle.cd} status="demo" onChange={(v) => update('cd', v)} />
              <Field label="Parachute Cd" value={vehicle.parachuteCd} status="recovery" onChange={(v) => update('parachuteCd', v)} />
              <Field label="Parachute area" value={vehicle.parachuteArea} unit="m²" status="recovery" onChange={(v) => update('parachuteArea', v)} />
              <Field label="Deploy altitude" value={vehicle.deployAltitude} unit="m" status="blank = apogee" onChange={(v) => update('deployAltitude', v)} />
              <Field label="Deploy delay" value={vehicle.deployDelay} unit="s" status="recovery" onChange={(v) => update('deployDelay', v)} />
            </div>
          )}
        </aside>

        <section className="right-column">
          <div className="panel visual">
            <div className="panel-title">
              <div>
                <p>GEOMETRY</p>
                <h2>Parametric side view</h2>
              </div>
              <div className="visual-tools">
                <button
                  type="button"
                  className={showComponentCgs ? 'technical-toggle active' : 'technical-toggle'}
                  onClick={() => setShowComponentCgs((value) => !value)}
                  aria-pressed={showComponentCgs}
                >
                  {showComponentCgs ? 'HIDE COMPONENT CGs' : 'SHOW COMPONENT CGs'}
                </button>
                <span className="scale-note">technical view · live dimensions</span>
              </div>
            </div>
            <RocketRealistic
              vehicle={vehicle}
              cgMm={liveCgFromNose}
              cpMm={analysisSummary?.cp_x_mm_from_nose ?? null}
              componentCgs={componentSummary?.components ?? []}
              showComponentCgs={showComponentCgs}
            />
          </div>

          <NoseProfileComparison
            selected={vehicle.noseProfile}
            onSelect={(profile) => update('noseProfile', profile)}
          />

          <div className="result-grid">
            <article className="metric-card">
              <span>CG</span>
              <strong>{liveCgFromNose !== null ? `${(Number(vehicle.totalLength) - liveCgFromNose).toFixed(1)} mm` : '—'}</strong>
              <small>desde apoyo · referencia cátedra</small>
            </article>
            <article className="metric-card">
              <span>CP</span>
              <strong>{analysisSummary?.cp_x_mm_from_support !== undefined ? `${analysisSummary.cp_x_mm_from_support.toFixed(1)} mm` : analysisSummary?.cp_x_mm_from_nose !== undefined ? `${(Number(vehicle.totalLength) - analysisSummary.cp_x_mm_from_nose).toFixed(1)} mm` : '—'}</strong>
              <small>desde apoyo · Barrowman/profile</small>
            </article>
            <article className="metric-card">
              <span>APOGEE</span>
              <strong>{analysisSummary?.apogee_m !== undefined ? `${analysisSummary.apogee_m.toFixed(1)} m` : '—'}</strong>
              <small>trajectory result</small>
            </article>
            <article className="metric-card">
              <span>MAX Q</span>
              <strong>{analysisSummary?.max_q_pa !== undefined ? `${analysisSummary.max_q_pa.toFixed(0)} Pa` : '—'}</strong>
              <small>trajectory result</small>
            </article>
          </div>

          <LiveAnalysisPanel
            vehicle={vehicle}
            runToken={runToken}
            resetToken={resetToken}
            onAnalysisUpdate={handleAnalysisUpdate}
          />
          <CadInteroperabilityPanel onGeometryImported={importCadGeometry} />

          <div className="panel readiness">
            <div className="panel-title compact">
              <div>
                <p>TRACEABILITY</p>
                <h2>CDR readiness</h2>
              </div>
              <strong className="score">{5 - Math.min(blockers.length, 5)}/5</strong>
            </div>
            <div className="readiness-grid">
              <div className="ready-row complete"><b>01</b><span>Principal geometry</span><em>860 / 180 / 180 / 500 / Ø63</em></div>
              <div className="ready-row complete"><b>02</b><span>Fin profile</span><em>{vehicle.airfoil}</em></div>
              <div className={`ready-row ${vehicle.tipChord !== '' && vehicle.sweep !== '' && vehicle.finX !== '' ? 'complete' : ''}`}><b>03</b><span>Fin planform</span><em>{vehicle.tipChord !== '' && vehicle.sweep !== '' && vehicle.finX !== '' ? 'READY' : 'TBD'}</em></div>
              <div className="ready-row complete"><b>04</b><span>Mass table</span><em>PRELOADED · EDITABLE</em></div>
              <div className={`ready-row ${vehicle.cd !== '' ? 'complete' : ''}`}><b>05</b><span>Drag model</span><em>{vehicle.cd === '' ? 'TBD' : `Cd ${vehicle.cd}`}</em></div>
            </div>
            <div className="blocker-box">
              <span>ANALYSIS BLOCKERS</span>
              <div>{blockers.map((blocker) => <code key={blocker}>{blocker}</code>)}</div>
            </div>
          </div>

          <div className="panel motor-panel">
            <div>
              <p>MOTOR · TP SPECIFICATION</p>
              <h2>{motor.designation}</h2>
              <span>{motor.propellant}</span>
            </div>
            <dl>
              <div><dt>Burn</dt><dd>{motor.burn} s</dd></div>
              <div><dt>Impulse</dt><dd>{motor.impulse} N·s</dd></div>
              <div><dt>Avg thrust</dt><dd>{motor.averageThrust} N</dd></div>
              <div><dt>Max thrust</dt><dd>{motor.maxThrust} N</dd></div>
              <div><dt>Propellant</dt><dd>{motor.propellantMass} g</dd></div>
              <div><dt>Dry</dt><dd>{motor.dryMass} g</dd></div>
            </dl>
            <small className="motor-consistency-note">Empuje medio mostrado = I/t = 207 N·s / 0.5 s = 414 N. El valor TP 441 N queda marcado para reconciliación con la curva real de empuje.</small>
          </div>
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);