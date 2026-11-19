// Leonida Atlas — the entry program for the gta6-trophy-guide-01 bounty.
// Node 22, standard library only. It copies this repository's app/ and
// screenshots/ into the output directory and writes /output/dossier.json with
// buildDossier from the vendored make.fun library, exactly as the kit asks.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The output directory is never deleted or recreated here: the grader mounts it.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// Caps mirror the scorer's: at most 4 screenshots, each at most 256 KiB;
// app/ at most 993 files and directories and 48 MiB in all. text_max_bytes
// shapes the dossier text the judge reads.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);

console.log(`Leonida Atlas dossier written to ${join(outputDir, 'dossier.json')}`);
