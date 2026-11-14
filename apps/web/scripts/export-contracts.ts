import { readFile, writeFile } from 'node:fs/promises';
import { exportPracticeSchemas, exportGenerationSchemas } from '@ancora/schemas';

const artifacts = [
  {
    name: 'practice-v1.schema.json',
    schema: { apiVersion: 1, contracts: exportPracticeSchemas() },
  },
  {
    name: 'generation-v1.schema.json',
    schema: {
      schemaVersion: 1,
      contracts: exportGenerationSchemas(),
    },
  },
];
for (const artifact of artifacts) {
  const output = new URL(`../../../packages/schemas/${artifact.name}`, import.meta.url);
  const content = JSON.stringify(artifact.schema, null, 2) + '\n';
  if (process.argv.includes('--check')) {
    if ((await readFile(output, 'utf8')) !== content) {
      throw new Error('Wire schemas changed. Run pnpm contracts:generate.');
    }
  } else {
    await writeFile(output, content);
  }
}
