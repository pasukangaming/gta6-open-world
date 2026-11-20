// Solara Bay — the make.fun gta6-01 entrypoint, written for this game.
// Node 22, standard library only, no build step: `node main.ts` hands the
// finished game in. It gathers the static game under game/, the renders
// under screenshots/, and asks the vendored make.fun library to summarise
// them into dossier.json, the file the judge reads.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output. Inside the
// grader the variable is unset and the dossier lands in /output.
//
// Solara Bay itself: an original top-down open-world crime game. Rico Marin
// returns to a coastal city he owes money to, steals cars, dodges the
// police, and works through five story missions — Meet Mara, Courier Run,
// Borrowed Wheels, Hot Pursuit, and The Last Getaway. The game is plain
// Canvas 2D, plays offline from its own static files, and makes its sound
// with the Web Audio API. Nothing here comes from Rockstar Games.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const GAME_NAME = 'Solara Bay';
const BLURB = 'An original top-down open-world crime game: explore a coastal city on foot and by car, steal cars, outrun the police, and finish five story missions.';

// The caps the bounty gives buildDossier, from its gate: at most 160 KiB
// of dossier text, at most 4 screenshots of at most 256 KiB each, and the
// game itself at most 993 files and 48 MiB in all.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function fail(message) {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

function checkShots(shotsDir) {
  if (!existsSync(shotsDir)) fail('screenshots/ is missing — take 3 or 4 real renders first');
  const names = readdirSync(shotsDir)
    .filter((n) => /\.(png|jpe?g)$/i.test(n))
    .sort();
  if (names.length < 3 || names.length > CAPS.screenshots.max) {
    fail(`screenshots/ holds ${names.length} images, need 3 to ${CAPS.screenshots.max}`);
  }
  for (const name of names) {
    const size = statSync(join(shotsDir, name)).size;
    if (size > CAPS.screenshots.max_bytes) fail(`${name} is ${size} bytes, over the 256 KiB cap`);
    console.log(`  ${name} — ${size} bytes`);
  }
  return names;
}

function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = resolve(here);
  const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || 'out');
  const gameDir = join(root, 'game');
  const shotsDir = join(root, 'screenshots');

  if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
  console.log(`${GAME_NAME}: ${BLURB}`);
  console.log(`copying game/ and screenshots/ into ${outDir}`);
  const shots = checkShots(shotsDir);

  mkdirSync(outDir, { recursive: true });
  cpSync(gameDir, join(outDir, 'game'), { recursive: true });
  cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

  const dossier = buildDossier(outDir, CAPS);
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  console.log(`wrote dossier.json — ${dossier.length} bytes, ${shots.length} screenshots, game ${GAME_NAME}`);
}

main();
