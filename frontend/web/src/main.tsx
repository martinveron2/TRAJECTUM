import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const capabilities = [
  'Parametric vehicle editor',
  '3D CAD/geometry view',
  'CG / CP / static margin',
  'Trajectory and MaxQ plots',
  'Validation evidence panel',
];

function App() {
  return (
    <main className="shell">
      <p className="eyebrow">TRAJECTUM · v0.1.0-cdr</p>
      <h1>Aerospace Engineering & Flight Simulation</h1>
      <p className="lead">Engineering workspace scaffold. Physics remains backend-owned and traceable.</p>
      <section className="grid">
        {capabilities.map((item) => <article key={item}>{item}<span>planned</span></article>)}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
