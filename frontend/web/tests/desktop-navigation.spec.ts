import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/app/desktop/DesktopApp.tsx', import.meta.url), 'utf8');

test('desktop workspace surfaces remain present', () => {
  for (const marker of ['status-strip', 'workspace', 'vehicle-editor', 'geometry-panel', 'analysis-panel']) {
    assert.ok(source.includes(marker), marker);
  }
});

test('desktop flight result access remains present', () => {
  assert.ok(source.includes('desktop-flight-results'));
  assert.ok(source.includes('desktop-flight-launch'));
  assert.ok(source.includes('FlightAnalysisCharts'));
});
