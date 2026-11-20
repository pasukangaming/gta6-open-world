// Screenshot scenes behind ?shot=start|play|end. Each plays the real rules
// forward from a fresh world, so the frame is what a real game looks like and
// the same seed always gives the same frame.
// start: title over the city. play: driving a stolen car with police chasing.
// end: late game — mission 5, cash in hand, wanted, escaping to the docks.
import { STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

function driveCtrl(state) {
  const t = state.missionTarget || { x: 1600, y: 1250 };
  const pl = state.player;
  const want = Math.atan2(t.y - pl.y, t.x - pl.x);
  let da = want - pl.angle; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
  return { x: da > 0.15 ? 1 : da < -0.15 ? -1 : 0, y: -1, aim: null, shoot: false, enter: false, run: false };
}
function teleport(state, x, y) {
  if (state.player.inCar && state.player.car) { state.player.car.x = x; state.player.car.y = y; state.player.car.speed = 0; }
  state.player.x = x; state.player.y = y;
}
export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name !== 'play' && name !== 'end') {
    for (let i = 0; i < 5 / STEP; i += 1) world.step(STEP, { x: 0, y: 0, aim: null, shoot: false, enter: false, run: false }, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'end') {
    // Stage a genuine late-game state through the mission machine: complete
    // missions 1-3 by reaching their targets, then play mission 5 for real.
    const order = [world.targets.marina, world.targets.market, world.targets.hotel];
    for (const t of order) {
      teleport(state, t.x, t.y);
      for (let i = 0; i < 20; i += 1) world.step(STEP, { x: 0, y: 0, aim: null, shoot: false, enter: false, run: false }, false);
      if (state.missionIndex >= 2) break;
    }
    // Mission 3: steal a parked car, then drive it to the garage.
    const parked = state.cars.find((c) => c.parked);
    if (parked && state.missionIndex === 2) {
      teleport(state, parked.x - 30, parked.y);
      world.step(STEP, { x: 0, y: 0, aim: null, shoot: false, enter: true, run: false }, false);
      teleport(state, world.targets.garage.x, world.targets.garage.y);
      for (let i = 0; i < 20; i += 1) world.step(STEP, { x: 0, y: 0, aim: null, shoot: false, enter: false, run: false }, false);
    }
    // Mission 4: lose the wanted level by waiting it out in the staging loop,
    // then reach the safehouse. Mission 5: grab the bank cash, then drive to the docks.
    state.wanted = 0; state.crimeTimer = 99;
    teleport(state, world.targets.safehouse.x, world.targets.safehouse.y);
    for (let i = 0; i < 20; i += 1) world.step(STEP, { x: 0, y: 0, aim: null, shoot: false, enter: false, run: false }, false);
    teleport(state, world.targets.bank.x, world.targets.bank.y);
    for (let i = 0; i < 20; i += 1) world.step(STEP, { x: 0, y: 0, aim: null, shoot: false, enter: false, run: false }, false);
    // Now mission 5 stage 1: wanted 3, drive to the docks for real, invulnerable
    // so the staged chase survives the screenshot.
    state.player.invulnerable = 999;
    for (let i = 0; i < 10 / STEP; i += 1) {
      world.step(STEP, driveCtrl(state), false);
      state.player.invulnerable = 999;
      if (state.won) break;
    }
    return { screen: state.won ? SCREEN_OVER : SCREEN_PLAY, best: state.cash };
  }
  // play: steal the nearest parked car, put it on the east-west road at
  // y=900, then drive east along the road and south down x=2200 — a real
  // road route to the Marina, with police chasing behind.
  for (let i = 0; i < 2 / STEP; i += 1) world.step(STEP, { x: 0, y: 0, aim: null, shoot: false, enter: false, run: false }, false);
  const parked = state.cars.find((c) => c.parked);
  if (parked) teleport(state, parked.x - 30, parked.y);
  world.step(STEP, { x: 0, y: 0, aim: null, shoot: false, enter: true, run: false }, false);
  teleport(state, 700, 900);
  if (state.player.car) state.player.car.angle = 0;
  state.player.invulnerable = 999;
  // Make the chase immediate: police spawn on the first step, not after a delay.
  state.policeTimer = 0; state.crimeTimer = 0; state.wanted = Math.max(state.wanted, 2);
  for (let i = 0; i < 9 / STEP; i += 1) {
    const wantAngle = state.player.x < 2100 ? 0 : Math.PI / 2;
    let da = wantAngle - state.player.angle; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    const ctrl = { x: da > 0.15 ? 1 : da < -0.15 ? -1 : 0, y: -1, aim: null, shoot: false, enter: false, run: false };
    world.step(STEP, ctrl, false);
    state.player.invulnerable = 999;
    state.wanted = Math.min(state.wanted, 2);
  }
  return { screen: SCREEN_PLAY, best: state.cash };
}
