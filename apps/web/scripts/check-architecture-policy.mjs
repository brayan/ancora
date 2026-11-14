#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

// Adapted from Sailtech Console Web at e2a6ce059ac53e4f57f17db14dd6521e3061585b.
const projectRoot = process.cwd();
const scanRoots = ['app', 'components', 'features', 'lib', 'server'].map((entry) =>
  path.join(projectRoot, entry)
);
const skipDirs = new Set([
  '.git',
  '.next',
  '.turbo',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'test-results',
]);
const violations = [];
const appRouterRoot = 'app';
const sourceFileExtensions = new Set([
  '.cjs',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.mts',
  '.ts',
  '.tsx',
]);
const appRouterContractNames = new Set([
  'apple-icon',
  'default',
  'error',
  'forbidden',
  'global-error',
  'global-not-found',
  'icon',
  'layout',
  'loading',
  'manifest',
  'not-found',
  'opengraph-image',
  'page',
  'robots',
  'route',
  'sitemap',
  'template',
  'twitter-image',
  'unauthorized',
]);
const forbiddenLayerFolderNames = new Set([
  'application',
  'domain',
  'infrastructure',
  'infra',
  'presenters',
  'presentation',
  'repositories',
  'use-cases',
  'usecases',
  'view-models',
  'viewmodels',
]);
const environmentAccessRestrictedRoots = ['app/', 'components/', 'features/', 'lib/'];
const environmentReadPattern = /\bprocess\.env\b/;
const misplacedBackendClientPattern =
  /^server\/(?!clients\/|db\/)[^/]+\/(?:[^/]+-)?client\.(?:cjs|cts|js|jsx|mjs|mts|ts|tsx)$/;
const serverOnlyDependencyPattern = /\b(?:import|require)\b[^\n;]*['"]server-only['"]/m;

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
      if (forbiddenLayerFolderNames.has(entry.name.toLowerCase())) {
        const relativePath = path.relative(projectRoot, absolutePath).replaceAll('\\', '/');
        violations.push(
          `forbidden Clean Architecture/MVVM folder "${entry.name}": ${relativePath}`
        );
      }
      walk(absolutePath, files);
      continue;
    }
    files.push(absolutePath);
  }
  return files;
}

function isAppRouterContractFile(relativePath) {
  const extension = path.posix.extname(relativePath);
  if (!sourceFileExtensions.has(extension)) {
    return true;
  }

  const fileName = path.posix.basename(relativePath, extension);
  const contractName = fileName.replace(/\.(?:spec|test)$/, '');
  return appRouterContractNames.has(contractName);
}

if (fs.existsSync(path.join(projectRoot, 'src'))) {
  violations.push('Do not add a top-level src layer to the Next.js app.');
}

for (const scanRoot of scanRoots) {
  for (const filePath of walk(scanRoot)) {
    const relativePath = path.relative(projectRoot, filePath).replaceAll('\\', '/');
    if (relativePath.includes('/sections/')) {
      violations.push(relativePath);
    }

    const isInsideAppRouterRoot =
      relativePath === appRouterRoot || relativePath.startsWith(`${appRouterRoot}/`);
    if (isInsideAppRouterRoot && !isAppRouterContractFile(relativePath)) {
      violations.push(`implementation file inside App Router tree: ${relativePath}`);
    }

    const isSourceFile = sourceFileExtensions.has(path.extname(relativePath));
    if (isSourceFile && misplacedBackendClientPattern.test(relativePath)) {
      violations.push(`backend client implementation outside server/clients: ${relativePath}`);
    }

    const isLibSource = relativePath.startsWith('lib/') && isSourceFile;
    const hasRestrictedEnvironmentAccess =
      isSourceFile &&
      environmentAccessRestrictedRoots.some((root) => relativePath.startsWith(root));
    const isTestSource = /\.(?:spec|test)\.[^.]+$/.test(relativePath);
    if (hasRestrictedEnvironmentAccess && !isTestSource) {
      const source = fs.readFileSync(filePath, 'utf8');
      if (isLibSource && serverOnlyDependencyPattern.test(source)) {
        violations.push(`server-only module inside client-safe lib tree: ${relativePath}`);
      }
      if (environmentReadPattern.test(source)) {
        violations.push(`environment read outside server tree: ${relativePath}`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error('Ancora Web architecture policy failed.');
  console.error(
    'Use feature-first folders; `app/**` contains only App Router contracts, `lib/**` stays client-safe, and `sections` and Clean Architecture/MVVM layer folders are deprecated.'
  );
  for (const violation of violations.sort()) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Ancora Web architecture policy passed.');
