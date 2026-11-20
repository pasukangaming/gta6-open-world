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
// static files (game/index.html plus its ES modules), loads offline with no
// network request, and keeps its save in the browser's local storage.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const GAME_NAME = 'Solara Bay';
const GAME_BLURB =
  'An original top-down open-world crime game: explore a coastal city on foot ' +
  'and by car, steal cars, outrun the police, and finish five story missions.';
const SCREENSHOT_LIMIT_BYTES = 262144;
const SCREENSHOT_LIMIT_COUNT = 4;

// The scorer's caps, from the competition's gate: the text cap shapes the
// dossier's bytes, the rest make this program refuse exactly where the
// scorer would refuse an entry (too many screenshots, one too big, game/
// past 993 entries or 48 MiB, or a game path past 1000 bytes).
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: SCREENSHOT_LIMIT_COUNT, max_bytes: SCREENSHOT_LIMIT_BYTES },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function fail(message) {
  throw new Error(`${GAME_NAME}: ${message}`);
}

function checkShot(folder, name) {
  const info = statSync(join(folder, name));
  if (!info.isFile()) fail(`screenshots/${name} is not a file`);
  if (info.size > SCREENSHOT_LIMIT_BYTES) {
    fail(`screenshots/${name} is ${info.size} bytes, over the ${SCREENSHOT_LIMIT_BYTES} allowed`);
  }
  return { name, bytes: info.size };
}

function main() {
  const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)));
  const destination = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

  const gameFolder = join(repoRoot, 'game');
  const shotsFolder = join(repoRoot, 'screenshots');
  if (!existsSync(join(gameFolder, 'index.html'))) {
    fail('game/index.html is missing: the game must open from game/index.html');
  }
  if (!existsSync(shotsFolder)) fail('screenshots/ is missing: hand in 3 or 4 renders of the game');

  const shots = readdirSync(shotsFolder)
    .filter((name) => !name.startsWith('.'))
    .sort();
  if (shots.length < 3 || shots.length > SCREENSHOT_LIMIT_COUNT) {
    fail(`screenshots/ holds ${shots.length} images: hand in 3 or 4, the first by name the cover`);
  }
  const checkedShots = shots.map((name) => checkShot(shotsFolder, name));

  mkdirSync(destination, { recursive: true });
  cpSync(gameFolder, join(destination, 'game'), { recursive: true });
  cpSync(shotsFolder, join(destination, 'screenshots'), { recursive: true });

  const dossierPath = join(destination, 'dossier.json');
  writeFileSync(dossierPath, buildDossier(destination, DOSSIER_CAPS));

  const dossierBytes = statSync(dossierPath).size;
  console.log(`${GAME_NAME} — ${GAME_BLURB}`);
  console.log(`game/ and ${checkedShots.length} screenshots copied to ${destination}`);
  for (const shot of checkedShots) console.log(`  ${shot.name} (${shot.bytes} bytes)`);
  console.log(`dossier.json written (${dossierBytes} bytes)`);
}

main();
