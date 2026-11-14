#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

// Adapted from Sailtech Console Web at e2a6ce059ac53e4f57f17db14dd6521e3061585b.
const projectRoot = process.cwd();
const repoRoot = path.resolve(projectRoot, '..', '..');
const allowlistPath = path.join(
  repoRoot,
  'config',
  'quality',
  'typescript-size-guardrails-allowlist.txt'
);
const scanRoots = ['app', 'components', 'features', 'lib', 'server', 'runner'].map((entry) =>
  path.join(projectRoot, entry)
);
const skipDirs = new Set([
  '.git',
  '.next',
  '.turbo',
  'build',
  'coverage',
  'dist',
  'generated',
  'node_modules',
  'test-results',
]);
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts', '.cjs', '.cts']);

const rules = [
  {
    key: 'route-entry-file-lines',
    threshold: 150,
    matches(relativePath) {
      const fileName = path.posix.basename(relativePath);
      return (
        relativePath.startsWith('app/') &&
        ['page.tsx', 'layout.tsx', 'loading.tsx', 'error.tsx', 'template.tsx'].includes(fileName)
      );
    },
  },
  {
    key: 'api-route-file-lines',
    threshold: 220,
    matches(relativePath) {
      return relativePath.startsWith('app/api/') && relativePath.endsWith('/route.ts');
    },
  },
  {
    key: 'feature-component-file-lines',
    threshold: 450,
    matches(relativePath) {
      return (
        relativePath.startsWith('features/') &&
        relativePath.includes('/components/') &&
        relativePath.endsWith('.tsx')
      );
    },
  },
  {
    key: 'product-file-lines',
    threshold: 700,
    matches() {
      return true;
    },
  },
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) {
        continue;
      }
      walk(absolutePath, files);
      continue;
    }
    if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(absolutePath);
    }
  }

  return files;
}

function shouldScan(relativePath) {
  if (/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(relativePath) || /\.d\.[cm]?ts$/.test(relativePath)) {
    return false;
  }
  if (relativePath.startsWith('tests/')) {
    return false;
  }
  if (relativePath.includes('/generated/')) {
    return false;
  }
  return true;
}

function readAllowlist() {
  if (!fs.existsSync(allowlistPath)) {
    return { entries: new Map(), duplicates: [], invalid: [] };
  }

  const entries = new Map();
  const duplicates = [];
  const invalid = [];
  const lines = fs.readFileSync(allowlistPath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const [rule, filePath, subject, ...rest] = rawLine.split('|');
    if (
      !rule ||
      !filePath ||
      !subject ||
      !rest.join('|').trim() ||
      subject.trim() !== 'FILE' ||
      !rules.some((entry) => entry.key === rule.trim())
    ) {
      invalid.push(rawLine);
      continue;
    }

    const key = `${rule.trim()}|${filePath.trim()}|${subject.trim()}`;
    if (entries.has(key)) {
      duplicates.push(key);
      continue;
    }
    entries.set(key, rawLine);
  }

  return { entries, duplicates, invalid };
}

function countLines(content) {
  return content === '' ? 0 : content.split(/\r?\n/).length;
}

const violations = [];
for (const scanRoot of scanRoots) {
  for (const filePath of walk(scanRoot)) {
    const relativePath = path.relative(projectRoot, filePath).replaceAll('\\', '/');
    if (!shouldScan(relativePath)) {
      continue;
    }

    const lineCount = countLines(fs.readFileSync(filePath, 'utf8'));
    for (const rule of rules) {
      if (rule.matches(relativePath) && lineCount > rule.threshold) {
        violations.push({
          found: lineCount,
          key: `${rule.key}|${relativePath}|FILE`,
          message: `${relativePath} has ${lineCount} lines (threshold ${rule.threshold})`,
        });
      }
    }
  }
}

const { entries: allowlistEntries, duplicates, invalid } = readAllowlist();
const currentViolationKeys = new Set(violations.map((entry) => entry.key));
const staleAllowlist = Array.from(allowlistEntries.keys())
  .filter((key) => !currentViolationKeys.has(key))
  .sort();
const blockingViolations = violations.filter((entry) => !allowlistEntries.has(entry.key));

if (invalid.length > 0) {
  console.error('TypeScript size guardrails policy violation: malformed allowlist entries:');
  for (const entry of invalid) {
    console.error(`- ${entry}`);
  }
  process.exit(1);
}

if (duplicates.length > 0) {
  console.error('TypeScript size guardrails policy violation: duplicate allowlist entries:');
  for (const entry of duplicates) {
    console.error(`- ${entry}`);
  }
  process.exit(1);
}

if (staleAllowlist.length > 0) {
  console.error('TypeScript size guardrails policy violation: stale allowlist entries:');
  for (const entry of staleAllowlist) {
    console.error(`- ${entry}`);
  }
  process.exit(1);
}

if (blockingViolations.length > 0) {
  console.error('TypeScript size guardrails policy violation.');
  console.error(
    'Keep Ancora Web routes, API handlers, and feature components decomposed and reviewable.'
  );
  for (const rule of rules) {
    console.error(`- ${rule.key}: ${rule.threshold}`);
  }
  console.error(`Allowlist path: ${path.relative(repoRoot, allowlistPath).replaceAll('\\', '/')}`);
  for (const violation of blockingViolations.sort((left, right) =>
    left.key.localeCompare(right.key)
  )) {
    console.error(`- ${violation.key}|${violation.message}`);
  }
  process.exit(1);
}

console.log('TypeScript size guardrails check passed.');
