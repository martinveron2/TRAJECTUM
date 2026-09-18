import React, { useState } from 'react';

type CadInfo = { name: string; representation: string; path: string };
type Point = { x: number; y: number };

const formats: Record<string, CadInfo> = {
  dxf: { name: 'DXF', representation: '2D sketch/profile', path: 'Preview here + import into Fusion sketch' },
  step: { name: 'STEP', representation: 'B-rep solid/surface', path: 'Preferred neutral exchange' },
  stp: { name: 'STEP', representation: 'B-rep solid/surface', path: 'Preferred neutral exchange' },
  f3d: { name: 'Fusion 360', representation: 'Native parametric', path: 'Fusion connector or STEP export' },
  ipt: { name: 'Inventor', representation: 'Native parametric', path: 'Inventor connector or STEP export' },
  iam: { name: 'Inventor assembly', representation: 'Native parametric', path: 'Inventor connector or STEP export' },
  stl: { name: 'STL', representation: 'Triangle mesh', path: 'Preview/mesh path; not preferred for mass properties' },
};

function parseDxfPolyline(text: string): Point[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const points: Point[] = [];
  let inside = false;
  let pendingX: number | null = null;
  for (let i = 0; i < lines.length - 1; i += 2) {
    const code = lines[i];
    const value = lines[i + 1];
    if (code === '0' && value === 'LWPOLYLINE') { inside = true; continue; }
    if (inside && code === '0') break;
    if (!inside) continue;
    if (code === '10') pendingX = Number(value);
    if (code === '20' && pendingX !== null) {
      points.push({ x: pendingX, y: Number(value) });
      pendingX = null;
    }
  }
  return points;
}

export function CadInteroperabilityPanel() {
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<Point[]>([]);
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const info = formats[ext];

  const onFile = async (file?: File) => {
    setFileName(file?.name ?? ''); setPreview([]);
    if (!file || !file.name.toLowerCase().endsWith('.dxf')) return;
    setPreview(parseDxfPolyline(await file.text()));
  };

  const bounds = preview.length ? {
    minX: Math.min(...preview.map((p) => p.x)), maxX: Math.max(...preview.map((p) => p.x)),
    minY: Math.min(...preview.map((p) => p.y)), maxY: Math.max(...preview.map((p) => p.y)),
  } : null;
  const svgPoints = bounds ? preview.map((p) => {
    const w = Math.max(bounds.maxX - bounds.minX, 1);
    const h = Math.max(bounds.maxY - bounds.minY, 1);
    const x = 15 + ((p.x - bounds.minX) / w) * 570;
    const y = 135 - ((p.y - bounds.minY) / h) * 110;
    return `${x},${y}`;
  }).join(' ') : '';

  return <div className="panel cad-panel">
    <div className="panel-title compact"><div><p>CAD INTEROPERABILITY</p><h2>Bring your own geometry</h2></div><span className="live-badge">ADAPTER LAYER</span></div>
    <div className="cad-drop">
      <input id="cad-file" type="file" accept=".dxf,.step,.stp,.f3d,.ipt,.iam,.stl" onChange={(e) => onFile(e.target.files?.[0])}/>
      <label htmlFor="cad-file"><strong>{fileName || 'Select CAD file'}</strong><span>DXF · STEP · Fusion 360 · Inventor · STL</span></label>
    </div>
    {fileName && <div className="cad-result">
      <div><span>FORMAT</span><strong>{info?.name ?? 'Unsupported'}</strong></div>
      <div><span>REPRESENTATION</span><strong>{info?.representation ?? '—'}</strong></div>
      <div><span>PATH</span><strong>{info?.path ?? 'Export to STEP first'}</strong></div>
    </div>}
    {preview.length > 2 && <div className="cad-preview"><svg viewBox="0 0 600 150"><polyline points={svgPoints} fill="none" stroke="currentColor" strokeWidth="2"/></svg><span>{preview.length} DXF profile vertices loaded</span></div>}
    <p className="cad-note">DXF profile preview is live now. STEP/Fusion/Inventor are recognized but need their format-specific geometry adapters before they can replace the engineering model automatically.</p>
  </div>;
}
