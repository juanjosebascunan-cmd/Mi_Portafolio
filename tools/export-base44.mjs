import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadJson, saveJson } from './quality.mjs';

// Genera evidencia reciente; el conector del chat realiza la escritura remota.
for (const args of [['tools/check.mjs'], ['tools/benchmark.mjs', '--compare']]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', timeout: 60000 });
  if (result.error || result.signal) throw new Error('No se pudo completar la medición');
}
const connection = loadJson(resolve('integrations/base44/project.json'));
const checks = loadJson(resolve('reports/checks.json'));
const benchmark = loadJson(resolve('reports/benchmark.json'));
if (!checks.content_sha256 || !benchmark.content_sha256 || checks.content_sha256 !== benchmark.content_sha256) {
  throw new Error('Informes incompletos o de contenidos diferentes; repetir la validación');
}
const record = {
  run_key: `${connection.project_key}:${benchmark.measured_at}:${benchmark.content_sha256.slice(0, 12)}`,
  project_key: connection.project_key,
  measured_at: benchmark.measured_at,
  commit_sha: benchmark.commit ?? '',
  branch: benchmark.branch ?? '',
  ...(typeof benchmark.dirty === 'boolean' ? { dirty: benchmark.dirty } : {}),
  content_sha256: benchmark.content_sha256,
  status: checks.status === 'passed' && benchmark.status === 'passed' ? 'passed' : 'failed',
  total_bytes: benchmark.total_bytes,
  gzip_bytes: benchmark.gzip_bytes,
  files_count: benchmark.files.length,
  check_errors: checks.errors.length,
  report_json: JSON.stringify({ checks, benchmark }),
  scope: benchmark.scope
};
saveJson(resolve('reports/base44-payload.json'), {
  appId: connection.app_id, entityName: connection.entities.benchmark, records: [record]
});
console.log('Preparado: reports/base44-payload.json. Aún no se ha enviado a Base44.');
process.exitCode = record.status === 'passed' ? 0 : 1;
