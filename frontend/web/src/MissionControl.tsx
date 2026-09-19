import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, X, Gauge, Rocket, Activity } from 'lucide-react';
import type { MissionSample } from './FlightVisualizer';

type AnalysisLike = {
  apogee_m?: number;
  time_to_apogee_s?: number;
  deployment_time_s?: number | null;
  deployment_altitude_m?: number | null;
};

type Props = {
  samples: MissionSample[];
  motorBurnTimeS: number;
  analysis: AnalysisLike;
  lang?: 'es' | 'en';
  onClose: () => void;
  onViewResults: () => void;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function MissionControl({ samples, motorBurnTimeS, analysis, lang = 'es', onClose, onViewResults }: Props) {
  const isEs = lang === 'es';
  const txt = (es: string, en: string) => isEs ? es : en;
  const [timeS, setTimeS] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [rate, setRate] = useState(1);
  const frameRef = useRef<number | null>(null);
  const lastRealRef = useRef<number | null>(null);
  const endTime = samples.length ? samples[samples.length - 1].t_s : 0;

  useEffect(() => {
    setTimeS(0);
    setPlaying(true);
    lastRealRef.current = null;
  }, [samples]);

  useEffect(() => {
    if (!playing || endTime <= 0) return;
    const tick = (now: number) => {
      const last = lastRealRef.current ?? now;
      const dt = Math.min((now - last) / 1000, 0.08);
      lastRealRef.current = now;
      setTimeS((current) => {
        const next = Math.min(current + dt * rate, endTime);
        if (next >= endTime) setPlaying(false);
        return next;
      });
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
      lastRealRef.current = null;
    };
  }, [playing, rate, endTime]);

  const current = useMemo(() => {
    if (!samples.length) return null;
    let hi = samples.findIndex((sample) => sample.t_s >= timeS);
    if (hi < 0) hi = samples.length - 1;
    const lo = Math.max(0, hi - 1);
    const a = samples[lo];
    const b = samples[hi];
    const span = Math.max(b.t_s - a.t_s, 1e-9);
    const f = hi === lo ? 0 : Math.min(Math.max((timeS - a.t_s) / span, 0), 1);
    return {
      t_s: timeS,
      phase: f < .5 ? a.phase : b.phase,
      x_m: lerp(a.x_m, b.x_m, f),
      altitude_m: lerp(a.altitude_m, b.altitude_m, f),
      speed_m_s: lerp(a.speed_m_s, b.speed_m_s, f),
      vertical_speed_m_s: lerp(a.vertical_speed_m_s, b.vertical_speed_m_s, f),
      mach: lerp(a.mach, b.mach, f),
      q_pa: lerp(a.q_pa, b.q_pa, f),
      acceleration_g: lerp(a.acceleration_g ?? 0, b.acceleration_g ?? 0, f),
      parachute_deployed: f < .5 ? a.parachute_deployed : b.parachute_deployed,
    };
  }, [samples, timeS]);

  if (!current) return null;

  const maxAltitude = Math.max(...samples.map((s) => s.altitude_m), 1);
  const altitudeRatio = Math.min(Math.max(current.altitude_m / maxAltitude, 0), 1);
  const rocketY = 420 - altitudeRatio * 330;
  const phaseMap: Record<string,string> = {
    BOOST: txt('ASCENSO PROPULSADO', 'POWERED ASCENT'),
    COAST: txt('ASCENSO LIBRE', 'COAST'),
    APOGEE: txt('APOGEO', 'APOGEE'),
    DESCENT: txt('DESCENSO', 'DESCENT'),
    PARACHUTE: txt('PARACAÍDAS', 'PARACHUTE'),
    LANDED: txt('ATERRIZADO', 'LANDED'),
  };
  const events = [
    { key: 'ignition', time: 0, label: txt('IGNICIÓN', 'IGNITION'), detail: 'T+0.0 s' },
    { key: 'burnout', time: motorBurnTimeS, label: 'BURNOUT', detail: 'T+' + motorBurnTimeS.toFixed(2) + ' s' },
    { key: 'apogee', time: analysis.time_to_apogee_s ?? Infinity, label: txt('APOGEO ALCANZADO', 'APOGEE REACHED'), detail: (analysis.apogee_m ?? maxAltitude).toFixed(1) + ' m' },
    { key: 'deploy', time: analysis.deployment_time_s ?? Infinity, label: txt('DESPLIEGUE PARACAÍDAS', 'PARACHUTE DEPLOY'), detail: analysis.deployment_altitude_m != null ? analysis.deployment_altitude_m.toFixed(1) + ' m' : '' },
  ];

  const clock = 'T+' + timeS.toFixed(1).padStart(5, '0') + 's';

  return <div className="mission-control" role="dialog" aria-modal="true" aria-label={txt('Centro de control de simulación de vuelo', 'Flight simulation control center')}>
    <div className="mission-control-shell">
      <header className="mission-header">
        <div className="mission-brand">
          <Rocket size={24} strokeWidth={1.7} />
          <div><span>TRAJECTUM · {txt('MODO MISIÓN', 'MISSION MODE')}</span><strong>{txt('CENTRO DE CONTROL DE VUELO', 'FLIGHT CONTROL CENTER')}</strong></div>
        </div>
        <div className="mission-clock"><small>{txt('TIEMPO DE VUELO', 'FLIGHT TIME')}</small><strong>{clock}</strong></div>
        <button type="button" className="mission-close" onClick={onClose} aria-label={txt('Cerrar', 'Close')}><X size={22} /></button>
      </header>

      <div className="mission-statusline">
        <span className={playing ? 'live' : ''}><i />{playing ? txt('SIMULACIÓN EN VIVO', 'LIVE SIMULATION') : txt('SIMULACIÓN EN PAUSA', 'SIMULATION PAUSED')}</span>
        <strong>{phaseMap[current.phase] ?? current.phase}</strong>
      </div>

      <main className="mission-main">
        <section className="mission-flight-stage">
          <div className="mission-grid" />
          <svg viewBox="0 0 360 470" aria-label={txt('Vuelo simulado', 'Simulated flight')}>
            <defs>
              <linearGradient id="missionTrail" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#ff4500" stopOpacity=".95"/>
                <stop offset="100%" stopColor="#48a8ff" stopOpacity=".08"/>
              </linearGradient>
            </defs>
            <line x1="180" y1="440" x2="180" y2="44" className="mission-axis"/>
            <line x1="82" y1="420" x2="278" y2="420" className="mission-ground"/>
            <line x1="180" y1="420" x2="180" y2={rocketY} stroke="url(#missionTrail)" strokeWidth="3"/>
            {current.parachute_deployed && <g className="mission-chute">
              <path d={`M 148 ${rocketY-40} Q 180 ${rocketY-72} 212 ${rocketY-40}`}/>
              <line x1="151" y1={rocketY-38} x2="173" y2={rocketY-13}/>
              <line x1="209" y1={rocketY-38} x2="187" y2={rocketY-13}/>
            </g>}
            <g className={current.phase === 'BOOST' ? 'mission-rocket boosting' : 'mission-rocket'} transform={`translate(180 ${rocketY})`}>
              <path d="M0-22 L9-6 L9 16 L-9 16 L-9-6 Z"/>
              <path d="M-9 8 L-17 18 L-9 15 Z M9 8 L17 18 L9 15 Z"/>
              {current.phase === 'BOOST' && <path className="mission-flame" d="M-5 16 L0 38 L5 16 Z"/>}
            </g>
            <text x="16" y="35" className="mission-stage-label">{txt('APOGEO', 'APOGEE')} {maxAltitude.toFixed(1)} m</text>
            <text x="16" y="452" className="mission-stage-label">{txt('PLATAFORMA DE LANZAMIENTO', 'LAUNCH PAD')}</text>
          </svg>
        </section>

        <section className="mission-instruments">
          <div className="instrument primary"><span>{txt('ALTITUD', 'ALTITUDE')}</span><strong>{current.altitude_m.toFixed(1)}</strong><em>m</em><i style={{'--meter': Math.min(current.altitude_m/maxAltitude,1)} as React.CSSProperties}/></div>
          <div className="instrument"><span>{txt('VELOCIDAD', 'SPEED')}</span><strong>{current.speed_m_s.toFixed(1)}</strong><em>m/s</em></div>
          <div className="instrument"><span>MACH</span><strong>{current.mach.toFixed(3)}</strong><em>M</em></div>
          <div className="instrument alertable"><span>{txt('ACELERACIÓN', 'ACCELERATION')}</span><strong>{current.acceleration_g.toFixed(2)}</strong><em>G</em></div>
          <div className="instrument"><span>MAX Q</span><strong>{(current.q_pa/1000).toFixed(2)}</strong><em>kPa</em></div>
          <div className="instrument"><span>{txt('DISTANCIA', 'RANGE')}</span><strong>{current.x_m.toFixed(1)}</strong><em>m</em></div>
        </section>

        <section className="mission-events">
          <div className="mission-section-title"><Activity size={17}/><span>{txt('HITOS DE MISIÓN', 'MISSION EVENTS')}</span></div>
          <div className="event-stack">{events.map((event) => {
            const reached = timeS >= event.time;
            return <div key={event.key} className={reached ? 'mission-event reached' : 'mission-event'}>
              <i>{reached ? '✓' : ''}</i><div><strong>{event.label}</strong><small>{event.detail}</small></div>
            </div>;
          })}</div>
        </section>
      </main>

      <footer className="mission-controls">
        <button type="button" onClick={() => setPlaying((value) => !value)}>{playing ? <Pause size={18}/> : <Play size={18}/>}<span>{playing ? txt('PAUSAR', 'PAUSE') : txt('CONTINUAR', 'RESUME')}</span></button>
        <button type="button" onClick={() => { setTimeS(0); setPlaying(false); lastRealRef.current = null; }}><RotateCcw size={18}/><span>{txt('REINICIAR', 'RESTART')}</span></button>
        <div className="mission-rate">
          {[1,2,5].map((value) => <button type="button" key={value} className={rate === value ? 'active' : ''} onClick={() => setRate(value)}>{value}×</button>)}
        </div>
        <button type="button" className="mission-results" onClick={onViewResults}><Gauge size={18}/><span>{txt('VER RESULTADOS COMPLETOS', 'VIEW FULL RESULTS')}</span></button>
      </footer>
    </div>
  </div>;
}
