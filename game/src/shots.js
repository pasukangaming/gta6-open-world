// Solara Bay — deterministic screenshot scenes.
// Each shot sets the world to a fixed, seeded state so a screenshot is a
// real render of the game, not a picture pasted in. The seed comes from the
// URL (?shot=play&seed=1), so the same call always shows the same frame.

import { createWorld, EV_WANTED } from './world.js';

export function applyShot(world, name, seed) {
  const s = world.state;
  if (name === 'start') {
    // Title screen over the city, player on foot at the plaza.
    world.reset();
    s.player.x = 1600;
    s.player.y = 1250;
    s.camera.x = 960;
    s.camera.y = 890;
    return 'start';
  }
  if (name === 'end') {
    // The win screen: every mission done, cash in hand.
    world.reset();
    s.missionDone = true;
    s.won = true;
    s.cash = 1600;
    s.score = 1600;
    s.missionIndex = 5;
    s.missionMessage = 'All missions complete. Solara Bay is yours.';
    return 'win';
  }
  // 'play': a chase in progress, so the frame shows traffic, police, the
  // wanted stars, the HUD and the minimap all at once.
  world.reset();
  s.wanted = 2;
  s.crimeTimer = 0;
  s.player.inCar = true;
  const car = s.cars.find((c) => c.kind === 'parked' && c.active) || s.cars[0];
  if (car) {
    car.parked = false;
    car.stolen = true;
    car.kind = 'traffic';
    car.speed = 300;
    s.player.car = car;
    s.player.x = car.x;
    s.player.y = car.y;
    s.player.angle = car.angle;
  }
  s.message = 'Car stolen! The police are watching.';
  s.messageTimer = 4;
  // Run a second of police chase so the police cars are visible, not just spawned.
  for (let i = 0; i < 60; i += 1) world.step(1 / 60, { x: 0, y: -1, run: false, enter: false, shoot: false }, false);
  return 'playing';
}

export { EV_WANTED };
