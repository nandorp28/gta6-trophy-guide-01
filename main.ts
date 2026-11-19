// Leonida Legends — the entry program for the make.fun GTA 6 trophy guide
// bounty (Node 22, standard library only). It hands the guide in: it copies
// this repository's app/ and screenshots/ into the output directory and
// writes /output/dossier.json with buildDossier from the vendored make.fun
// library (vendor/makefun-frontend.ts, left unchanged). Outside the grader,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The output directory itself is never deleted or recreated here — the
// grader mounts it, so we only create it (recursively) and copy into it.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail fast with a clear message instead of handing in a half-built entry.
const appIndex = join(here, 'app', 'index.html');
const trophyData = join(here, 'app', 'data', 'trophies.json');
for (const needed of [appIndex, trophyData]) {
  if (!existsSync(needed)) throw new Error(`missing required file: ${needed}`);
}

mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'app'), join(outDir, 'app'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// Caps mirror the gate: at most 4 screenshots of 256 KiB, app/ at most
// 993 files and 48 MiB, and the dossier text capped at 160 KiB.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);

console.log(`Leonida Legends handed in to ${outDir}`);

// A short summary of what was handed in, so a failed or partial run is
// obvious from the log: entry counts and byte totals for app/ and
// screenshots/ next to the dossier.
function summarize(dir) {
  let files = 0;
  let bytes = 0;
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.isFile()) {
        files += 1;
        bytes += statSync(p).size;
      }
    }
  };
  walk(dir);
  return `${files} files, ${bytes} bytes`;
}
console.log(`app/: ${summarize(join(outDir, 'app'))}`);
console.log(`screenshots/: ${summarize(join(outDir, 'screenshots'))}`);
console.log(`dossier.json: ${statSync(join(outDir, 'dossier.json')).size} bytes`);
