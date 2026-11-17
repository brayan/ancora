import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import { conventionsPlugin, conventionsRules } from '@ancora/config/eslint';

const require = createRequire(import.meta.url);

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [
      '**/.next/**',
      '**/out/**',
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/next-env.d.ts',
      '**/test-results/**',
      '**/playwright-report/**',
    ],
  },
  {
    settings: {
      next: { rootDir: path.dirname(fileURLToPath(import.meta.url)) },
      react: { version: require('react/package.json').version },
    },
    plugins: { ancora: conventionsPlugin },
    rules: conventionsRules,
  },
];

export default eslintConfig;
