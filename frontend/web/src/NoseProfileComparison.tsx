import React from 'react';

type Profile = 'tangent_ogive' | 'von_karman' | 'power_series';

function points(profile: Profile, length = 180, radius = 31.5) {
  const values: string[] = [];
  const rho = (radius * radius + length * length) / (2 * radius);
  for (let i = 0; i <= 50; i++) {
    const x = length * i / 50;
    const u = x / length;
    let y = 0;
    if (profile === 'von_karman') {
      const theta = Math.acos(1 - 2 * u);
      y = radius / Math.sqrt(Math.PI) * Math.sqrt(Math.max(theta - 0.5 * Math.sin(2 * theta), 0));
    } else if (profile === 'power_series') {
      y = radius * Math.pow(u, 0.75);
    } else {
      y = Math.sqrt(Math.max(rho * rho - (length - x) * (length - x), 0)) + radius - rho;
    }
    values.push(`${10 + x * 0.9},${60 - y * 1.35}`);
  }
  return values.join(' ');
}

const cards: { key: Profile; title: string; note: string }[] = [
  { key: 'tangent_ogive', title: 'Tangent ogive', note: 'Current baseline · smooth tangent junction' },
  { key: 'von_karman', title: 'Von Kármán', note: 'Haack C=0 · low-wave-drag family' },
  { key: 'power_series', title: 'Power series', note: 'n=0.75 · sharper geometric alternative' },
];

export function NoseProfileComparison({ selected }: { selected: string }) {
  return <div className="panel nose-compare">
    <div className="panel-title compact"><div><p>GEOMETRY STUDY</p><h2>Nose profile comparison · same 180 mm × Ø63 mm</h2></div><span className="scale-note">geometry only</span></div>
    <div className="nose-compare-grid">{cards.map((card) => <div key={card.key} className={selected === card.key ? 'nose-card selected' : 'nose-card'}>
      <svg viewBox="0 0 190 72"><polyline points={points(card.key)} fill="none" stroke="currentColor" strokeWidth="2"/><line x1="10" y1="60" x2="172" y2="60" stroke="currentColor" strokeOpacity=".25"/></svg>
      <strong>{card.title}</strong><span>{card.note}</span>
    </div>)}</div>
    <p className="cad-note">The visual comparison preserves length and base diameter. TRAJECTUM still uses the validated tangent-ogive Barrowman nose CP model for the current numerical CDR run; alternate-profile aerodynamic models remain a separate validation task.</p>
  </div>;
}
