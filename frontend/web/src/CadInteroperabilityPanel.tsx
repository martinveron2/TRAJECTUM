import React, { useState } from 'react';

type CadInfo = { name: string; representation: string; path: string };

const formats: Record<string, CadInfo> = {
  step: { name: 'STEP', representation: 'B-rep solid/surface', path: 'Preferred neutral exchange' },
  stp: { name: 'STEP', representation: 'B-rep solid/surface', path: 'Preferred neutral exchange' },
  f3d: { name: 'Fusion 360', representation: 'Native parametric', path: 'Fusion connector or STEP export' },
  ipt: { name: 'Inventor', representation: 'Native parametric', path: 'Inventor connector or STEP export' },
  iam: { name: 'Inventor assembly', representation: 'Native parametric', path: 'Inventor connector or STEP export' },
  stl: { name: 'STL', representation: 'Triangle mesh', path: 'Preview only; not preferred for mass properties' },
};

export function CadInteroperabilityPanel() {
  const [fileName, setFileName] = useState('');
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const info = formats[ext];

  return <div className="panel cad-panel">
    <div className="panel-title compact"><div><p>CAD INTEROPERABILITY</p><h2>Bring your own geometry</h2></div><span className="live-badge">ADAPTER LAYER</span></div>
    <div className="cad-drop">
      <input id="cad-file" type="file" accept=".step,.stp,.f3d,.ipt,.iam,.stl" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}/>
      <label htmlFor="cad-file"><strong>{fileName || 'Select CAD file'}</strong><span>STEP · Fusion 360 · Inventor · STL</span></label>
    </div>
    {fileName && <div className="cad-result">
      <div><span>FORMAT</span><strong>{info?.name ?? 'Unsupported'}</strong></div>
      <div><span>REPRESENTATION</span><strong>{info?.representation ?? '—'}</strong></div>
      <div><span>PATH</span><strong>{info?.path ?? 'Export to STEP first'}</strong></div>
    </div>}
    <p className="cad-note">File selection is active; geometry parsing stays behind format-specific adapters. STEP is the preferred exchange format. Native Fusion/Inventor connectors come next.</p>
  </div>;
}
