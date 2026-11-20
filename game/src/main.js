// Solara Bay boot and loop. Screens: title, play, paused, over (win/busted).
// ?seed=N fixes the city. ?shot=start|play|end stages that scene instead of
// running the loop, paints it twice and sets window.__shotReady.
import { BEST_KEY, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_COIN, EVENT_HIT, EVENT_MISSION, EVENT_OVER, EVENT_SHOT, EVENT_WANTED } from './world.js';
import { ACTION_CONFIRM, ACTION_ENTER, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readSave() {
  try { const s = JSON.parse(window.localStorage.getItem(BEST_KEY) || 'null'); if (s && typeof s.cash === 'number') return { cash: s.cash, best: s.best || s.cash, missions: s.missions || 0 }; } catch { /* ignore */ }
  return { cash: 0, best: 0, missions: 0 };
}
function writeSave(save) {
  try { window.localStorage.setItem(BEST_KEY, JSON.stringify(save)); } catch { /* storage off */ }
}
function runShot(name) {
  const scene = stageShot(name, world);
  const save = readSave();
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, { cash: world.state.cash, best: Math.max(save.best, world.state.cash) });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint); else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}
function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let save = readSave();
  let accumulator = 0, last = performance.now();
  let winShown = false;
  function announce(m) { status.textContent = m; }
  function startGame() {
    world.reset(); accumulator = 0; winShown = false; screen = SCREEN_PLAY;
    audio.unlock(); announce('Playing Solara Bay. Mission 1: Meet Mara.');
  }
  function endGame() {
    screen = SCREEN_OVER;
    save.best = Math.max(save.best, world.state.cash); save.cash = world.state.cash; save.missions = world.state.missionIndex;
    writeSave(save);
    announce(world.state.won ? `You own Solara Bay. Cash $${world.state.cash}.` : `Busted. Cash $${world.state.cash}.`);
  }
  function handleActions(actions) {
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
    else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; announce('Playing.'); }
    else if (actions & ACTION_CONFIRM && screen === SCREEN_WIN) { screen = SCREEN_PLAY; winShown = false; }
  }
  function step(actions) {
    if (screen === SCREEN_TITLE) { world.step(STEP, { x: 0, y: 0, aim: null, shoot: false, enter: false, run: false }, true); return; }
    const ctrl = input.control(world.state.camera, world.state.player);
    // Enter action is one-shot: pass it only on the frame it was taken.
    if (actions & ACTION_ENTER) ctrl.enter = true;
    const events = world.step(STEP, ctrl, false);
    if (events & EVENT_SHOT) audio.shoot();
    if (events & EVENT_COIN) audio.coin();
    if (events & EVENT_HIT) audio.hit();
    if (events & EVENT_WANTED) audio.siren();
    if (events & EVENT_MISSION) {
      audio.mission();
      save.cash = world.state.cash; save.best = Math.max(save.best, save.cash); save.missions = world.state.missionIndex; writeSave(save);
      if (world.state.missionDone) { endGame(); return; }
      screen = SCREEN_WIN; winShown = true;
    }
    if (events & EVENT_OVER) endGame();
  }
  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME); last = now;
    const actions = input.takeActions();
    handleActions(actions);
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY || screen === SCREEN_WIN) {
      if (screen === SCREEN_WIN && winShown) { accumulator = 0; renderer.draw(world.state, SCREEN_WIN, save); return; }
      let firstStep = true;
      while (accumulator >= STEP && screen !== SCREEN_PAUSED) { step(firstStep ? actions : 0); firstStep = false; accumulator -= STEP; if (screen === SCREEN_OVER) break; }
    } else accumulator = 0;
    renderer.draw(world.state, screen, save);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); } });
  announce('Solara Bay. Press Space or click to start.');
  requestAnimationFrame(frame);
}
if (shot) runShot(shot); else runGame();
