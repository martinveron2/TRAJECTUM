import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve('src');
const violations = [];
const extensions = new Set(['.ts', '.tsx']);

function walk(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(full));
    else if (extensions.has(path.extname(entry.name))) result.push(full);
  }
  return result;
}

function classify(file) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  if (rel.startsWith('app/mobile/')) return 'mobile';
  if (rel.startsWith('app/desktop/')) return 'desktop';
  if (rel.startsWith('shared/')) return 'shared';
  return 'other';
}

function resolveImport(file, specifier) {
  if (!specifier.startsWith('.')) return null;
  return path.normalize(path.resolve(path.dirname(file), specifier));
}

for (const file of walk(root)) {
  const sourceClass = classify(file);
  if (!['mobile', 'desktop', 'shared'].includes(sourceClass)) continue;
  const text = fs.readFileSync(file, 'utf8');
  const matches = text.matchAll(/(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/g);
  for (const match of matches) {
    const resolved = resolveImport(file, match[1]);
    if (!resolved) continue;
    const targetClass = classify(resolved);
    if (sourceClass === 'mobile' && targetClass === 'desktop') violations.push(`${file}: mobile imports desktop: ${match[1]}`);
    if (sourceClass === 'desktop' && targetClass === 'mobile') violations.push(`${file}: desktop imports mobile: ${match[1]}`);
    if (sourceClass === 'shared' && ['mobile', 'desktop'].includes(targetClass)) violations.push(`${file}: shared imports platform UI: ${match[1]}`);
  }
}

const labels = (process.env.PR_LABELS || '').split(',').map((x) => x.trim()).filter(Boolean);
const baseSha = process.env.BASE_SHA || '';
if (baseSha && (labels.includes('desktop-only') || labels.includes('mobile-only'))) {
  const changed = execFileSync('git', ['diff', '--name-only', `${baseSha}...HEAD`], { encoding: 'utf8' })
    .split('\n').map((x) => x.trim()).filter(Boolean);
  if (labels.includes('desktop-only')) {
    const mobileChanges = changed.filter((f) => f.startsWith('frontend/web/src/app/mobile/'));
    if (mobileChanges.length) violations.push('desktop-only PR modified mobile files: ' + mobileChanges.join(', '));
  }
  if (labels.includes('mobile-only')) {
    const desktopChanges = changed.filter((f) => f.startsWith('frontend/web/src/app/desktop/'));
    if (desktopChanges.length) violations.push('mobile-only PR modified desktop files: ' + desktopChanges.join(', '));
  }
}

if (violations.length) {
  console.error('Platform boundary violations:\n' + violations.map((v) => '- ' + v).join('\n'));
  process.exit(1);
}
console.log('Platform boundaries OK');
