/**
 * Writes or checks apps/server/openapi.json.
 *
 *   tsx scripts/openapi.ts write   writes the file from the Zod schemas
 *   tsx scripts/openapi.ts check   fails if the file is not up to date (CI)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildOpenApiDocument } from '@ledger/contracts';

const target = fileURLToPath(new URL('../openapi.json', import.meta.url));
const generated = `${JSON.stringify(buildOpenApiDocument(), null, 2)}\n`;
const mode = process.argv[2];

if (mode === 'write') {
  writeFileSync(target, generated);
  console.log(`Wrote ${target}`);
} else if (mode === 'check') {
  let current = '';
  try {
    current = readFileSync(target, 'utf8');
  } catch {
    // The file does not exist. The comparison below fails.
  }
  if (current !== generated) {
    console.error(
      'openapi.json is not up to date. Run "pnpm openapi:generate" and commit the result.',
    );
    process.exit(1);
  }
  console.log('openapi.json is up to date.');
} else {
  console.error('Usage: tsx scripts/openapi.ts <write|check>');
  process.exit(2);
}
