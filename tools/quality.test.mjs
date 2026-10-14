import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { checkSite, measure, compareMetrics } from './quality.mjs';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'portfolio-quality-'));
  mkdirSync(join(root, 'assets'));
  writeFileSync(join(root, 'assets/app.js'), 'const ready = true;\n');
  const html = '<!doctype html><html lang="es"><head><title>Prueba</title><meta name="viewport" content="width=device-width"></head><body><h1 id="inicio">Hola</h1><a href="#inicio">Inicio</a><script src="assets/app.js"></script></body></html>';
  writeFileSync(join(root, 'index.html'), html);
  const config = { project: 'fixture', entry: 'index.html', site_paths: ['index.html', 'assets'], max_total_bytes: 100000, max_file_bytes: 10000, max_growth_percent: 10 };
  return { root, config, html };
}
test('un sitio válido pasa y una referencia inexistente falla', () => {
  const { root, config, html } = fixture();
  assert.equal(checkSite(root, config).status, 'passed');
  writeFileSync(join(root, 'index.html'), html.replace('assets/app.js', 'assets/missing.js'));
  assert.equal(checkSite(root, config).status, 'failed');
});
test('detecta anclas rotas, ids duplicados y JavaScript inválido', () => {
  const { root, config, html } = fixture();
  writeFileSync(join(root, 'index.html'), html.replace('href="#inicio"', 'id="inicio" href="#noexiste"'));
  writeFileSync(join(root, 'assets/app.js'), 'const = ;');
  const { errors } = checkSite(root, config);
  assert.ok(errors.some(e => e.includes('duplicados')));
  assert.ok(errors.some(e => e.includes('ancla')));
  assert.ok(errors.some(e => e.includes('JavaScript')));
});
test('resuelve espacios codificados y rutas relativas en CSS', () => {
  const { root, config, html } = fixture();
  writeFileSync(join(root, 'assets/foto perfil.svg'), '<svg></svg>');
  writeFileSync(join(root, 'assets/style.css'), 'body { background:url("foto%20perfil.svg") }');
  writeFileSync(join(root, 'index.html'), html.replace('</body>', '<img alt="" src="assets/foto%20perfil.svg"></body>'));
  assert.equal(checkSite(root, config).status, 'passed');
});
test('normaliza saltos de línea para comparar Windows y Linux', () => {
  const { root, config } = fixture();
  const initial = measure(root, config);
  writeFileSync(join(root, 'assets/app.js'), 'const ready = true;\r\n');
  assert.equal(measure(root, config).content_sha256, initial.content_sha256);
});
test('un aumento de peso falla y no altera la referencia', () => {
  const { root, config } = fixture();
  const baseline = measure(root, config);
  const original = JSON.stringify(baseline);
  writeFileSync(join(root, 'assets/app.js'), '// ' + 'x'.repeat(1000));
  assert.ok(compareMetrics(measure(root, config), baseline, config).length > 0);
  assert.equal(JSON.stringify(baseline), original);
  assert.ok(compareMetrics(baseline, null, config).length > 0);
});
test('aplica presupuestos absolutos y rechaza rutas inexistentes', () => {
  const { root, config } = fixture();
  assert.ok(measure(root, { ...config, max_total_bytes: 1, max_file_bytes: 1 }).errors.length > 0);
  assert.throws(() => measure(root, { ...config, site_paths: ['no-existe'] }));
});
test('la comparación fallida devuelve código 1, genera evidencia y conserva la referencia', () => {
  const { root, config } = fixture();
  const baseline = JSON.stringify(measure(root, config));
  writeFileSync(join(root, 'baseline.json'), baseline);
  writeFileSync(join(root, 'quality.config.json'), JSON.stringify({ ...config, baseline: 'baseline.json' }));
  writeFileSync(join(root, 'assets/app.js'), '// ' + 'x'.repeat(2000));
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('./benchmark.mjs', import.meta.url)), '--compare'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(readFileSync(join(root, 'reports/benchmark.json'), 'utf8')).status, 'failed');
  assert.equal(readFileSync(join(root, 'baseline.json'), 'utf8'), baseline);
});
