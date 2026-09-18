import React, { useEffect, useState } from 'react';

type NumericField = number | '';
type VehicleLike = {
  diameter: NumericField; noseLength: NumericField; finCount: NumericField;
  rootChord: NumericField; tipChord: NumericField; span: NumericField;
  sweep: NumericField; finX: NumericField;
};
type MassRow = { id: number; name: string; massG: NumericField; xMm: NumericField; note?: string };
type CGResult = { total_mass_g: number; cg_x_mm_from_nose: number };
type Analysis = CGResult & {
  cp_x_mm_from_nose: number; static_margin_calibers: number;
  nose_cp_x_mm: number; fins_cp_x_mm: number;
};

const initialMasses: MassRow[] = [
  { id: 1, name: 'Nose', massG: 100, xMm: 111.4, note: 'legacy PDR' },
  { id: 2, name: 'Main airframe', massG: 330, xMm: 520, note: 'legacy PDR / uniform-body estimate' },
  { id: 3, name: 'Parachute', massG: 30, xMm: 200, note: 'legacy PDR' },
  { id: 4, name: 'Payload', massG: 100, xMm: 225, note: 'legacy PDR' },
  { id: 5, name: 'Motor', massG: 490, xMm: 765, note: '190 mm motor, tail-mounted estimate' },
  { id: 6, name: 'Fins · demo assumption', massG: 80, xMm: 800, note: 'assumes 4 × 20 g; verify' },
];

export function LiveAnalysisPanel({ vehicle }: { vehicle: VehicleLike }) {
  const [masses, setMasses] = useState(initialMasses);
  const [cg, setCg] = useState<CGResult | null>(null);
  const [result, setResult] = useState<Analysis | null>(null);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);

  const planformReady = [vehicle.tipChord, vehicle.sweep, vehicle.finX].every((v) => v !== '');
  const massesReady = masses.every((row) => row.massG !== '' && row.xMm !== '');
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
      const response = await fetch('http://127.0.0.1:8000/v1/analysis/cg-cp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nose_length_mm: Number(vehicle.noseLength), body_diameter_mm: Number(vehicle.diameter),
          fin_count: Number(vehicle.finCount), fin_root_chord_mm: Number(vehicle.rootChord),
          fin_tip_chord_mm: Number(vehicle.tipChord), fin_span_mm: Number(vehicle.span),
          fin_sweep_mm: Number(vehicle.sweep), fin_leading_edge_x_mm: Number(vehicle.finX),
          masses: payloadMasses,
        }),
      });
      if (!response.ok) throw new Error(`API ${response.status}`);
      setResult(await response.json());
    } catch (e) { setError(e instanceof Error ? e.message : 'Unknown error'); }
    finally { setRunning(false); }
  };

  const shown = result ?? cg;
  return <div className="panel mass-panel">
    <div className="panel-title compact"><div><p>LIVE PHYSICS · DEMO MASS FIXTURE</p><h2>CG + CP · Barrowman</h2></div>
      <button className="run" disabled={!planformReady || !massesReady || running} onClick={run}>{running ? 'RUNNING…' : planformReady ? 'RUN CG + CP' : 'FIN PLANFORM REQUIRED'}</button></div>
    <div className="analysis-metrics">
      <div><span>TOTAL MASS</span><strong>{shown ? `${shown.total_mass_g.toFixed(1)} g` : '—'}</strong></div>
      <div><span>CG FROM NOSE</span><strong>{shown ? `${shown.cg_x_mm_from_nose.toFixed(1)} mm` : '—'}</strong></div>
      <div><span>CP FROM NOSE</span><strong>{result ? `${result.cp_x_mm_from_nose.toFixed(1)} mm` : '—'}</strong></div>
      <div><span>STATIC MARGIN</span><strong>{result ? `${result.static_margin_calibers.toFixed(2)} cal` : '—'}</strong></div>
    </div>
    <div className="demo-banner">TEST FIXTURE ONLY · legacy PDR values + explicit estimates. Edit every value before CDR freeze.</div>
    <div className="mass-head"><span>Component</span><span>Mass [g]</span><span>xCG [mm]</span></div>
    <div className="mass-table">{masses.map((row) => <div className="mass-row-wrap" key={row.id}><div className="mass-row">
      <span>{row.name}</span>
      <input type="number" value={row.massG} onChange={(e) => updateMass(row.id, 'massG', e.target.value === '' ? '' : Number(e.target.value))}/>
      <input type="number" value={row.xMm} onChange={(e) => updateMass(row.id, 'xMm', e.target.value === '' ? '' : Number(e.target.value))}/>
    </div><small>{row.note}</small></div>)}</div>
    {!planformReady && <div className="analysis-note">CG is live now. Complete tip chord, sweep and fin X to unlock CP + static margin.</div>}
    {error && <div className="analysis-error">API error: {error}</div>}
    {result && <div className="analysis-note oknote">Backend result · nose CP {result.nose_cp_x_mm.toFixed(1)} mm · fins CP {result.fins_cp_x_mm.toFixed(1)} mm</div>}
  </div>;
}
