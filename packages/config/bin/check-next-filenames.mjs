#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

// Adapted from Sailtech web-config at e2a6ce059ac53e4f57f17db14dd6521e3061585b.
// Update provenance and run the fixture tests when refreshing this local copy.
const webRoot = process.cwd();

const RESERVED_ROUTE_FILES = new Set([
  'page',
  'layout',
  'loading',
  'error',
  'route',
  'template',
  'default',
  'not-found',
]);

const FEATURE_CONTRACT_FILES = new Set([
  'actions',
  'constants',
  'data',
  'mappers',
  'schemas',
  'types',
  'utils',
]);

const EXPLICIT_ALLOWED_FILES = new Set([
  'next-env.d.ts',
  'middleware.ts',
  'pages/_document.tsx',
  'playwright.config.ts',
  'tailwind.config.ts',
  'vitest.config.ts',
  'tests/vitest.setup.ts',
]);

const SCAN_EXTENSIONS = new Set(['.ts', '.tsx']);
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'coverage',
  'dist',
  'build',
  '.turbo',
  '.cache',
  'test-results',
  'playwright-report',
]);
const TYPE_EXPORT_SUFFIXES =
  /(Props|Text|State|States|Option|Options|Item|Items|Case|Cases|Context|Value|Values|Key|Keys|Tone|Tones|Size|Sizes|Type|Types|Row|Rows|Entry|Entries|Result|Results|Response|Request|Input|Inputs|Payload|Payloads)$/;
const problems = [];

function isPascalCase(value) {
  return /^[A-Z][A-Za-z0-9]*$/.test(value);
}

function isCamelCase(value) {
  return /^[a-z][A-Za-z0-9]*$/.test(value);
}

function normalizePath(filePath) {
  return filePath.replaceAll('\\', '/');
}

function shouldSkipDirectory(directoryName) {
  return SKIP_DIRS.has(directoryName) || directoryName.startsWith('.next');
}

function walk(directory, files = []) {
  if (!fs.existsSync(directory)) {
    return files;
  }
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!shouldSkipDirectory(entry.name)) {
        walk(absolutePath, files);
      }
      continue;
    }
    files.push(absolutePath);
  }
  return files;
}

function parseName(fileName) {
  const match = fileName.match(/^(.*?)(\.(test|spec))?(\.(ts|tsx))$/);
  if (!match) {
    return null;
  }
  return { extension: match[4], isTest: Boolean(match[2]), stem: match[1] };
}

function isComponentDirectory(relativePath) {
  return (
    relativePath.startsWith('components/') ||
    (relativePath.startsWith('features/') && relativePath.split('/').includes('components'))
  );
}

function exportedNames(filePath, prefix) {
  const contents = fs.readFileSync(filePath, 'utf8');
  const names = new Set();
  const patterns = [
    new RegExp(`export\\s+(?:async\\s+)?function\\s+(${prefix}[A-Za-z0-9]*)\\b`, 'g'),
    new RegExp(`export\\s+const\\s+(${prefix}[A-Za-z0-9]*)\\b`, 'g'),
    new RegExp(`export\\s+class\\s+(${prefix}[A-Za-z0-9]*)\\b`, 'g'),
    new RegExp(`export\\s+default\\s+function\\s+(${prefix}[A-Za-z0-9]*)\\b`, 'g'),
  ];
  for (const pattern of patterns) {
    let match = pattern.exec(contents);
    while (match) {
      names.add(match[1]);
      match = pattern.exec(contents);
    }
  }
  return Array.from(names);
}

function validateFileName(filePath) {
  const relativePath = normalizePath(path.relative(webRoot, filePath));
  if (!SCAN_EXTENSIONS.has(path.extname(filePath)) || EXPLICIT_ALLOWED_FILES.has(relativePath)) {
    return;
  }
  const parsed = parseName(path.basename(filePath));
  if (!parsed) {
    return;
  }

  if (relativePath.split('/').includes('sections')) {
    problems.push(`Use components instead of sections: ${relativePath}`);
  }

  if (relativePath.startsWith('app/')) {
    const normalizedStem = parsed.stem.toLowerCase();
    if (RESERVED_ROUTE_FILES.has(normalizedStem) && parsed.stem !== normalizedStem) {
      problems.push(`App Router reserved filename must stay lowercase: ${relativePath}`);
    }
  }

  if (relativePath.startsWith('features/')) {
    const normalizedStem = parsed.stem.toLowerCase();
    if (FEATURE_CONTRACT_FILES.has(normalizedStem) && parsed.stem !== normalizedStem) {
      problems.push(
        `Feature contract filename must be lowercase "${normalizedStem}": ${relativePath}`
      );
    }
  }

  const isHookRolePath =
    relativePath.startsWith('features/') ||
    relativePath.startsWith('components/') ||
    relativePath.startsWith('src/react/') ||
    (parsed.isTest && (/^use[A-Z0-9]/.test(parsed.stem) || parsed.stem.startsWith('use-')));
  if (isHookRolePath) {
    const hookNames = parsed.isTest ? [] : exportedNames(filePath, 'use[A-Z]');
    const isHookFile =
      /^use[A-Z0-9]/.test(parsed.stem) || parsed.stem.startsWith('use-') || hookNames.length > 0;
    if (isHookFile && (!parsed.stem.startsWith('use') || !isCamelCase(parsed.stem))) {
      problems.push(`Hook filename must be camelCase and start with "use": ${relativePath}`);
    } else if (hookNames.length === 1 && parsed.stem !== hookNames[0]) {
      problems.push(`Hook filename must match exported hook "${hookNames[0]}": ${relativePath}`);
    }
  }

  if (isComponentDirectory(relativePath) && parsed.extension === '.tsx' && !parsed.isTest) {
    if (!isPascalCase(parsed.stem)) {
      problems.push(`React component filename must be PascalCase: ${relativePath}`);
    } else {
      const componentNames = exportedNames(filePath, '[A-Z]').filter(
        (name) => !TYPE_EXPORT_SUFFIXES.test(name)
      );
      if (componentNames.length === 1 && parsed.stem !== componentNames[0]) {
        problems.push(
          `React component filename must match exported component "${componentNames[0]}": ${relativePath}`
        );
      }
    }
  }

  if (isComponentDirectory(relativePath) && parsed.extension === '.tsx' && parsed.isTest) {
    const componentSiblingPath = filePath.replace(/\.test\.tsx$/, '.tsx');
    if (fs.existsSync(componentSiblingPath) && !isPascalCase(parsed.stem)) {
      problems.push(
        `React component test filename must match the PascalCase component filename: ${relativePath}`
      );
    }
  }
}

function validateDynamicSegments() {
  const appRoot = path.join(webRoot, 'app');
  for (const absolutePath of walk(appRoot)) {
    const relativePath = normalizePath(path.relative(appRoot, absolutePath));
    for (const segment of relativePath.split('/')) {
      const standardMatch = segment.match(/^\[(\.\.\.)?([^\]]+)\]$/);
      const optionalCatchAllMatch = segment.match(/^\[\[(\.\.\.)?([^\]]+)\]\]$/);
      const token = standardMatch?.[2] ?? optionalCatchAllMatch?.[2];
      if (token && !isCamelCase(token)) {
        problems.push(`Dynamic segment token must be camelCase: app/${relativePath}`);
      }
    }
  }
}

for (const filePath of walk(webRoot)) {
  validateFileName(filePath);
}
validateDynamicSegments();

if (problems.length > 0) {
  console.error('Web filename convention check failed:\n');
  for (const message of problems) {
    console.error(`- ${message}`);
  }
  process.exitCode = 1;
} else {
  console.log('Web filename convention check passed.');
}
