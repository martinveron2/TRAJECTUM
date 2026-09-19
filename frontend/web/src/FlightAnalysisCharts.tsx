import React, { useMemo, useRef, useState } from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';
import Plotly from 'plotly.js-basic-dist-min';
import type { MissionSample } from './FlightVisualizer';

const Plot = createPlotlyComponent(Plotly as any);

type AnalysisMeta = {
  time_to_apogee_s?: number;
  deployment_time_s?: number | null;
  landing_time_s?: number;
};

type Props = {
  samples: MissionSample[];
  motorBurnTimeS: number;
  analysis: AnalysisMeta;
  lang?: 'es' | 'en';
};

type ChartKey = 'altitude' | 'speed' | 'mach' | 'q' | 'trajectory';

export function FlightAnalysisCharts({ samples, motorBurnTimeS, analysis, lang = 'es' }: Props) {
  const [active, setActive] = useState<ChartKey>('altitude');
  const [dragMode, setDragMode] = useState<'zoom' | 'pan'>('zoom');
  const graphRef = useRef<any>(null);
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

  const eventShapes = useMemo(() => {
    const events = [
      { x: motorBurnTimeS, label: txt('FIN COMB.', 'BURNOUT') },
      { x: samples[maxQIndex]?.t_s, label: 'MAX Q' },
      { x: analysis.time_to_apogee_s, label: txt('APOGEO', 'APOGEE') },
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
    ['q', 'MAX Q'],
    ['trajectory', txt('TRAYECTORIA', 'TRAJECTORY')],
  ];

  const setInteraction = (mode: 'zoom' | 'pan') => {
    setDragMode(mode);
    if (graphRef.current) Plotly.relayout(graphRef.current, { dragmode: mode });
  };
  const autoScale = () => graphRef.current && Plotly.relayout(graphRef.current, { 'xaxis.autorange': true, 'yaxis.autorange': true });
  const resetView = () => graphRef.current && Plotly.relayout(graphRef.current, { 'xaxis.autorange': true, 'yaxis.autorange': true, dragmode: dragMode });
  const savePng = () => graphRef.current && Plotly.downloadImage(graphRef.current, { format: 'png', filename: 'trajectum-' + active, width: 1600, height: 900, scale: 1 });

  if (!samples.length) return null;

  return <section className="panel flight-analysis-panel">
    <div className="panel-title compact">
      <div>
        <p>{txt('ANÁLISIS DE VUELO', 'FLIGHT ANALYSIS')}</p>
        <h2>{txt('Gráficos de ingeniería', 'Engineering plots')}</h2>
      </div>
      <span className="plotly-badge">PLOTLY · INTERACTIVE</span>
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

    <div className="flight-chart-toolbar" aria-label={txt('Herramientas del gráfico', 'Chart tools')}>
      <button type="button" className={dragMode === 'zoom' ? 'active' : ''} onClick={() => setInteraction('zoom')} title={txt('Arrastrar para ampliar una zona', 'Drag to zoom into an area')}>⌕ <span>{txt('ZOOM', 'ZOOM')}</span></button>
      <button type="button" className={dragMode === 'pan' ? 'active' : ''} onClick={() => setInteraction('pan')} title={txt('Arrastrar para desplazar el gráfico', 'Drag to pan the plot')}>✥ <span>PAN</span></button>
      <button type="button" onClick={autoScale} title={txt('Ajustar automáticamente los ejes', 'Autoscale axes')}>↔ <span>{txt('AJUSTAR', 'AUTOSCALE')}</span></button>
      <button type="button" onClick={resetView} title={txt('Restablecer vista', 'Reset view')}>↺ <span>{txt('RESET', 'RESET')}</span></button>
      <button type="button" className="chart-tool-export" onClick={savePng} title={txt('Descargar gráfico actual en PNG', 'Download current plot as PNG')}>⇩ <span>{txt('DESCARGAR PNG', 'DOWNLOAD PNG')}</span></button>
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
          },
          yaxis: {
            title: { text: chart.yTitle, font: { size: 10, color: '#819cc4' } },
            gridcolor: 'rgba(79,107,149,.18)',
            zerolinecolor: 'rgba(79,107,149,.28)',
            linecolor: '#29415f',
            tickfont: { color: '#7f96b8' },
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
          scrollZoom: true,
        }}
        onInitialized={(_, graphDiv) => { graphRef.current = graphDiv; }}
        onUpdate={(_, graphDiv) => { graphRef.current = graphDiv; }}
        useResizeHandler
        style={{ width: '100%', height: '460px' }}
      />
    </div>

    <div className="flight-chart-footer">
      <span>{txt('RUEDA: ZOOM · ARRASTRAR: PAN · HOVER: LECTURA EXACTA', 'WHEEL: ZOOM · DRAG: PAN · HOVER: EXACT READOUT')}</span>
      <strong>{txt('EVENTOS: FIN COMB. · MAX Q · APOGEO · DESPLIEGUE', 'EVENTS: BURNOUT · MAX Q · APOGEE · DEPLOY')}</strong>
    </div>
  </section>;
}
