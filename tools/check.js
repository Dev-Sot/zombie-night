// Chequeo rápido de sintaxis de todos los módulos (npm run check).
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : [];
  });
}

let bad = 0;
for (const file of walk('src')) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (e) {
    bad++;
    console.error(`✗ ${file}\n${e.stderr}`);
  }
}
console.log(bad ? `${bad} archivo(s) con errores` : 'OK: sin errores de sintaxis');
process.exit(bad ? 1 : 0);
