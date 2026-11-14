import { readFile, writeFile } from 'node:fs/promises';
import { exportPracticeSchemas } from '@ancora/schemas';

const output = new URL('../../../packages/schemas/practice-v1.schema.json', import.meta.url);
const schema = exportPracticeSchemas();
const content = JSON.stringify({ apiVersion: 1, contracts: schema }, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if ((await readFile(output, 'utf8')) !== content) {
    throw new Error('Wire schemas changed. Run pnpm contracts:generate.');
  }
} else {
  await writeFile(output, content);
}
