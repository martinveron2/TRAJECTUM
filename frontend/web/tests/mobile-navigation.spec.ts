import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/app/mobile/MobileApp.tsx', import.meta.url), 'utf8');

test('mobile golden navigation keeps the six-phase sequence', () => {
  assert.match(source, /\['mdr', 'pdr', 'analysis', 'frr', 'lrr', 'pfr'\]/);
  for (const phase of ['MDR', 'PDR', 'CDR', 'FRR', 'LRR', 'PFR']) assert.ok(source.includes(phase));
});

test('mobile golden bottom navigation and CDR route remain stable', () => {
  assert.ok(source.includes('mobile-command-bar'));
  assert.ok(source.includes("onClick={() => navigateMobile('analysis')}"));
  assert.ok(source.includes("txt('VUELO', 'FLIGHT')"));
  assert.ok(source.includes("txt('EXPORTAR', 'EXPORT')"));
});

test('mobile portals and numeric picker remain present', () => {
  assert.ok(source.includes('createPortal('));
  assert.ok(source.includes('numeric-wheel-overlay'));
  assert.ok(source.includes('header-cad-backdrop'));
});
