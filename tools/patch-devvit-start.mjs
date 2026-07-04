import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const packagePath = require.resolve('@devvit/start/package.json');
const pluginPath = join(dirname(packagePath), 'vite/index.js');

const source = readFileSync(pluginPath, 'utf8');
const patched = source
  .replace(/\n\s+sourcemapFileNames: '\[name\]\.js\.map',/u, '')
  .replace('inlineDynamicImports: true,', 'codeSplitting: false,');

if (patched !== source) {
  writeFileSync(pluginPath, patched);
}
