import { resolve } from 'node:path';
import { existsSync, writeFileSync } from 'node:fs';
import { loadJson, saveJson, measure, compareMetrics, gitContext, checkSite } from './quality.mjs';

const root = process.cwd();
const flags = process.argv.slice(2);
try {
  if (flags.some(f => !['--baseline', '--compare'].includes(f)) || flags.length > 1) throw new Error('Usar --baseline o --compare, nunca ambos');
  const config = loadJson(resolve(root, 'quality.config.json'));
  const data = measure(root, config);
  const checks = checkSite(root, config);
  data.errors.push(...checks.errors);
  const baselinePath = resolve(root, config.baseline);
  if (flags.includes('--compare')) {
    data.errors.push(...compareMetrics(data, existsSync(baselinePath) ? loadJson(baselinePath) : null, config));
  }
  const report = { ...data, measured_at: new Date().toISOString(), ...gitContext(root),
    mode: flags[0]?.slice(2) ?? 'measure', node: process.version,
    platform: process.platform, status: data.errors.length ? 'failed' : 'passed',
    scope: 'Peso de archivos locales normalizados LF; gzip estimado. No mide carga en navegador ni servicios externos.' };
  saveJson(resolve(root, 'reports/benchmark.json'), report);
  const summary = ['# Benchmark estático: ' + config.project, '', `Estado: ${report.status}`,
    `Bytes locales: ${data.total_bytes}`, `Gzip estimado: ${data.gzip_bytes}`, '', report.scope, '',
    '| Archivo | Bytes | Gzip estimado |', '| --- | ---: | ---: |',
    ...data.files.map(f => `| ${f.path} | ${f.bytes} | ${f.gzip_bytes} |`), '',
    ...data.errors.map(e => `- ${e}`)].join('\n') + '\n';
  writeFileSync(resolve(root, 'reports/benchmark.md'), summary);
  if (flags.includes('--baseline') && !data.errors.length) {
    saveJson(baselinePath, { schema_version: 1, project: config.project, total_bytes: data.total_bytes,
      content_sha256: data.content_sha256, files: data.files });
    console.log('Referencia guardada. Revisar el cambio de baseline antes de incluirlo en GitHub.');
  }
  console.log(`${report.status}: ${data.total_bytes} bytes locales; ${data.gzip_bytes} bytes gzip estimados.`);
  for (const error of data.errors) console.error(error);
  process.exitCode = data.errors.length ? 1 : 0;
} catch (error) {
  saveJson(resolve(root, 'reports/benchmark.json'), { status: 'failed', errors: [error.message] });
  console.error(error.message);
  process.exitCode = 1;
}
