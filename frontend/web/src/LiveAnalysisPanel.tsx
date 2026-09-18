import React, { useEffect, useState } from 'react';

type NumericField = number | '';
type VehicleLike = {
  diameter: NumericField; noseLength: NumericField; finCount: NumericField;
  rootChord: NumericField; tipChord: NumericField; span: NumericField;
  sweep: NumericField; finX: NumericField; launchAngle: NumericField; cd: NumericField;
};
type MassRow = { id: number; name: string; massG: NumericField; xMm: NumericField; note?: string };
type CGResult = { total_mass_g: number; cg_x_mm_from_nose: number };
type Analysis = CGResult & {
  cp_x_mm_from_nose: number; static_margin_calibers: number;
  nose_cp_x_mm?: number; fins_cp_x_mm?: number;
  apogee_m?: number; time_to_apogee_s?: number; max_q_pa?: number;
  max_speed_m_s?: number; max_mach?: number;
};

const initialMasses: MassRow[] = [
  { id: 1, name: 'Nose', massG: 100, xMm: 111.4, note: 'legacy PDR' },
  { id: 2, name: 'Fins · 4 total', massG: 20, xMm: 822.2, note: 'legacy PDR' },
  { id: 3, name: 'Main airframe', massG: 330, xMm: 520, note: 'legacy PDR / uniform body' },
  { id: 4, name: 'Motor', massG: 490, xMm: 765, note: 'TP motor wet mass' },
  { id: 5, name: 'Parachute', massG: 30, xMm: 200, note: 'legacy PDR' },
  { id: 6, name: 'Payload', massG: 100, xMm: 225, note: 'legacy PDR' },
];

export function LiveAnalysisPanel({ vehicle }: { vehicle: VehicleLike }) {
  const [masses, setMasses] = useState(initialMasses);
  const [cg, setCg] = useState<CGResult | null>(null);
  const [result, setResult] = useState<Analysis | null>(null);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);

  const planformReady = [vehicle.tipChord, vehicle.sweep, vehicle.finX].every((v) => v !== '');
  const massesReady = masses.every((row) => row.massG !== '' && row.xMm !== '');
  const trajectoryReady = planformReady && massesReady && vehicle.cd !== '' && vehicle.launchAngle !== '';
  const payloadMasses = masses.map((r) => ({ name: r.name, mass_g: Number(r.massG), x_cg_mm: Number(r.xMm) }));

  useEffect(() => {
    if (!massesReady) { setCg(null); return; }
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/v1/analysis/cg', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ masses: payloadMasses }),
        });
        if (response.ok) setCg(await response.json());
      } catch { setCg(null); }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [masses]);

  const updateMass = (id: number, key: 'massG' | 'xMm', value: NumericField) => {
    setMasses((rows) => rows.map((row) => row.id === id ? { ...row, [key]: value, note: 'edited locally' } : row));
    setResult(null);
  };

  const run = async () => {
    if (!planformReady || !massesReady) return;
    setRunning(true); setError('');
    try {
      const base = {
        nose_length_mm: Number(vehicle.noseLength), body_diameter_mm: Number(vehicle.diameter),
        fin_count: Number(vehicle.finCount), fin_root_chord_mm: Number(vehicle.rootChord),
        fin_tip_chord_mm: Number(vehicle.tipChord), fin_span_mm: Number(vehicle.span),
        fin_sweep_mm: Number(vehicle.sweep), fin_leading_edge_x_mm: Number(vehicle.finX),
        masses: payloadMasses,
      };
      const endpoint = trajectoryReady ? '/v1/analysis/full' : '/v1/analysis/cg-cp';
      const body = trajectoryReady ? { ...base, launch_angle_deg: Number(vehicle.launchAngle), cd: Number(vehicle.cd) } : base;
      const response = await fetch(`http://127.0.0.1:8000${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`API ${response.status}`);
      setResult(await response.json());
    } catch (e) { setError(e instanceof Error ? e.message : 'Unknown error'); }
    finally { setRunning(false); }
  };

  const shown = result ?? cg;
  const mode = trajectoryReady ? 'FULL ENGINEERING RUN' : 'CG + CP ONLY';
  return <div className="panel mass-panel">
    <div className="panel-title compact"><div><p>LIVE PHYSICS · {mode}</p><h2>Engineering analysis engine</h2></div>
      <button className="run" disabled={!planformReady || !massesReady || running} onClick={run}>{running ? 'RUNNING…' : planformReady ? 'RUN ANALYSIS' : 'FIN PLANFORM REQUIRED'}</button></div>
    <div className="analysis-metrics wide">
      <div><span>TOTAL MASS</span><strong>{shown ? `${shown.total_mass_g.toFixed(1)} g` : '—'}</strong></div>
      <div><span>CG FROM NOSE</span><strong>{shown ? `${shown.cg_x_mm_from_nose.toFixed(1)} mm` : '—'}</strong></div>
      <div><span>CP FROM NOSE</span><strong>{result ? `${result.cp_x_mm_from_nose.toFixed(1)} mm` : '—'}</strong></div>
      <div><span>STATIC MARGIN</span><strong>{result ? `${result.static_margin_calibers.toFixed(2)} cal` : '—'}</strong></div>
      <div><span>APOGEE</span><strong>{result?.apogee_m !== undefined ? `${result.apogee_m.toFixed(1)} m` : '—'}</strong></div>
      <div><span>MAX Q</span><strong>{result?.max_q_pa !== undefined ? `${result.max_q_pa.toFixed(0)} Pa` : '—'}</strong></div>
      <div><span>MAX SPEED</span><strong>{result?.max_speed_m_s !== undefined ? `${result.max_speed_m_s.toFixed(1)} m/s` : '—'}</strong></div>
      <div><span>MAX MACH</span><strong>{result?.max_mach !== undefined ? result.max_mach.toFixed(3) : '—'}</strong></div>
    </div>
    <div className="demo-banner">TEST FIXTURE ONLY · PDR masses are preloaded to exercise the engine. Replace them with CDR values before freeze.</div>
    <div className="mass-head"><span>Component</span><span>Mass [g]</span><span>xCG [mm]</span></div>
    <div className="mass-table">{masses.map((row) => <div className="mass-row-wrap" key={row.id}><div className="mass-row">
      <span>{row.name}</span>
      <input type="number" value={row.massG} onChange={(e) => updateMass(row.id, 'massG', e.target.value === '' ? '' : Number(e.target.value))}/>
      <input type="number" value={row.xMm} onChange={(e) => updateMass(row.id, 'xMm', e.target.value === '' ? '' : Number(e.target.value))}/>
    </div><small>{row.note}</small></div>)}</div>
    {!planformReady && <div className="analysis-note">CG is live. Complete tip chord, sweep and fin X to unlock CP.</div>}
    {planformReady && vehicle.cd === '' && <div className="analysis-note">CP is available. Enter Cd under flight inputs to unlock trajectory, apogee, MaxQ and Mach.</div>}
    {error && <div className="analysis-error">API error: {error}</div>}
  </div>;
}
