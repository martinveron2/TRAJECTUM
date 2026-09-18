import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

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

const equations = [
  {
    title: 'Ogiva tangente',
    model: 'Nose geometry',
    tex: String.raw`ho=rac{R^2+L^2}{2R},\qquad y(x)=\sqrt{ho^2-(L-x)^2}+R-ho`,
    note: 'Perfil exacto de ogiva tangente para 0 ≤ x ≤ L.',
  },
  {
    title: 'Von Kármán · Haack C=0',
    model: 'Nose geometry',
    tex: String.raw`	heta=\cos^{-1}\!\left(1-rac{2x}{L}ight),\qquad y(x)=rac{R}{\sqrt{\pi}}\sqrt{	heta-rac{1}{2}\sin(2	heta)}`,
    note: 'Perfil Von Kármán manteniendo la misma longitud L y radio de base R.',
  },
  {
    title: 'Power series',
    model: 'Nose geometry',
    tex: String.raw`y(x)=R\left(rac{x}{L}ight)^n,\qquad n=0.75\;	ext{(demo)}`,
    note: 'El exponente n controla la agudeza del perfil sin cambiar L ni R.',
  },
  {
    title: 'Centro de gravedad total',
    model: 'Mass properties',
    tex: String.raw`x_{CG}=\frac{\sum_{i=1}^{N}m_i\,x_i}{\sum_{i=1}^{N}m_i}`,
    note: 'Cada xᵢ se deriva de la geometría del componente; la masa pondera el CG total.',
  },
  {
    title: 'Referencia de cátedra · R7',
    model: 'Coordinate transform',
    tex: String.raw`x^{(R7)}=L_{veh}-x^{(punta)}`,
    note: 'TRAJECTUM conserva la coordenada desde la punta internamente y reporta desde apoyo.',
  },
  {
    title: 'CP de una cofia axisimétrica',
    model: 'Slender-body / Barrowman',
    tex: String.raw`x_{CP,n}=L_n-\frac{V_n}{A_b}`,
    note: 'El volumen Vₙ se integra sobre el perfil seleccionado: ogiva tangente, Von Kármán o power series.',
  },
  {
    title: 'CP total',
    model: 'Barrowman superposition',
    tex: String.raw`x_{CP}=\frac{\sum_j C_{N_\alpha,j}\,x_{CP,j}}{\sum_j C_{N_\alpha,j}}`,
    note: 'Actualmente combina contribuciones de nariz y conjunto de aletas.',
  },
  {
    title: 'Margen estático',
    model: 'Static stability',
    tex: String.raw`SM=\frac{x_{CP}-x_{CG}}{D}`,
    note: 'Esta expresión usa la coordenada interna desde la punta; un SM positivo ubica CP detrás de CG.',
  },
  {
    title: 'Resistencia aerodinámica',
    model: 'Point-mass trajectory',
    tex: String.raw`\mathbf{D}=-\frac{1}{2}\,\rho(h)\,C_D\,A\,\lVert\mathbf{v}\rVert\,\mathbf{v}`,
    note: 'ρ varía con altura según atmósfera ISA y A es el área frontal de referencia.',
  },
  {
    title: 'Ecuación de movimiento',
    model: '2D point mass',
    tex: String.raw`m(t)\,\dot{\mathbf{v}}=\mathbf{T}(t)+\mathbf{D}+m(t)\,\mathbf{g},\qquad \dot{\mathbf{r}}=\mathbf{v}`,
    note: 'La integración temporal se realiza numéricamente con RK4 hasta el apogeo.',
  },
  {
    title: 'Presión dinámica y Mach',
    model: 'Flight state',
    tex: String.raw`q=\frac{1}{2}\rho V^2,\qquad M=\frac{V}{a(h)}`,
    note: 'MaxQ y Mach máximo se buscan sobre toda la trayectoria ascendente.',
  },
  {
    title: 'Recuperación con paracaídas',
    model: 'Vertical recovery',
    tex: String.raw`D_p=\frac{1}{2}\rho C_{D,p}A_pV^2,\qquad V_t=\sqrt{\frac{2mg}{\rho C_{D,p}A_p}}`,
    note: 'El simulador cambia Cd·A al desplegar el paracaídas y continúa hasta impacto.',
  },
];

export function EngineeringEquations() {
  return <div className="panel equations-panel">
    <div className="panel-title compact">
      <div>
        <p>MATHEMATICAL MODEL</p>
        <h2>Ecuaciones reales usadas por TRAJECTUM</h2>
      </div>
      <span className="scale-note">KaTeX · notación matemática</span>
    </div>
    <div className="equation-grid">
      {equations.map((item) => <article className="equation-card" key={item.title}>
        <header><strong>{item.title}</strong><span>{item.model}</span></header>
        <Equation tex={item.tex} />
        <p>{item.note}</p>
      </article>)}
    </div>
  </div>;
}
