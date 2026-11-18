#!/usr/bin/env node

// Adapted from Sailtech Console Web import policies at e2a6ce059ac53e4f57f17db14dd6521e3061585b.
// Console-specific route groups, telemetry packages and allowlists are not Ancora policies.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts'];
const roots = ['app', 'components', 'features', 'lib', 'server', 'runner'];
const skip = new Set([
  'node_modules',
  '.next',
  'dist',
  'coverage',
  'test-results',
  'playwright-report',
]);
const rules = [
  ['features/', ['app/']],
  ['components/ui/', ['app/', 'features/', 'server/']],
  ['components/layout/', ['app/', 'features/', 'server/']],
  ['lib/', ['app/', 'features/', 'server/']],
  ['server/', ['app/', 'features/']],
];
const patterns = [
  /\bimport\s+(?:type\s+)?(?:[^;]*?\s+from\s+)?['"]([^'"]+)['"]/g,
  /\bexport\s+(?:type\s+)?[^;]*?\s+from\s+['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

function walk(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return skip.has(entry.name) ? [] : walk(filename);
    }
    return extensions.includes(path.extname(filename)) ? [filename] : [];
  });
}

function localImports(filename, source) {
  return patterns
    .flatMap((pattern) =>
      Array.from(source.matchAll(pattern), (match) => {
        const specifier = match[1];
        if (specifier.startsWith('@/')) {
          return specifier.slice(2);
        }
        if (specifier.startsWith('./') || specifier.startsWith('../')) {
          return path.posix.normalize(path.posix.join(path.posix.dirname(filename), specifier));
        }
        return null;
      })
    )
    .filter((specifier) => specifier !== null);
}

function isServerContract(filename) {
  return (
    filename.startsWith('server/') ||
    (filename.startsWith('features/') && /\/(?:actions|data)(?:\.[cm]?[jt]sx?)?$/.test(filename))
  );
}

const files = roots.flatMap((directory) => walk(path.join(root, directory)));
const modules = new Map(
  files.map((filename) => {
    const relative = path.relative(root, filename).replaceAll('\\', '/');
    const source = fs.readFileSync(filename, 'utf8');
    return [relative, { source, imports: localImports(relative, source) }];
  })
);
const violations = [];

function resolveModule(filename) {
  return [
    filename,
    ...extensions.map((extension) => filename + extension),
    ...extensions.map((extension) => `${filename}/index${extension}`),
  ].find((candidate) => modules.has(candidate));
}

function reachesServer(filename, visited = new Set()) {
  if (isServerContract(filename)) {
    return true;
  }
  const moduleName = resolveModule(filename);
  if (!moduleName || visited.has(moduleName)) {
    return false;
  }
  if (isServerContract(moduleName)) {
    return true;
  }
  visited.add(moduleName);

  const moduleInfo = modules.get(moduleName);
  if (/\bimport\s*['"]server-only['"]/.test(moduleInfo.source)) {
    return true;
  }
  return moduleInfo.imports.some((dependency) => reachesServer(dependency, visited));
}

for (const [filename, moduleInfo] of modules) {
  for (const dependency of moduleInfo.imports) {
    for (const [origin, forbidden] of rules) {
      if (
        filename.startsWith(origin) &&
        forbidden.some(
          (prefix) => dependency === prefix.slice(0, -1) || dependency.startsWith(prefix)
        )
      ) {
        violations.push(`${filename}: forbidden import of ${dependency}`);
      }
    }
    if (/^\s*['"]use client['"];?/.test(moduleInfo.source) && reachesServer(dependency)) {
      violations.push(`${filename}: client import reaches server-only code through ${dependency}`);
    }
  }
}

if (violations.length > 0) {
  console.error(violations.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Web import boundary check passed.');
}
