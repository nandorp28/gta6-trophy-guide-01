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

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

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
