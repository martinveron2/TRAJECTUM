import React, { useEffect, useMemo, useRef, useState } from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';
import Plotly from 'plotly.js-basic-dist-min';
import type { MissionSample } from './missionTypes';
import { buildEngineeringChartImages } from './engineeringChartExport';
import { Download, Eye, Move, RotateCcw, ScanSearch, ZoomIn } from 'lucide-react';

const Plot = createPlotlyComponent(Plotly as any);

type AnalysisMeta = {
  time_to_apogee_s?: number;
  deployment_time_s?: number | null;
  landing_time_s?: number;
  apogee_m?: number;
  max_speed_m_s?: number;
  max_q_pa?: number;
  max_mach?: number;
  impact_speed_m_s?: number;
  total_mass_g?: number;
};

type Props = {
  samples: MissionSample[];
  motorBurnTimeS: number;
  analysis: AnalysisMeta;
  hReqM?: number | null;
  lang?: 'es' | 'en';
};

type ChartKey = 'altitude' | 'speed' | 'mach' | 'q' | 'trajectory';

export function FlightAnalysisCharts({ samples, motorBurnTimeS, analysis, hReqM = null, lang = 'es' }: Props) {
  const [active, setActive] = useState<ChartKey>('altitude');
  const [dragMode, setDragMode] = useState<'zoom' | 'pan'>('zoom');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const graphRef = useRef<any>(null);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 820px), (pointer: coarse)');
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener?.('change', sync);
    return () => media.removeEventListener?.('change', sync);
  }, []);
  const isEs = lang === 'es';
  const txt = (es: string, en: string) => isEs ? es : en;

  const times = useMemo(() => samples.map((s) => s.t_s), [samples]);
  const altitude = useMemo(() => samples.map((s) => s.altitude_m), [samples]);
  const speed = useMemo(() => samples.map((s) => s.speed_m_s), [samples]);
  const mach = useMemo(() => samples.map((s) => s.mach), [samples]);
  const qKpa = useMemo(() => samples.map((s) => s.q_pa / 1000), [samples]);
  const range = useMemo(() => samples.map((s) => s.x_m), [samples]);
  const maxQIndex = useMemo(() => {
    let index = 0;
    for (let i = 1; i < samples.length; i += 1) {
      if (samples[i].q_pa > samples[index].q_pa) index = i;
    }
    return index;
  }, [samples]);

  const gMax = useMemo(() => Math.max(...samples.map((sample) => sample.acceleration_g ?? 0)), [samples]);
  const machMax = analysis.max_mach ?? Math.max(...mach);
  const initialMassKg = analysis.total_mass_g != null ? analysis.total_mass_g / 1000 : null;
  const burnoutSample = useMemo(() => {
    if (!samples.length) return null;
    return samples.reduce((best, sample) =>
      Math.abs(sample.t_s - motorBurnTimeS) < Math.abs(best.t_s - motorBurnTimeS) ? sample : best,
    samples[0]);
  }, [samples, motorBurnTimeS]);

  const timeAboveHReq = useMemo(() => {
    if (hReqM == null || !Number.isFinite(hReqM) || samples.length < 2) return null;
    let seconds = 0;
    for (let i = 1; i < samples.length; i += 1) {
      const a = samples[i - 1];
      const b = samples[i];
      const dt = Math.max(0, b.t_s - a.t_s);
      if (a.altitude_m > hReqM && b.altitude_m > hReqM) {
        seconds += dt;
      } else if ((a.altitude_m - hReqM) * (b.altitude_m - hReqM) < 0) {
        const fraction = Math.abs((hReqM - a.altitude_m) / (b.altitude_m - a.altitude_m));
        seconds += a.altitude_m > hReqM ? dt * fraction : dt * (1 - fraction);
      }
    }
    return seconds;
  }, [hReqM, samples]);

  const performance = useMemo(() => {
    const clamp = (value: number) => Math.max(0, Math.min(100, value));
    const values: number[] = [];
    const h = analysis.apogee_m ?? Math.max(...altitude);
    const v = analysis.max_speed_m_s ?? Math.max(...speed);
    const q = analysis.max_q_pa ?? Math.max(...samples.map((sample) => sample.q_pa));
    const impact = analysis.impact_speed_m_s ?? samples[samples.length - 1]?.speed_m_s;
    values.push(clamp((h / 700) * 100));
    values.push(clamp((v / 150) * 100));
    values.push(clamp((machMax / 0.45) * 100));
    values.push(clamp(100 - (q / 20000) * 100));
    values.push(clamp(100 - ((impact ?? 15) / 15) * 100));
    values.push(clamp(100 - (gMax / 50) * 100));
    if (initialMassKg != null) values.push(clamp(100 - ((initialMassKg - 1) / 1.5) * 100));
    if (timeAboveHReq != null) values.push(clamp((timeAboveHReq / 10) * 100));
    return Math.round(values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1));
  }, [analysis, altitude, gMax, initialMassKg, machMax, samples, speed, timeAboveHReq]);

  const eventShapes = useMemo(() => {
    const events = [
      { x: motorBurnTimeS, label: txt('FIN DE COMBUSTIÓN · Burnout', 'BURNOUT') },
      { x: samples[maxQIndex]?.t_s, label: 'Qmáx' },
      { x: analysis.time_to_apogee_s, label: 'Hmáx' },
      { x: analysis.deployment_time_s ?? undefined, label: txt('DESPLIEGUE', 'DEPLOY') },
    ].filter((event): event is { x: number; label: string } => Number.isFinite(event.x));

    return {
      shapes: events.map((event) => ({
        type: 'line' as const,
        x0: event.x,
        x1: event.x,
        y0: 0,
        y1: 1,
        yref: 'paper' as const,
        line: { width: 1, dash: 'dot' as const, color: 'rgba(124,166,230,.62)' },
      })),
      annotations: events.map((event, index) => ({
        x: event.x,
        y: index % 2 === 0 ? 1.02 : .94,
        yref: 'paper' as const,
        text: event.label,
        showarrow: false,
        font: { size: 9, color: '#8ca8d2' },
        xanchor: 'left' as const,
      })),
    };
  }, [analysis.deployment_time_s, analysis.time_to_apogee_s, maxQIndex, motorBurnTimeS, samples, lang]);

  const chart = useMemo(() => {
    const common = {
      mode: 'lines' as const,
      type: 'scatter' as const,
      line: { width: 2.25 },
      hovertemplate: '%{x:.2f}<br>%{y:.3f}<extra></extra>',
    };

    if (active === 'altitude') return {
      title: txt('ALTITUD VS TIEMPO', 'ALTITUDE VS TIME'),
      x: times, y: altitude, xTitle: txt('TIEMPO [s]', 'TIME [s]'), yTitle: txt('ALTITUD [m]', 'ALTITUDE [m]'),
      trace: { ...common, x: times, y: altitude, name: txt('Altitud', 'Altitude') },
      shapes: eventShapes.shapes, annotations: eventShapes.annotations,
    };
    if (active === 'speed') return {
      title: txt('VELOCIDAD VS TIEMPO', 'SPEED VS TIME'),
      x: times, y: speed, xTitle: txt('TIEMPO [s]', 'TIME [s]'), yTitle: txt('VELOCIDAD [m/s]', 'SPEED [m/s]'),
      trace: { ...common, x: times, y: speed, name: txt('Velocidad', 'Speed') },
      shapes: eventShapes.shapes, annotations: eventShapes.annotations,
    };
    if (active === 'mach') return {
      title: txt('MACH VS TIEMPO', 'MACH VS TIME'),
      x: times, y: mach, xTitle: txt('TIEMPO [s]', 'TIME [s]'), yTitle: 'MACH',
      trace: { ...common, x: times, y: mach, name: 'Mach' },
      shapes: eventShapes.shapes, annotations: eventShapes.annotations,
    };
    if (active === 'q') return {
      title: txt('PRESIÓN DINÁMICA VS TIEMPO', 'DYNAMIC PRESSURE VS TIME'),
      x: times, y: qKpa, xTitle: txt('TIEMPO [s]', 'TIME [s]'), yTitle: 'q [kPa]',
      trace: { ...common, x: times, y: qKpa, name: 'q' },
      shapes: eventShapes.shapes, annotations: eventShapes.annotations,
    };
    return {
      title: txt('TRAYECTORIA X–Z', 'X–Z TRAJECTORY'),
      x: range, y: altitude, xTitle: txt('DISTANCIA HORIZONTAL [m]', 'HORIZONTAL DISTANCE [m]'), yTitle: txt('ALTITUD [m]', 'ALTITUDE [m]'),
      trace: {
        ...common,
        x: range,
        y: altitude,
        name: txt('Trayectoria', 'Trajectory'),
        hovertemplate: 'x=%{x:.2f} m<br>z=%{y:.2f} m<extra></extra>',
      },
      shapes: [], annotations: [],
    };
  }, [active, altitude, eventShapes, mach, qKpa, range, speed, times, lang]);

  const tabs: Array<[ChartKey, string]> = [
    ['altitude', txt('ALTITUD', 'ALTITUDE')],
    ['speed', txt('VELOCIDAD', 'SPEED')],
    ['mach', 'MACH'],
    ['q', txt('PRESIÓN DINÁMICA · Qmáx', 'DYNAMIC PRESSURE · Qmax')],
    ['trajectory', txt('TRAYECTORIA', 'TRAJECTORY')],
  ];

  const setInteraction = (mode: 'zoom' | 'pan') => {
    setDragMode(mode);
    if (graphRef.current) Plotly.relayout(graphRef.current, { dragmode: mode });
  };
  const autoScale = () => graphRef.current && Plotly.relayout(graphRef.current, { 'xaxis.autorange': true, 'yaxis.autorange': true });
  const resetView = () => graphRef.current && Plotly.relayout(graphRef.current, { 'xaxis.autorange': true, 'yaxis.autorange': true, dragmode: dragMode });
  const getActivePng = async () => {
    const indexByChart: Record<ChartKey, number> = { altitude: 0, speed: 1, mach: 2, q: 3, trajectory: 4 };
    const exportSet = await buildEngineeringChartImages(samples, motorBurnTimeS, analysis);
    return exportSet.files[indexByChart[active]];
  };

  const savePng = async () => {
    const file = await getActivePng();
    if (!file) return;
    const blob = new Blob([file.buffer], { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = file.filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const previewPng = async () => {
    const file = await getActivePng();
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(new Blob([file.buffer], { type: 'image/png' }));
    setPreviewUrl(url);
    setPreviewName(file.filename);
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewName('');
  };

  if (!samples.length) return null;

  return <section className="panel flight-analysis-panel">
    <div className="panel-title compact flight-analysis-head">
      <div>
        <p>{txt('ANÁLISIS DE VUELO', 'FLIGHT ANALYSIS')}</p>
        <h2>{txt('Simulación de misión', 'Mission simulation')}</h2>
      </div>
      <span className="rk4-global-badge">{txt('CÁLCULO DE ALTA PRECISIÓN (RK4)', 'HIGH-PRECISION CALCULATION (RK4)')}</span>
    </div>

    <section className="flight-dashboard-section">
      <div className="flight-section-head">
        <span>01</span>
        <div>
          <strong>{txt('ANÁLISIS DE VUELO', 'FLIGHT ANALYSIS')}</strong>
          <small>{txt('SIMULACIÓN DE MISIÓN', 'MISSION SIMULATION')}</small>
        </div>
      </div>

      <div className="flight-square-grid">
        <article className="flight-metric-card">
          <span className="flight-symbol">H<sub>max</sub></span>
          <strong>{(analysis.apogee_m ?? Math.max(...altitude)).toFixed(1)}<em>m</em></strong>
          <small>{txt('ALTURA MÁXIMA','MAX ALTITUDE')}</small>
        </article>
        <article className="flight-metric-card">
          <span className="flight-symbol">Q<sub>max</sub></span>
          <strong>{((analysis.max_q_pa ?? Math.max(...samples.map((sample) => sample.q_pa))) / 1000).toFixed(2)}<em>kPa</em></strong>
          <small>{txt('PRESIÓN DINÁMICA','DYNAMIC PRESSURE')}</small>
        </article>
        <article className="flight-metric-card">
          <span className="flight-symbol">V<sub>max</sub></span>
          <strong>{(analysis.max_speed_m_s ?? Math.max(...speed)).toFixed(1)}<em>m/s</em></strong>
          <small>{txt('VELOCIDAD MÁXIMA','MAX SPEED')}</small>
        </article>
        <article className="flight-metric-card">
          <span className="flight-symbol">V<sub>impacto</sub></span>
          <strong>{(analysis.impact_speed_m_s ?? samples[samples.length - 1].speed_m_s).toFixed(2)}<em>m/s</em></strong>
          <small>{txt('VEL. DE IMPACTO','IMPACT SPEED')}</small>
        </article>
      </div>

      <div className="flight-secondary-grid">
        <article className="flight-metric-card secondary">
          <span className="flight-symbol">{txt('MASA','MASS')}</span>
          <strong>{initialMassKg != null ? initialMassKg.toFixed(3) : '—'}<em>{initialMassKg != null ? 'kg' : ''}</em></strong>
          <small>{txt('MASA TOTAL','TOTAL MASS')}</small>
        </article>
        <article className="flight-metric-card secondary">
          <span className="flight-symbol">T<sub>vuelo</sub></span>
          <strong>{analysis.landing_time_s != null ? analysis.landing_time_s.toFixed(2) : samples[samples.length - 1].t_s.toFixed(2)}<em>s</em></strong>
          <small>{txt('TIEMPO TOTAL DE VUELO','TOTAL FLIGHT TIME')}</small>
        </article>
      </div>
    </section>

    <section className="flight-dashboard-section">
      <div className="flight-section-head">
        <span>02</span>
        <div>
          <strong>{txt('MÉTRICAS COMPLEMENTARIAS', 'SUPPLEMENTARY METRICS')}</strong>
          <small>{txt('CARGA Y RÉGIMEN', 'LOAD AND REGIME')}</small>
        </div>
      </div>

      <div className="flight-square-grid">
        <article className="flight-metric-card">
          <span className="flight-symbol">G<sub>max</sub></span>
          <strong>{gMax.toFixed(2)}<em>g</em></strong>
          <small>{txt('ACELERACIÓN MÁXIMA','MAX ACCELERATION')}</small>
        </article>
        <article className="flight-metric-card">
          <span className="flight-symbol">M<sub>max</sub></span>
          <strong>{machMax.toFixed(3)}</strong>
          <small>{txt('MACH MÁXIMO','MAX MACH')}</small>
        </article>
        <article className="flight-metric-card">
          <span className="flight-symbol">REC</span>
          <strong className="status-value">{analysis.deployment_time_s != null ? txt('OK', 'OK') : txt('—', '—')}</strong>
          <small>{txt('PARACAÍDAS','PARACHUTE')}</small>
          
        </article>
        <article className="flight-metric-card">
          <span className="flight-symbol">t<sub>h&gt;hreq</sub></span>
          <strong>{timeAboveHReq == null ? '—' : timeAboveHReq.toFixed(2)}<em>{timeAboveHReq == null ? '' : 's'}</em></strong>
          <small>{txt('TIEMPO SOBRE ALTURA REQUERIDA','TIME ABOVE REQUIRED ALTITUDE')}</small>
          
        </article>
      </div>
    </section>

    <section className="flight-dashboard-section burnout-section">
      <div className="flight-section-head">
        <span>03</span>
        <div>
          <strong>{txt('FIN DE COMBUSTIÓN', 'BURNOUT')}</strong>
          <small>BURNOUT</small>
        </div>
      </div>

      <div className="burnout-square-grid">
        <article className="flight-metric-card burnout-card">
          <span className="flight-symbol">t<sub>B</sub></span>
          <strong>{motorBurnTimeS.toFixed(2)}<em>s</em></strong>
          <small>{txt('TIEMPO','TIME')}</small>
        </article>
        <article className="flight-metric-card burnout-card">
          <span className="flight-symbol">H<sub>B</sub></span>
          <strong>{burnoutSample ? burnoutSample.altitude_m.toFixed(1) : '—'}<em>{burnoutSample ? 'm' : ''}</em></strong>
          <small>{txt('ALTURA','ALTITUDE')}</small>
        </article>
        <article className="flight-metric-card burnout-card">
          <span className="flight-symbol">V<sub>B</sub></span>
          <strong>{burnoutSample ? burnoutSample.speed_m_s.toFixed(1) : '—'}<em>{burnoutSample ? 'm/s' : ''}</em></strong>
          <small>{txt('VELOCIDAD','SPEED')}</small>
        </article>
      </div>
    </section>

    <section className="performance-index performance-clean">
      <strong>{txt('PERFORMANCE GLOBAL', 'GLOBAL PERFORMANCE')}</strong>
      <div className="performance-score"><b>{performance}</b><span>/100</span></div>
      <div className="performance-meter" aria-label={txt('Performance global', 'Global performance')}><i style={{ width: performance + '%' }}/></div>
    </section>

    <div className="flight-chart-picker-head">
      <span>{txt('SELECCIONÁ VARIABLE', 'SELECT VARIABLE')}</span>
      <strong>{tabs.find(([key]) => key === active)?.[1]}</strong>
    </div>
    <div className="flight-chart-tabs" role="tablist" aria-label={txt('Variables de vuelo', 'Flight variables')}>
      {tabs.map(([key, label]) => <button
        key={key}
        type="button"
        role="tab"
        aria-selected={active === key}
        className={active === key ? 'flight-chart-tab active' : 'flight-chart-tab'}
        onClick={() => setActive(key)}
      >{label}</button>)}
    </div>

    <div className="flight-chart-toolbar aero-toolbar" aria-label={txt('Herramientas del gráfico', 'Chart tools')}>
      {!isMobile && <>
        <button type="button" className={dragMode === 'zoom' ? 'active' : ''} onClick={() => setInteraction('zoom')} title={txt('Zoom por selección', 'Box zoom')} aria-label={txt('Zoom por selección', 'Box zoom')}><ZoomIn size={16}/></button>
        <button type="button" className={dragMode === 'pan' ? 'active' : ''} onClick={() => setInteraction('pan')} title={txt('Desplazar gráfico', 'Pan plot')} aria-label={txt('Desplazar gráfico', 'Pan plot')}><Move size={16}/></button>
        <button type="button" onClick={autoScale} title={txt('Ajustar automáticamente', 'Autoscale')} aria-label={txt('Ajustar automáticamente', 'Autoscale')}><ScanSearch size={16}/></button>
        <button type="button" onClick={resetView} title={txt('Restablecer vista', 'Reset view')} aria-label={txt('Restablecer vista', 'Reset view')}><RotateCcw size={16}/></button>
      </>}
      <button type="button" className="chart-tool-preview" onClick={previewPng} title={txt('Vista previa PNG', 'Preview PNG')} aria-label={txt('Vista previa PNG', 'Preview PNG')}><Eye size={16}/></button>
      <button type="button" className="chart-tool-export" onClick={savePng} title={txt('Descargar PNG', 'Download PNG')} aria-label={txt('Descargar PNG', 'Download PNG')}><Download size={16}/></button>
    </div>

    <div className="flight-chart-frame">
      <Plot
        data={[chart.trace as any]}
        layout={{
          title: { text: chart.title, font: { size: 14, color: '#dce9ff' }, x: .02, xanchor: 'left' },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: '#081321',
          font: { family: 'Space Grotesk, sans-serif', color: '#9ab0d2', size: 11 },
          margin: { l: 66, r: 22, t: 56, b: 58 },
          hovermode: active === 'trajectory' ? 'closest' : 'x unified',
          xaxis: {
            title: { text: chart.xTitle, font: { size: 10, color: '#819cc4' } },
            gridcolor: 'rgba(79,107,149,.18)',
            zerolinecolor: 'rgba(79,107,149,.28)',
            linecolor: '#29415f',
            tickfont: { color: '#7f96b8' },
            fixedrange: isMobile,
          },
          yaxis: {
            title: { text: chart.yTitle, font: { size: 10, color: '#819cc4' } },
            gridcolor: 'rgba(79,107,149,.18)',
            zerolinecolor: 'rgba(79,107,149,.28)',
            linecolor: '#29415f',
            tickfont: { color: '#7f96b8' },
            fixedrange: isMobile,
          },
          shapes: chart.shapes as any,
          annotations: chart.annotations as any,
          showlegend: false,
          autosize: true,
        }}
        config={{
          responsive: true,
          displaylogo: false,
          displayModeBar: false,
          scrollZoom: !isMobile,
        }}
        onInitialized={(_, graphDiv) => { graphRef.current = graphDiv; }}
        onUpdate={(_, graphDiv) => { graphRef.current = graphDiv; }}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
      />
    </div>

    <div className="flight-chart-footer">
      <span>{isMobile ? txt('MODO MÓVIL: GRÁFICO BLOQUEADO PARA EVITAR DESPLAZAMIENTOS', 'MOBILE MODE: PLOT LOCKED TO PREVENT ACCIDENTAL MOVEMENT') : txt('RUEDA: ZOOM · ARRASTRAR: PAN · HOVER: LECTURA EXACTA', 'WHEEL: ZOOM · DRAG: PAN · HOVER: EXACT READOUT')}</span>
      <strong>{txt('EVENTOS: FIN DE COMBUSTIÓN · Burnout · Qmáx · Hmáx · DESPLIEGUE', 'EVENTS: BURNOUT · Qmax · Hmax · DEPLOY')}</strong>
    </div>

    {previewUrl && <div className="chart-preview-backdrop" role="dialog" aria-modal="true" aria-label={txt('Vista previa del gráfico', 'Chart preview')}>
      <div className="chart-preview-modal">
        <div className="chart-preview-head">
          <div><span>{txt('VISTA PREVIA PARA IMPRESIÓN', 'PRINT PREVIEW')}</span><strong>{previewName}</strong></div>
          <button type="button" onClick={closePreview} aria-label={txt('Cerrar vista previa', 'Close preview')}>×</button>
        </div>
        <div className="chart-preview-canvas"><img src={previewUrl} alt={txt('Gráfico técnico TRAJECTUM', 'TRAJECTUM engineering plot')} /></div>
        <div className="chart-preview-actions">
          <button type="button" onClick={closePreview}>{txt('VOLVER', 'BACK')}</button>
          <button type="button" className="primary" onClick={savePng}>⇩ {txt('DESCARGAR PNG', 'DOWNLOAD PNG')}</button>
        </div>
      </div>
    </div>}
  </section>;
}
