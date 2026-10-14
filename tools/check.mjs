import { resolve } from 'node:path';
import { loadJson, saveJson, checkSite, manifest, contentDigest, gitContext } from './quality.mjs';

const root = process.cwd();
try {
  const config = loadJson(resolve(root, 'quality.config.json'));
  const report = { schema_version: 1, project: config.project, measured_at: new Date().toISOString(),
    ...gitContext(root), content_sha256: contentDigest(manifest(root, config)), ...checkSite(root, config) };
  saveJson(resolve(root, 'reports/checks.json'), report);
  console.log(`${report.status}: ${report.files_checked} archivos, ${report.errors.length} errores.`);
  for (const error of report.errors) console.error(error);
  for (const warning of report.warnings) console.warn(warning);
  process.exitCode = report.errors.length ? 1 : 0;
} catch (error) {
  saveJson(resolve(root, 'reports/checks.json'), { status: 'failed', errors: [error.message] });
  console.error(error.message);
  process.exitCode = 1;
}
