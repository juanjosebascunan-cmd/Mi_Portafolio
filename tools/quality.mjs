import { readFileSync, readdirSync, statSync, existsSync, realpathSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, relative, dirname, extname, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';

const textExtensions = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg', '.txt']);
export const loadJson = path => JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
export function saveJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}
function inside(root, path) {
  const rel = relative(root, path);
  return rel !== '..' && !rel.startsWith('..' + sep) && !/^[A-Za-z]:/.test(rel);
}
export function siteFiles(root, config) {
  const files = new Set();
  function visit(path) {
    if (!existsSync(path)) throw new Error(`Ruta del sitio inexistente: ${relative(root, path)}`);
    if (!inside(realpathSync(root), realpathSync(path))) throw new Error('Ruta fuera del proyecto');
    if (statSync(path).isDirectory()) {
      for (const entry of readdirSync(path, { withFileTypes: true })) {
        if (entry.isSymbolicLink()) throw new Error('No se admiten enlaces simbólicos en el sitio');
        visit(resolve(path, entry.name));
      }
    } else files.add(relative(root, path).split(sep).join('/'));
  }
  for (const path of config.site_paths) visit(resolve(root, path));
  return [...files].sort();
}
// CRLF y LF se normalizan solo para comparar el contenido entre Windows y Linux.
export function normalizedBytes(path) {
  const bytes = readFileSync(path);
  return textExtensions.has(extname(path)) ? Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n')) : bytes;
}
export function manifest(root, config) {
  return siteFiles(root, config).map(path => {
    const bytes = normalizedBytes(resolve(root, path));
    return { path, bytes: bytes.length, gzip_bytes: gzipSync(bytes, { level: 9 }).length,
      sha256: createHash('sha256').update(bytes).digest('hex') };
  });
}
export function gitContext(root) {
  const git = args => {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', timeout: 10000 });
    return result.status === 0 ? result.stdout.trim() : null;
  };
  const status = git(['status', '--porcelain']);
  return { commit: git(['rev-parse', 'HEAD']), branch: git(['branch', '--show-current']),
    dirty: status === null ? null : status.length > 0 };
}
export function contentDigest(files) {
  return createHash('sha256').update(files.map(f => `${f.path}\0${f.sha256}`).join('\n')).digest('hex');
}
// Escáner de referencias del HTML estático del portafolio; no sustituye un validador HTML completo.
function tags(html) {
  const clean = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, match => match.slice(0, match.indexOf('>') + 1));
  return [...clean.matchAll(/<([a-z][\w:-]*)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi)].map(match => {
    const attrs = {};
    for (const a of match[2].matchAll(/([^\s=/'"<>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      attrs[a[1].toLowerCase()] = a[2] ?? a[3] ?? a[4] ?? '';
    }
    return { name: match[1].toLowerCase(), attrs };
  });
}
export function checkSite(root, config) {
  const errors = [], warnings = [];
  const files = siteFiles(root, config);
  const fileSet = new Set(files);
  const htmlFiles = files.filter(f => extname(f) === '.html');
  const documents = new Map(htmlFiles.map(file => [file, tags(readFileSync(resolve(root, file), 'utf8'))]));
  const ids = new Map();
  for (const [file, elements] of documents) {
    const values = elements.filter(t => t.attrs.id).map(t => t.attrs.id);
    ids.set(file, new Set(values));
    if (values.length !== ids.get(file).size) errors.push(`${file}: hay identificadores id duplicados`);
    for (const el of elements.filter(t => t.name === 'img')) {
      if (!Object.hasOwn(el.attrs, 'alt')) errors.push(`${file}: imagen sin atributo alt`);
    }
    if (!elements.some(t => t.name === 'html' && t.attrs.lang)) errors.push(`${file}: falta idioma del documento`);
    if (!elements.some(t => t.name === 'title')) errors.push(`${file}: falta title`);
    if (!elements.some(t => t.name === 'meta' && t.attrs.name === 'viewport')) errors.push(`${file}: falta viewport`);
    if (elements.filter(t => t.name === 'h1').length !== 1) errors.push(`${file}: se requiere un h1`);
  }
  if (!documents.has(config.entry)) errors.push('No existe el HTML de entrada');
  function reference(file, raw) {
    if (!raw || /^(?:[a-z][\w+.-]*:|\/\/)/i.test(raw)) return;
    try {
      const url = new URL(raw.replaceAll('&amp;', '&'), `https://local.test/${file}`);
      const path = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      const target = path.endsWith('/') || path === '' ? path + 'index.html' : path;
      if (!fileSet.has(target)) errors.push(`${file}: referencia local no incluida o inexistente: ${raw}`);
      else if (url.hash && ids.has(target) && !ids.get(target).has(decodeURIComponent(url.hash.slice(1)))) {
        errors.push(`${file}: ancla inexistente: ${raw}`);
      }
    } catch { errors.push(`${file}: referencia inválida: ${raw}`); }
  }
  for (const [file, elements] of documents) {
    for (const el of elements) {
      for (const attr of ['src', 'href', 'poster']) if (el.attrs[attr]) reference(file, el.attrs[attr]);
      if (el.attrs.srcset) warnings.push(`${file}: revisar srcset en navegador (sin cobertura automática)`);
    }
  }
  for (const file of files) {
    if (['.js', '.mjs'].includes(extname(file))) {
      const result = spawnSync(process.execPath, ['--check', resolve(root, file)], { encoding: 'utf8', timeout: 10000 });
      if (result.status !== 0) errors.push(`${file}: JavaScript inválido\n${result.stderr || result.error?.message || ''}`);
    }
    if (extname(file) === '.css') {
      const css = readFileSync(resolve(root, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      for (const m of css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi)) reference(file, (m[1] ?? m[2] ?? m[3]).trim());
    }
  }
  return { status: errors.length ? 'failed' : 'passed', errors, warnings,
    files_checked: files.length, html_documents: htmlFiles.length };
}
export function compareMetrics(current, baseline, config) {
  const errors = [];
  if (!baseline || baseline.schema_version !== 1 || baseline.project !== config.project || !Array.isArray(baseline.files) || !Number.isFinite(baseline.total_bytes) || baseline.total_bytes <= 0) {
    return ['Referencia ausente, inválida o de otro proyecto'];
  }
  const growth = ((current.total_bytes / baseline.total_bytes) - 1) * 100;
  if (growth > config.max_growth_percent) errors.push(`El peso total creció ${growth.toFixed(2)}%; límite ${config.max_growth_percent}%`);
  const prior = new Map(baseline.files.map(f => [f.path, f]));
  for (const file of current.files) {
    const old = prior.get(file.path);
    if (old?.bytes > 0 && file.bytes > old.bytes * (1 + config.max_growth_percent / 100)) {
      errors.push(`${file.path}: creció más de ${config.max_growth_percent}%`);
    }
  }
  return errors;
}
export function measure(root, config) {
  const files = manifest(root, config);
  const total = files.reduce((sum, f) => sum + f.bytes, 0);
  const errors = [];
  if (total > config.max_total_bytes) errors.push(`El sitio supera ${config.max_total_bytes} bytes`);
  for (const file of files) if (file.bytes > config.max_file_bytes) errors.push(`${file.path}: supera ${config.max_file_bytes} bytes`);
  return { schema_version: 1, project: config.project, total_bytes: total,
    gzip_bytes: files.reduce((sum, f) => sum + f.gzip_bytes, 0),
    content_sha256: contentDigest(files), files, errors };
}
