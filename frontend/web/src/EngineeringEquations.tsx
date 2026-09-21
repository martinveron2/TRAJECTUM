import React, { useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

type EquationItem = {
  title: string;
  model: string;
  tex: string;
  note: string;
};

function Equation({ tex }: { tex: string }) {
  return <div
    className="math-equation"
    dangerouslySetInnerHTML={{
      __html: katex.renderToString(tex, {
        throwOnError: false,
        displayMode: true,
        output: 'htmlAndMathml',
      }),
    }}
  />;
}

const cdrEquations: EquationItem[] = [
  {
    title: 'Área frontal de referencia',
    model: 'Aerodynamic reference',
    tex: String.raw`A_{ref}=\frac{\pi D^2}{4}`,
    note: 'Área circular frontal empleada por el modelo de arrastre.',
  },
  {
    title: 'Ogiva tangente',
    model: 'Nose geometry',
    tex: String.raw`\rho=\frac{R^2+L^2}{2R},\qquad y(x)=\sqrt{\rho^2-(L-x)^2}+R-\rho`,
    note: 'Perfil exacto de ogiva tangente para 0 \le x \le L.',
  },
  {
    title: 'Von Kármán · Haack C=0',
    model: 'Nose geometry',
    tex: String.raw`\theta=\cos^{-1}\!\left(1-\frac{2x}{L}\right),\qquad y(x)=\frac{R}{\sqrt{\pi}}\sqrt{\theta-\frac{1}{2}\sin(2\theta)}`,
    note: 'Alternativa de perfil manteniendo la misma longitud L y radio de base R.',
  },
  {
    title: 'Power series',
    model: 'Nose geometry',
    tex: String.raw`y(x)=R\left(\frac{x}{L}\right)^n,\qquad n=0.75\;\text{(demo)}`,
    note: 'El exponente n controla la forma sin modificar L ni R.',
  },
  {
    title: 'Centro de gravedad total',
    model: 'Mass properties',
    tex: String.raw`x_{CG}=\frac{\sum_{i=1}^{N}m_i x_i}{\sum_{i=1}^{N}m_i}`,
    note: 'Cada xᵢ proviene de la geometría del componente y la masa pondera el CG total.',
  },
  {
    title: 'Referencia de cátedra · R7',
    model: 'Coordinate transform',
    tex: String.raw`x^{(R7)}=L_{veh}-x^{(punta)}`,
    note: 'El cálculo interno conserva la referencia desde la punta y la salida se informa desde apoyo.',
  },
  {
    title: 'CP de una cofia axisimétrica',
    model: 'Slender-body / Barrowman',
    tex: String.raw`x_{CP,n}=L_n-\frac{V_n}{A_b}`,
    note: 'Vₙ se obtiene integrando el perfil axisimétrico seleccionado.',
  },
  {
    title: 'CP total',
    model: 'Barrowman superposition',
    tex: String.raw`x_{CP}=\frac{\sum_j C_{N_{\alpha},j}\,x_{CP,j}}{\sum_j C_{N_{\alpha},j}}`,
    note: 'Combina las contribuciones aerodinámicas activas del vehículo.',
  },
  {
    title: 'Resistencia aerodinámica',
    model: '2D point-mass trajectory',
    tex: String.raw`\mathbf{D}=-\frac{1}{2}\rho(h)C_DA_{ref}\lVert\mathbf{v}\rVert\mathbf{v}`,
    note: 'La fuerza de arrastre se opone al vector velocidad.',
  },
  {
    title: 'Ecuaciones de movimiento',
    model: '2D point mass · RK4',
    tex: String.raw`m(t)\dot{\mathbf{v}}=\mathbf{T}(t)+\mathbf{D}+m(t)\mathbf{g},\qquad \dot{\mathbf{r}}=\mathbf{v}`,
    note: 'TRAJECTUM integra este sistema con Runge–Kutta de cuarto orden.',
  },
  {
    title: 'Presión dinámica',
    model: 'Flight state',
    tex: String.raw`q=\frac{1}{2}\rho(h)V^2`,
    note: 'qmax es el máximo de q a lo largo de la trayectoria.',
  },
  {
    title: 'Velocidad del sonido y Mach',
    model: 'ISA atmosphere',
    tex: String.raw`c(h)=\sqrt{\gamma R T(h)},\qquad M=\frac{V}{c(h)}`,
    note: 'Se usa c para la velocidad local del sonido y M para el número de Mach.',
  },
];

export function EngineeringEquations({ lang = 'es' }: { lang?: 'es' | 'en' }) {
  const isEs = lang === 'es';
  const txt = (es: string, en: string) => isEs ? es : en;
  const cdrEquationsEn: Array<Pick<EquationItem, 'title' | 'model' | 'note'>> = [
    { title: 'Reference frontal area', model: 'Aerodynamic reference', note: 'Circular frontal area used by the drag model.' },
    { title: 'Tangent ogive', model: 'Nose geometry', note: 'Exact tangent-ogive profile for 0 ≤ x ≤ L.' },
    { title: 'Von Kármán · Haack C=0', model: 'Nose geometry', note: 'Alternative profile preserving the same length L and base radius R.' },
    { title: 'Power series', model: 'Nose geometry', note: 'Exponent n controls the shape without changing L or R.' },
    { title: 'Total center of gravity', model: 'Mass properties', note: 'Each xᵢ comes from component geometry and mass weights the total CG.' },
    { title: 'Course reference · R7', model: 'Coordinate transform', note: 'Internal calculations retain the nose datum while output is reported from the support datum.' },
    { title: 'CP of an axisymmetric nose', model: 'Slender-body / Barrowman', note: 'Vₙ is obtained by integrating the selected axisymmetric profile.' },
    { title: 'Total CP', model: 'Barrowman superposition', note: 'Combines the active aerodynamic contributions of the vehicle.' },
    { title: 'Aerodynamic drag', model: '2D point-mass trajectory', note: 'Drag force opposes the velocity vector.' },
    { title: 'Equations of motion', model: '2D point mass · RK4', note: 'TRAJECTUM integrates this system with fourth-order Runge–Kutta.' },
    { title: 'Dynamic pressure', model: 'Flight state', note: 'Max Q is the maximum q along the trajectory.' },
    { title: 'Speed of sound and Mach', model: 'ISA atmosphere', note: 'c is used for local speed of sound and M for Mach number.' },
  ];
  const cdrModelsEs = [
    'Referencia aerodinámica', 'Geometría de cofia', 'Geometría de cofia', 'Geometría de cofia',
    'Propiedades de masa', 'Transformación de coordenadas', 'Cuerpo esbelto / Barrowman',
    'Superposición de Barrowman', 'Trayectoria 2D de masa puntual', 'Masa puntual 2D · RK4',
    'Estado de vuelo', 'Atmósfera ISA',
  ];
  const equationTitle = (i: number) => isEs ? cdrEquations[i].title : cdrEquationsEn[i].title;
  const equationModel = (i: number) => isEs ? cdrModelsEs[i] : cdrEquationsEn[i].model;
  const equationNote = (i: number) => isEs ? cdrEquations[i].note : cdrEquationsEn[i].note;
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [showFrr, setShowFrr] = useState(false);

  const close = () => {
    setOpen(false);
    setIndex(0);
    setShowFrr(false);
  };

  const next = () => {
    if (index < cdrEquations.length - 1) {
      setIndex((current) => current + 1);
      return;
    }
    setShowFrr(true);
  };

  const previous = () => {
    if (showFrr) {
      setShowFrr(false);
      return;
    }
    setIndex((current) => Math.max(current - 1, 0));
  };

  return <div className="panel equations-panel">
    <div className="panel-title compact">
      <div>
        <p>{txt('MODELO DE INGENIERÍA', 'ENGINEERING MODEL')}</p>
        <h2>{txt('Modelo matemático por fase', 'Mathematical model by phase')}</h2>
      </div>
      {!open
        ? <button type="button" className="phase-equations-button" onClick={() => setOpen(true)}>{txt('ECUACIONES CDR', 'CDR EQUATIONS')}</button>
        : <button type="button" className="phase-equations-button secondary" onClick={close}>{txt('CERRAR', 'CLOSE')}</button>}
    </div>

    {!open && <p className="equations-intro">
      {txt('Abrí las ecuaciones del CDR una por una. La fase siguiente, FRR, queda separada para no mezclar entregables.', 'Open the CDR equations one by one. The next phase, FRR, remains separate to avoid mixing deliverables.')}
    </p>}

    {open && !showFrr && <div className="equation-focus">
      <div className="equation-progress">
        <span>CDR · {txt('ECUACIÓN', 'EQUATION')} {index + 1} / {cdrEquations.length}</span>
        <strong>{equationTitle(index)}</strong>
      </div>
      <article className="equation-card focus-card">
        <header><strong>{equationTitle(index)}</strong><span>{equationModel(index)}</span></header>
        <Equation tex={cdrEquations[index].tex} />
        <p>{equationNote(index)}</p>
      </article>
      <div className="equation-nav">
        <button type="button" onClick={previous} disabled={index === 0}>{txt('ANTERIOR', 'PREVIOUS')}</button>
        <button type="button" onClick={next}>
          {index === cdrEquations.length - 1 ? txt('SIGUIENTE · FRR', 'NEXT · FRR') : txt('SIGUIENTE ECUACIÓN', 'NEXT EQUATION')}
        </button>
      </div>
    </div>}

    {open && showFrr && <div className="phase-construction">
      <span>{txt('FASE SIGUIENTE', 'NEXT PHASE')}</span>
      <strong>FRR · {txt('Revisión de preparación para vuelo', 'Flight Readiness Review')}</strong>
      <p>{txt('En construcción. Acá van a entrar estabilidad final, recuperación, velocidad de impacto y verificaciones de vuelo.', 'Under construction. Final stability, recovery, impact speed and flight verification will be added here.')}</p>
      <button type="button" onClick={previous}>{txt('VOLVER A CDR', 'BACK TO CDR')}</button>
    </div>}
  </div>;
}
