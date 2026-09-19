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
  { key: 'tangent_ogive', title: 'Tangent ogive', note: 'Classic reference · smooth tangent junction' },
  { key: 'von_karman', title: 'Von Kármán', note: 'Haack C=0 · low-wave-drag family' },
  { key: 'power_series', title: 'Power series', note: 'n=0.75 · sharper geometric alternative' },
];

export function NoseProfileComparison({
  selected,
  onSelect,
  lang = 'es',
}: {
  selected: string;
  onSelect?: (profile: Profile) => void;
  lang?: 'es' | 'en';
}) {
  const isEs = lang === 'es';
  const txt = (es: string, en: string) => isEs ? es : en;
  const cardTitle = (key: Profile) => key === 'tangent_ogive' ? txt('Ojiva tangente', 'Tangent ogive') : key === 'von_karman' ? 'Von Kármán' : txt('Serie de potencias', 'Power series');
  const cardNote = (key: Profile) => key === 'tangent_ogive' ? txt('Referencia clásica · unión tangente suave', 'Classic reference · smooth tangent junction') : key === 'von_karman' ? txt('Haack C=0 · familia de baja resistencia de onda', 'Haack C=0 · low-wave-drag family') : txt('n=0.75 · alternativa geométrica más aguda', 'n=0.75 · sharper geometric alternative');
  return <div className="panel nose-compare">
    <div className="panel-title compact"><div><p>{txt('ESTUDIO GEOMÉTRICO', 'GEOMETRY STUDY')}</p><h2>{txt('Comparación de perfiles de cofia · mismos 180 mm × Ø63 mm', 'Nose profile comparison · same 180 mm × Ø63 mm')}</h2></div><span className="scale-note">{txt('seleccionable · geometría en vivo', 'selectable · live geometry')}</span></div>
    <div className="nose-compare-grid">{cards.map((card) => <button
      type="button"
      key={card.key}
      className={selected === card.key ? 'nose-card selected' : 'nose-card'}
      onClick={() => onSelect?.(card.key)}
      aria-pressed={selected === card.key}
    >
      <svg viewBox="0 0 190 72"><polyline points={points(card.key)} fill="none" stroke="currentColor" strokeWidth="2"/><line x1="10" y1="60" x2="172" y2="60" stroke="currentColor" strokeOpacity=".25"/></svg>
      <strong>{cardTitle(card.key)}</strong><span>{cardNote(card.key)}</span>
    </button>)}</div>
    <p className="cad-note">{txt('Los tres perfiles conservan la misma longitud y diámetro de base. TRAJECTUM obtiene el CP de la cofia a partir del volumen de cada perfil axisimétrico y el xCG de la envolvente a partir de su geometría superficial; la validación final del CDR debe documentar qué familia queda fijada.', 'All three preserve the same length and base diameter. TRAJECTUM derives nose CP from each axisymmetric profile volume and nose-shell xCG from its surface geometry; final CDR validation should still document which family is frozen.')}</p>
  </div>;
}
