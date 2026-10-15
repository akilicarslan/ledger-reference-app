import { transformSync } from '@babel/core';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * React Compiler report.
 *
 * Runs babel-plugin-react-compiler on each .tsx source file of the shared
 * packages and the apps, and counts the components and hooks that it
 * compiles or skips. The apps use the same compiler (Metro: app.json
 * `experiments.reactCompiler`; Vite: `reactCompilerPreset`).
 *
 * Usage: pnpm compiler:report
 */

const ROOT = join(import.meta.dirname, '..');
const SOURCE_DIRS = [
  'packages/ui/src',
  'packages/features/src',
  'packages/core/src',
  'apps/mobile',
];
const SKIP = /node_modules|\/ios\/|\/android\/|__tests__|\.stories\.tsx$|\.test\.tsx$|\/e2e\//;

interface Outcome {
  file: string;
  name: string;
  status: 'compiled' | 'skipped' | 'failed';
  reason?: string;
}

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (SKIP.test(path)) return [];
    if (statSync(path).isDirectory()) return listFiles(path);
    return path.endsWith('.tsx') ? [path] : [];
  });
}

const outcomes: Outcome[] = [];

for (const dir of SOURCE_DIRS) {
  for (const path of listFiles(join(ROOT, dir))) {
    const file = relative(ROOT, path);
    transformSync(readFileSync(path, 'utf8'), {
      filename: path,
      babelrc: false,
      configFile: false,
      presets: [['@babel/preset-typescript', { isTSX: true, allExtensions: true }]],
      plugins: [
        [
          'babel-plugin-react-compiler',
          {
            panicThreshold: 'none',
            logger: {
              logEvent(_filename: string | null, event: Record<string, unknown>) {
                const name = String(event.fnName ?? '(anonymous)');
                if (event.kind === 'CompileSuccess') {
                  outcomes.push({ file, name, status: 'compiled' });
                } else if (event.kind === 'CompileError' || event.kind === 'PipelineError') {
                  const detail = event.detail as { reason?: string } | undefined;
                  outcomes.push({
                    file,
                    name,
                    status: 'failed',
                    reason: detail?.reason ?? String(event.kind),
                  });
                } else if (event.kind === 'CompileSkip') {
                  outcomes.push({
                    file,
                    name,
                    status: 'skipped',
                    reason: String(event.reason ?? ''),
                  });
                }
              },
            },
          },
        ],
      ],
    });
  }
}

const count = (status: Outcome['status']) =>
  outcomes.filter((item) => item.status === status).length;
const lines = [
  `React Compiler report (${new Set(outcomes.map((item) => item.file)).size} files)`,
  `  compiled: ${count('compiled')}`,
  `  skipped:  ${count('skipped')}`,
  `  failed:   ${count('failed')}`,
  ...outcomes
    .filter((outcome) => outcome.status !== 'compiled')
    .map((item) => `  - ${item.status} ${item.file} ${item.name}: ${item.reason}`),
];
process.stdout.write(`${lines.join('\n')}\n`);
if (count('failed') > 0) process.exitCode = 1;
