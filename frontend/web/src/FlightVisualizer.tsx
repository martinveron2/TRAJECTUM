import React, { useEffect, useMemo, useState } from 'react';

export type MissionSample = {
  t_s: number;
  phase: string;
  x_m: number;
  altitude_m: number;
  speed_m_s: number;
  vertical_speed_m_s: number;
  mach: number;
  q_pa: number;
  acceleration_g: number;
  parachute_deployed: boolean;
};

export function FlightVisualizer({ samples, launchAngleDeg = 85, onLaunchAngleChange, lang = 'es' }: { samples: MissionSample[]; launchAngleDeg?: number; onLaunchAngleChange?: (angle: number) => void; lang?: 'es' | 'en' }) {
  const isEs = lang === 'es';
  const txt = (es: string, en: string) => isEs ? es : en;
  const phaseLabel = (phase: string) => !isEs ? phase : ({ BOOST: 'IMPULSO', COAST: 'ASCENSO LIBRE', APOGEE: 'APOGEO', DESCENT: 'DESCENSO', PARACHUTE: 'PARACAÍDAS', RECOVERY: 'RECUPERACIÓN', LANDED: 'ATERRIZADO' } as Record<string,string>)[phase] ?? phase;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(4);
  const [angleUnlocked, setAngleUnlocked] = useState(false);

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
  const engineeringScale = Math.min(676 / Math.max(maxRange, 1), 250 / Math.max(maxAltitude, 1));
  const originX = 92;
  const originY = 300;
  const plotPoints = useMemo(() => samples.map((s) => {
    const x = originX + s.x_m * engineeringScale;
    const y = originY - s.altitude_m * engineeringScale;
    return `${x},${y}`;
  }), [samples, engineeringScale]);
  const plot = plotPoints.join(' ');
  const traversedPlot = plotPoints.slice(0, Math.max(index + 1, 1)).join(' ');
  const maxQSample = useMemo(() => samples.reduce((best, sample) => sample.q_pa > best.q_pa ? sample : best, samples[0]), [samples]);

  if (!current) return null;

  const rocketX = originX + current.x_m * engineeringScale;
  const rocketY = originY - current.altitude_m * engineeringScale;
  const horizontalSpeed = Math.sqrt(Math.max(current.speed_m_s ** 2 - current.vertical_speed_m_s ** 2, 0));
  const flightAngle = current.parachute_deployed
    ? -90
    : Math.atan2(current.vertical_speed_m_s, Math.max(horizontalSpeed, 1e-6)) * 180 / Math.PI;
  const svgRotation = 90 - flightAngle;
  const progress = samples.length <= 1 ? 0 : index / (samples.length - 1);

  return <div className="panel flight-visualizer">
    <div className="panel-title compact">
      <div><p>{txt('VISUALIZADOR DE MISIÓN', 'MISSION VISUALIZER')}</p><h2>{txt('Reproducción del vuelo segundo a segundo', 'Second-by-second flight playback')}</h2></div>
      <span className={playing ? "live-badge flight-live" : "live-badge"}>{playing ? txt('REPRODUCIENDO', 'PLAYING') : phaseLabel(current.phase)}</span>
    </div>

    <div className="flight-angle-control">
      <div>
        <span>{txt('ÁNGULO DE LANZAMIENTO', 'LAUNCH ANGLE')}</span>
        <strong>{launchAngleDeg.toFixed(1)}°</strong>
        <small>{angleUnlocked ? txt('EDITABLE · recalcula la corrida', 'EDITABLE · recalculates run') : txt('BLOQUEADO POR DEFECTO', 'LOCKED BY DEFAULT')}</small>
      </div>
      <button type="button" className={angleUnlocked ? 'active' : ''} onClick={() => setAngleUnlocked((value) => !value)}>
        {angleUnlocked ? txt('BLOQUEAR', 'LOCK') : txt('EDITAR', 'EDIT')}
      </button>
      <input
        aria-label={txt('Ángulo de lanzamiento', 'Launch angle')}
        type="range"
        min="75"
        max="90"
        step="0.5"
        value={launchAngleDeg}
        disabled={!angleUnlocked}
        onChange={(event) => onLaunchAngleChange?.(Number(event.target.value))}
      />
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
        <line x1={originX} y1="45" x2={originX} y2="300" className="flight-axis"/>
        <line
          x1={originX}
          y1={originY}
          x2={originX + Math.cos(launchAngleDeg * Math.PI / 180) * 92}
          y2={originY - Math.sin(launchAngleDeg * Math.PI / 180) * 92}
          className="launch-guide"
        />
        <text x={originX + 14} y={originY - 86} className="flight-label">{txt('LANZAMIENTO', 'LAUNCH')} {launchAngleDeg.toFixed(0)}°</text>
        <polyline points={plot} fill="none" className="trajectory-line trajectory-line-full"/>
        <polyline points={traversedPlot} fill="none" className="trajectory-line trajectory-line-live"/>
        <text x="54" y="62" className="flight-label">{txt('APOGEO', 'APOGEE')} {maxAltitude.toFixed(1)} m</text>
        <text x="54" y="322" className="flight-label">{txt('ALCANCE', 'RANGE')} {maxRange.toFixed(1)} m · {txt('modelo de recuperación vertical después del apogeo', 'vertical recovery model after apogee')}</text>

        {current.parachute_deployed && <>
          <path d={`M ${rocketX-18} ${rocketY-28} Q ${rocketX} ${rocketY-48} ${rocketX+18} ${rocketY-28}`} className="parachute-canopy"/>
          <line x1={rocketX-16} y1={rocketY-27} x2={rocketX-5} y2={rocketY-10} className="parachute-line"/>
          <line x1={rocketX+16} y1={rocketY-27} x2={rocketX+5} y2={rocketY-10} className="parachute-line"/>
        </>}

        <g transform={`translate(${rocketX} ${rocketY}) rotate(${svgRotation})`} filter="url(#rocketGlow)">
          <path d="M 0 -13 L 6 -2 L 6 10 L -6 10 L -6 -2 Z" className="flight-rocket"/>
          <path d="M -6 5 L -11 11 L -6 10 Z M 6 5 L 11 11 L 6 10 Z" className="flight-rocket-fin"/>
          {current.phase === 'BOOST' && <path d="M -3 10 L 0 22 L 3 10 Z" className="flight-flame"/>}
        </g>
      </svg>

      <div className="flight-telemetry">
        <div><span>{txt('ÁNGULO REAL', 'REAL ANGLE')}</span><strong>{launchAngleDeg.toFixed(1)}°</strong></div>
        <div><span>{txt('TIEMPO', 'TIME')}</span><strong>{current.t_s.toFixed(2)} s</strong></div>
        <div><span>{txt('ALTITUD', 'ALTITUDE')}</span><strong>{current.altitude_m.toFixed(1)} m</strong></div>
        <div><span>{txt('VELOCIDAD', 'SPEED')}</span><strong>{current.speed_m_s.toFixed(1)} m/s</strong></div>
        <div><span>Q</span><strong>{current.q_pa.toFixed(0)} Pa</strong></div>
        <div><span>MAX Q</span><strong>{maxQSample.q_pa.toFixed(0)} Pa</strong></div>
        <div><span>{txt('APOGEO', 'APOGEE')}</span><strong>{maxAltitude.toFixed(1)} m</strong></div>
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
