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

type ImportedGeometry = {
  totalLength: number;
  diameter: number;
  noseLength: number | null;
};

export function CadInteroperabilityPanel({ onGeometryImported, lang = 'es' }: { onGeometryImported?: (geometry: ImportedGeometry) => void; lang?: 'es' | 'en' }) {
  const isEs = lang === 'es';
  const txt = (es: string, en: string) => isEs ? es : en;
  const localRepresentation = (value?: string) => {
    if (!value || !isEs) return value;
    return ({ '2D sketch/profile': 'Croquis/perfil 2D', 'B-rep solid/surface': 'Sólido/superficie B-rep', 'Native parametric': 'Paramétrico nativo', 'Triangle mesh': 'Malla triangular' } as Record<string, string>)[value] ?? value;
  };
  const localPath = (value?: string) => {
    if (!value || !isEs) return value;
    return ({ 'Preview here + import into Fusion sketch': 'Vista previa aquí + importación a croquis de Fusion', 'Preferred neutral exchange': 'Intercambio neutro preferido', 'Fusion connector or STEP export': 'Conector de Fusion o exportación STEP', 'Inventor connector or STEP export': 'Conector de Inventor o exportación STEP', 'Preview/mesh path; not preferred for mass properties': 'Vista previa/malla; no recomendado para propiedades de masa' } as Record<string, string>)[value] ?? value;
  };
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<Point[]>([]);
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const info = formats[ext];

  const onFile = async (file?: File) => {
    setFileName(file?.name ?? ''); setPreview([]);
    if (!file || !file.name.toLowerCase().endsWith('.dxf')) return;
    const points = parseDxfPolyline(await file.text());
    setPreview(points);
    if (points.length > 2 && onGeometryImported) {
      const minX = Math.min(...points.map((p) => p.x));
      const maxX = Math.max(...points.map((p) => p.x));
      const minY = Math.min(...points.map((p) => p.y));
      const maxY = Math.max(...points.map((p) => p.y));
      const radius = Math.max(Math.abs(minY), Math.abs(maxY));
      const tolerance = Math.max(radius * 0.002, 0.02);
      const upper = points
        .filter((p) => p.y >= 0)
        .sort((a, b) => a.x - b.x);
      const junction = upper.find((p) => Math.abs(p.y - radius) <= tolerance);
      onGeometryImported({
        totalLength: maxX - minX,
        diameter: 2 * radius,
        noseLength: junction ? junction.x - minX : null,
      });
    }
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
    <div className="panel-title compact"><div><p>{txt('INTEROPERABILIDAD CAD', 'CAD INTEROPERABILITY')}</p><h2>{txt('Importar geometría propia', 'Bring your own geometry')}</h2></div><span className="live-badge">{txt('CAPA DE ADAPTADORES', 'ADAPTER LAYER')}</span></div>
    <div className="cad-drop">
      <input id="cad-file" type="file" accept=".dxf,.step,.stp,.f3d,.ipt,.iam,.stl" onChange={(e) => onFile(e.target.files?.[0])}/>
      <label htmlFor="cad-file"><strong>{fileName || txt('Seleccionar archivo CAD', 'Select CAD file')}</strong><span>DXF · STEP · Fusion 360 · Inventor · STL</span></label>
    </div>
    {fileName && <div className="cad-result">
      <div><span>{txt('FORMATO', 'FORMAT')}</span><strong>{info?.name ?? txt('No compatible', 'Unsupported')}</strong></div>
      <div><span>{txt('REPRESENTACIÓN', 'REPRESENTATION')}</span><strong>{localRepresentation(info?.representation) ?? '—'}</strong></div>
      <div><span>{txt('RUTA', 'PATH')}</span><strong>{localPath(info?.path) ?? txt('Exportar primero a STEP', 'Export to STEP first')}</strong></div>
    </div>}
    {preview.length > 2 && <div className="cad-preview"><svg viewBox="0 0 600 150"><polyline points={svgPoints} fill="none" stroke="currentColor" strokeWidth="2"/></svg><span>{preview.length} {txt('vértices del perfil DXF cargados', 'DXF profile vertices loaded')}</span></div>}
    <p className="cad-note">{txt('La vista previa del perfil DXF ya es funcional. STEP, Fusion e Inventor se reconocen, pero necesitan adaptadores geométricos específicos antes de poder reemplazar automáticamente el modelo de ingeniería.', 'DXF profile preview is live now. STEP/Fusion/Inventor are recognized but need their format-specific geometry adapters before they can replace the engineering model automatically.')}</p>
  </div>;
}
