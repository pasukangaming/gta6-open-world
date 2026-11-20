// Solara Bay — the browser entry: loop, screens, save, screenshots.
// It wires the world, the renderer, the input and the sound together, and
// nothing else. The save lives in localStorage; the game itself never
// touches the network.

import { createWorld, EV_COIN, EV_HIT, EV_MISSION, EV_OVER, EV_SHOT, EV_WANTED } from './world.js';
import { render } from './render.js';
import { createInput } from './input.js';
import { applyShot } from './shots.js';
import { sounds, setMuted, isMuted } from './audio.js';

const SAVE_KEY = 'solara-bay-save-v1';

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { cash: 0, best: 0, missions: 0 };
    const parsed = JSON.parse(raw);
    return {
      cash: Number(parsed.cash) || 0,
      best: Number(parsed.best) || 0,
      missions: Number(parsed.missions) || 0,
    };
  } catch {
    return { cash: 0, best: 0, missions: 0 };
  }
}

function writeSave(save) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* private mode: play on without saving */ }
}

export function startGame(canvas) {
  const ctx = canvas.getContext('2d');
  const params = new URLSearchParams(window.location.search);
  const shotName = params.get('shot');
  const seed = Number(params.get('seed') || '1') || 1;

  const world = createWorld(seed);
  const input = createInput(canvas);
  const save = loadSave();

  let screen = 'start';
  let last = performance.now();

  // A shot mode renders one fixed scene and stops: the screenshot tool
  // waits for window.__shotReady, then captures the frame.
  if (shotName) {
    screen = applyShot(world, shotName, seed);
    world.step(0.016, { x: 0, y: 0, run: false, enter: false, shoot: false }, true);
    render(ctx, world, screen === 'playing' ? 'playing' : screen, save.best);
    window.__shotReady = true;
    document.title = screen === 'start' ? 'Solara Bay — Start' : screen === 'win' ? 'Solara Bay — You Own the City' : 'Solara Bay';
    return { world, save };
  }

  function playEvents(events) {
    if (events & EV_SHOT) sounds.shoot();
    if (events & EV_HIT) sounds.hit();
    if (events & EV_COIN) sounds.pickup();
    if (events & EV_WANTED) sounds.siren();
    if (events & EV_MISSION) {
      sounds.mission();
      save.missions = Math.max(save.missions, world.state.missionIndex);
      save.cash = world.state.cash;
      save.best = Math.max(save.best, world.state.cash);
      writeSave(save);
    }
    if (events & EV_OVER) {
      save.cash = world.state.cash;
      save.best = Math.max(save.best, world.state.cash);
      writeSave(save);
      screen = world.state.won ? 'win' : 'busted';
      document.title = screen === 'win' ? 'Solara Bay — You Own the City' : 'Solara Bay — Busted';
    }
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const ctrl = input.read(world.state.camera.x, world.state.camera.y);
    // Aim from the player, not from the camera corner.
    ctrl.aim = Math.atan2(ctrl.aimY - world.state.player.y, ctrl.aimX - world.state.player.x);
    if (ctrl.mute) setMuted(!isMuted());
    if (ctrl.pause && (screen === 'playing' || screen === 'pause')) {
      screen = screen === 'playing' ? 'pause' : 'playing';
      sounds.ui();
    }

    if (screen === 'start' || screen === 'win' || screen === 'busted') {
      // Wait for Space on the keydown listener; the loop just renders.
      if (window.__spacePressed) {
        window.__spacePressed = false;
        sounds.unlock();
        sounds.ui();
        world.reset();
        screen = 'playing';
        document.title = 'Solara Bay — Playing';
      }
    } else if (screen === 'playing') {
      const events = world.step(dt, ctrl, false);
      playEvents(events);
    }
    render(ctx, world, screen, save.best);
    requestAnimationFrame(frame);
  }

  window.__spacePressed = false;
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') window.__spacePressed = true;
  });

  document.title = 'Solara Bay — Start';
  requestAnimationFrame(frame);
  return { world, save };
}

// Boot when the page loads.
const canvas = document.getElementById('game');
if (canvas) startGame(canvas);
