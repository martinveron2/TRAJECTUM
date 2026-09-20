import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const panel = fs.readFileSync(new URL('../src/LiveAnalysisPanel.tsx', import.meta.url), 'utf8');
const types = fs.readFileSync(new URL('../src/shared/types/engineering.ts', import.meta.url), 'utf8');

test('frontend keeps canonical backend analysis endpoints', () => {
  assert.ok(panel.includes("fetch('/api/v1/components/cg'"));
  assert.ok(panel.includes("fetch('/api/v2/analysis/full'"));
});

test('shared domain contract contains vehicle and motor inputs used by backend', () => {
  for (const key of ['totalLength', 'diameter', 'noseLength', 'rootChord', 'tipChord', 'span', 'sweep', 'finX', 'launchAngle']) {
    assert.ok(types.includes(key), key);
  }
  for (const key of ['designation', 'burn', 'impulse', 'maxThrust', 'propellantMass', 'dryMass', 'thrustCurve']) {
    assert.ok(types.includes(key), key);
  }
});
