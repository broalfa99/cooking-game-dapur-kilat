// Dapur Kilat — hand-in program (Node 22+, standard library only).
//
// The game lives in game/ as plain static files: game/index.html opens in a
// desktop browser and plays with no network request. This program copies
// game/ and screenshots/ beside this file into the output directory and
// writes /output/dossier.json, the summary the judge reads, using the
// vendored make.fun library (vendor/makefun-game.ts, kit copy, unchanged).
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function fail(message) {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

// Refuse a hand-in that the sealed gate would refuse, with a plain message.
const gameDir = join(repoRoot, 'game');
if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
const shotsDir = join(repoRoot, 'screenshots');
const shots = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter((name) => !name.startsWith('.'))
  : [];
if (shots.length < 3 || shots.length > 4) {
  fail(`screenshots/ must hold 3 or 4 images, found ${shots.length}`);
}
for (const name of shots) {
  const bytes = statSync(join(shotsDir, name)).size;
  if (bytes > 262144) fail(`screenshot ${name} is ${bytes} bytes, over the 256 KiB cap`);
}

mkdirSync(outDir, { recursive: true });
cpSync(gameDir, join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

// The scorer's caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(`Dapur Kilat handed in: ${shots.length} screenshots, dossier written to ${outDir}`);
