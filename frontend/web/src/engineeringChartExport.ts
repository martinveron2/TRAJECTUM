import type { MissionSample } from './missionTypes';

type AnalysisMeta = {
  time_to_apogee_s?: number;
  deployment_time_s?: number | null;
};

type XlsxImage = {
  content: ArrayBuffer;
  contentType: 'image/png';
  width: number;
  height: number;
  dpi: number;
  anchor: { row: number; column: number };
  title: string;
  description: string;
};

const dataUrlToArrayBuffer = (dataUrl: string) => {
  const base64 = dataUrl.split(',')[1] ?? '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

const plotLayout = (title: string, xTitle: string, yTitle: string, shapes: any[] = [], annotations: any[] = []) => ({
  width: 1600,
  height: 900,
  title: { text: title, x: .03, xanchor: 'left', font: { size: 32, color: '#10233f' } },
  paper_bgcolor: '#ffffff',
  plot_bgcolor: '#ffffff',
  font: { family: 'Arial, sans-serif', color: '#21354f', size: 20 },
  margin: { l: 126, r: 56, t: 118, b: 106 },
  showlegend: false,
  xaxis: {
    title: { text: xTitle, font: { size: 22, color: '#17365d' } },
    tickfont: { size: 18, color: '#2d4058' },
    gridcolor: '#dbe4ee',
    linecolor: '#7d8fa5',
    zerolinecolor: '#9aa9ba',
  },
  yaxis: {
    title: { text: yTitle, font: { size: 22, color: '#17365d' } },
    tickfont: { size: 18, color: '#2d4058' },
    gridcolor: '#dbe4ee',
    linecolor: '#7d8fa5',
    zerolinecolor: '#9aa9ba',
  },
  shapes,
  annotations,
});

export async function buildEngineeringChartImages(
  samples: MissionSample[],
  motorBurnTimeS: number,
  analysis: AnalysisMeta,
): Promise<{ summary: XlsxImage[]; trajectory: XlsxImage[]; files: Array<{ filename: string; buffer: ArrayBuffer }> }> {
  if (!samples.length) return { summary: [], trajectory: [], files: [] };

  const mod = await import('plotly.js-basic-dist-min');
  const Plotly = mod.default ?? mod;
  const root = document.createElement('div');
  root.style.position = 'fixed';
  root.style.left = '-10000px';
  root.style.top = '0';
  root.style.width = '1100px';
  root.style.height = '620px';
  root.style.pointerEvents = 'none';
  root.setAttribute('aria-hidden', 'true');
  document.body.appendChild(root);

  const maxQIndex = samples.reduce((best, sample, index) => sample.q_pa > samples[best].q_pa ? index : best, 0);
  const eventSpecs = [
    { x: motorBurnTimeS, label: 'FIN COMB.' },
    { x: samples[maxQIndex]?.t_s, label: 'MAX Q' },
    { x: analysis.time_to_apogee_s, label: 'APOGEO' },
    { x: analysis.deployment_time_s ?? undefined, label: 'DESPLIEGUE' },
  ].filter((event): event is { x: number; label: string } => Number.isFinite(event.x));

  const shapes = eventSpecs.map((event) => ({
    type: 'line',
    x0: event.x, x1: event.x, y0: 0, y1: 1, yref: 'paper',
    line: { width: 2, dash: 'dot', color: '#557aa8' },
  }));
  const annotations = eventSpecs.map((event, index) => ({
    x: event.x, y: index % 2 === 0 ? 1.02 : .94, yref: 'paper',
    text: event.label, showarrow: false, font: { size: 16, color: '#315f91' }, xanchor: 'left',
  }));

  const times = samples.map((s) => s.t_s);
  const definitions = [
    { title: 'ALTITUD VS TIEMPO', x: times, y: samples.map((s) => s.altitude_m), xTitle: 'TIEMPO [s]', yTitle: 'ALTITUD [m]', events: true },
    { title: 'VELOCIDAD VS TIEMPO', x: times, y: samples.map((s) => s.speed_m_s), xTitle: 'TIEMPO [s]', yTitle: 'VELOCIDAD [m/s]', events: true },
    { title: 'MACH VS TIEMPO', x: times, y: samples.map((s) => s.mach), xTitle: 'TIEMPO [s]', yTitle: 'MACH', events: true },
    { title: 'PRESIÓN DINÁMICA VS TIEMPO', x: times, y: samples.map((s) => s.q_pa / 1000), xTitle: 'TIEMPO [s]', yTitle: 'q [kPa]', events: true },
    { title: 'TRAYECTORIA X–Z', x: samples.map((s) => s.x_m), y: samples.map((s) => s.altitude_m), xTitle: 'DISTANCIA HORIZONTAL [m]', yTitle: 'ALTITUD [m]', events: false },
  ];

  try {
    const rendered: Array<{ title: string; buffer: ArrayBuffer }> = [];
    for (const definition of definitions) {
      await Plotly.react(root, [{
        type: 'scatter',
        mode: 'lines',
        x: definition.x,
        y: definition.y,
        line: { width: 4, color: '#145da0' },
        hoverinfo: 'skip',
      }], plotLayout(
        definition.title,
        definition.xTitle,
        definition.yTitle,
        definition.events ? shapes : [],
        definition.events ? annotations : [],
      ), { displayModeBar: false, responsive: false, staticPlot: true });

      const dataUrl = await Plotly.toImage(root, { format: 'png', width: 1600, height: 900, scale: 1 });
      rendered.push({ title: definition.title, buffer: dataUrlToArrayBuffer(dataUrl) });
    }

    const toImage = (item: { title: string; buffer: ArrayBuffer }, row: number, column: number): XlsxImage => ({
      content: item.buffer,
      contentType: 'image/png',
      width: 825,
      height: 465,
      dpi: 120,
      anchor: { row, column },
      title: 'TRAJECTUM — ' + item.title,
      description: 'Gráfico técnico exportado por TRAJECTUM: ' + item.title,
    });

    const filenames = ['altitud-tiempo', 'velocidad-tiempo', 'mach-tiempo', 'max-q-tiempo', 'trayectoria-x-z'];
    return {
      summary: [toImage(rendered[0], 2, 4), toImage(rendered[4], 26, 4)],
      trajectory: rendered.map((item, index) => toImage(item, 2 + index * 25, 11)),
      files: rendered.map((item, index) => ({ filename: 'TRAJECTUM_' + filenames[index] + '.png', buffer: item.buffer })),
    };
  } finally {
    try { Plotly.purge(root); } catch {}
    root.remove();
  }
}
