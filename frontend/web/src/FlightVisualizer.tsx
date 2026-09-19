import React, { useEffect, useMemo, useState } from 'react';

export type MissionSample = {
  t_s: number;
  phase: string;
  x_m: number;
  altitude_m: number;
  speed_m_s: number;
  vertical_speed_m_s: number;
  q_pa: number;
  parachute_deployed: boolean;
};

export function FlightVisualizer({ samples, lang = 'es' }: { samples: MissionSample[]; lang?: 'es' | 'en' }) {
  const isEs = lang === 'es';
  const txt = (es: string, en: string) => isEs ? es : en;
  const phaseLabel = (phase: string) => {
    if (!isEs) return phase;
    return ({ BOOST: 'IMPULSO', COAST: 'ASCENSO LIBRE', APOGEE: 'APOGEO', DESCENT: 'DESCENSO', RECOVERY: 'RECUPERACIÓN', LANDED: 'ATERRIZADO' } as Record<string, string>)[phase] ?? phase;
  };
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(4);

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [samples]);

  useEffect(() => {
    if (!playing || samples.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((current) => {
        if (current >= samples.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, Math.max(80, 1000 / rate));
    return () => window.clearInterval(timer);
  }, [playing, rate, samples.length]);

  const current = samples[Math.min(index, Math.max(samples.length - 1, 0))];
  const maxAltitude = Math.max(...samples.map((s) => s.altitude_m), 1);
  const maxRange = Math.max(...samples.map((s) => s.x_m), 1);
  const plot = useMemo(() => samples.map((s) => {
    const x = 42 + (s.x_m / maxRange) * 676;
    const y = 300 - (s.altitude_m / maxAltitude) * 250;
    return `${x},${y}`;
  }).join(' '), [samples, maxAltitude, maxRange]);

  if (!current) return null;

  const rocketX = 42 + (current.x_m / maxRange) * 676;
  const rocketY = 300 - (current.altitude_m / maxAltitude) * 250;
  const progress = samples.length <= 1 ? 0 : index / (samples.length - 1);

  return <div className="panel flight-visualizer">
    <div className="panel-title compact">
      <div><p>{txt('VISUALIZADOR DE MISIÓN', 'MISSION VISUALIZER')}</p><h2>{txt('Reproducción del vuelo segundo a segundo', 'Second-by-second flight playback')}</h2></div>
      <span className={playing ? "live-badge flight-live" : "live-badge"}>{playing ? txt('REPRODUCIENDO', 'PLAYING') : phaseLabel(current.phase)}</span>
    </div>

    <div className="flight-stage">
      <svg viewBox="0 0 760 340" role="img" aria-label={txt('Visualizador de trayectoria de vuelo', 'Flight trajectory visualizer')}>
        <defs>
          <linearGradient id="skyFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#071225"/>
            <stop offset="100%" stopColor="#0c2037"/>
          </linearGradient>
          <filter id="rocketGlow"><feGaussianBlur stdDeviation="2.3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <rect x="0" y="0" width="760" height="340" rx="12" fill="url(#skyFade)"/>
        <line x1="30" y1="300" x2="735" y2="300" className="ground-line"/>
        <line x1="42" y1="45" x2="42" y2="300" className="flight-axis"/>
        <polyline points={plot} fill="none" className="trajectory-line"/>
        <text x="54" y="62" className="flight-label">{txt('APOGEO', 'APOGEE')} {maxAltitude.toFixed(1)} m</text>
        <text x="54" y="322" className="flight-label">{txt('ALCANCE', 'RANGE')} {maxRange.toFixed(1)} m · {txt('modelo de recuperación vertical después del apogeo', 'vertical recovery model after apogee')}</text>

        {current.parachute_deployed && <>
          <path d={`M ${rocketX-18} ${rocketY-28} Q ${rocketX} ${rocketY-48} ${rocketX+18} ${rocketY-28}`} className="parachute-canopy"/>
          <line x1={rocketX-16} y1={rocketY-27} x2={rocketX-5} y2={rocketY-10} className="parachute-line"/>
          <line x1={rocketX+16} y1={rocketY-27} x2={rocketX+5} y2={rocketY-10} className="parachute-line"/>
        </>}

        <g transform={`translate(${rocketX} ${rocketY})`} filter="url(#rocketGlow)">
          <path d="M 0 -13 L 6 -2 L 6 10 L -6 10 L -6 -2 Z" className="flight-rocket"/>
          <path d="M -6 5 L -11 11 L -6 10 Z M 6 5 L 11 11 L 6 10 Z" className="flight-rocket-fin"/>
          {current.phase === 'BOOST' && <path d="M -3 10 L 0 22 L 3 10 Z" className="flight-flame"/>}
        </g>
      </svg>

      <div className="flight-telemetry">
        <div><span>{txt('TIEMPO', 'TIME')}</span><strong>{current.t_s.toFixed(2)} s</strong></div>
        <div><span>{txt('ALTITUD', 'ALTITUDE')}</span><strong>{current.altitude_m.toFixed(1)} m</strong></div>
        <div><span>{txt('VELOCIDAD', 'SPEED')}</span><strong>{current.speed_m_s.toFixed(1)} m/s</strong></div>
        <div><span>{txt('V VERTICAL', 'VERTICAL V')}</span><strong>{current.vertical_speed_m_s.toFixed(1)} m/s</strong></div>
        <div><span>Q</span><strong>{current.q_pa.toFixed(0)} Pa</strong></div>
        <div><span>{txt('FASE', 'PHASE')}</span><strong>{phaseLabel(current.phase)}</strong></div>
      </div>
    </div>

    <div className="flight-controls">
      <button onClick={() => setPlaying((value) => !value)}>{playing ? txt('PAUSA', 'PAUSE') : txt('REPRODUCIR', 'PLAY')}</button>
      <button onClick={() => { setIndex(0); setPlaying(false); }}>{txt('REINICIAR', 'RESTART')}</button>
      <input
        aria-label={txt('Línea de tiempo de la misión', 'Mission timeline')}
        type="range"
        min={0}
        max={Math.max(samples.length - 1, 0)}
        value={index}
        onChange={(e) => { setPlaying(false); setIndex(Number(e.target.value)); }}
      />
      <select value={rate} onChange={(e) => setRate(Number(e.target.value))}>
        <option value={1}>1×</option>
        <option value={2}>2×</option>
        <option value={4}>4×</option>
        <option value={8}>8×</option>
      </select>
      <span>{Math.round(progress * 100)}%</span>
    </div>
  </div>;
}
