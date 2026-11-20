// Solara Bay — the world: city, people, cars, police, missions.
// No drawing, no browser, no sound: step() advances one fixed timestep and
// returns a bitmask of events the main loop turns into sound and screens.
// The city is seeded, so the same seed always builds the same Solara Bay.

import { CAR, GAME, MISSIONS, PLACES, PLAYER, POLICE, WORLD } from './config.js';

export const EV_HIT = 1;
export const EV_COIN = 2;
export const EV_OVER = 4;
export const EV_MISSION = 8;
export const EV_WANTED = 16;
export const EV_SHOT = 32;

const VERTICAL_ROADS = [400, 1000, 1600, 2200, 2800];
const HORIZONTAL_ROADS = [400, 900, 1400, 1900];
const ROAD_HALF = 60;

function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const clampN = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const dist2 = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

export function createWorld(seed) {
  const rand = seeded(seed || 1);

  // --- City blocks -------------------------------------------------------
  const blocks = [];
  const palette = ['#7a6a8a', '#8a7a5a', '#5a7a8a', '#9a5a6a', '#6a8a5a', '#8a6a3a'];
  for (let i = 0; i < VERTICAL_ROADS.length - 1; i += 1) {
    for (let j = 0; j < HORIZONTAL_ROADS.length - 1; j += 1) {
      const x0 = VERTICAL_ROADS[i] + 90;
      const y0 = HORIZONTAL_ROADS[j] + 90;
      const w = VERTICAL_ROADS[i + 1] - VERTICAL_ROADS[i] - 180;
      const h = HORIZONTAL_ROADS[j + 1] - HORIZONTAL_ROADS[j] - 180;
      if (w < 80 || h < 60) continue;
      if (i === 1 && j === 1) { blocks.push({ x: x0, y: y0, w, h, kind: 'park', color: '#3a7a4a' }); continue; }
      if (i === 2 && j === 2) { blocks.push({ x: x0, y: y0, w, h, kind: 'plaza', color: '#8a8a7a' }); continue; }
      const bw = w * (0.45 + rand() * 0.25);
      const bh = h * (0.45 + rand() * 0.25);
      blocks.push({
        x: x0 + (w - bw) / 2, y: y0 + (h - bh) / 2, w: bw, h: bh,
        kind: 'building', color: palette[Math.floor(rand() * palette.length)],
      });
    }
  }

  // --- Cars --------------------------------------------------------------
  const paint = ['#f2c94c', '#7ad06a', '#c98ad6', '#e8e0d0', '#4fc3f7', '#e05a4f'];
  function newCar(x, y, angle, kind, color) {
    return {
      x, y, angle, speed: 0, kind, color,
      health: kind === 'police' ? 60 : CAR.health,
      parked: kind === 'parked', stolen: false, active: true, vertical: false,
    };
  }
  const cars = [];
  for (let i = 0; i < 10; i += 1) {
    const vertical = rand() < 0.5;
    const road = vertical
      ? VERTICAL_ROADS[Math.floor(rand() * VERTICAL_ROADS.length)]
      : HORIZONTAL_ROADS[Math.floor(rand() * HORIZONTAL_ROADS.length)];
    const along = 100 + rand() * (WORLD.width - 200);
    const angle = vertical ? (rand() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (rand() < 0.5 ? 0 : Math.PI);
    const car = newCar(vertical ? road : along, vertical ? along : road, angle, 'traffic', paint[i % paint.length]);
    car.speed = 120 + rand() * 70;
    car.vertical = vertical;
    cars.push(car);
  }
  for (let i = 0; i < 6; i += 1) {
    cars.push(newCar(VERTICAL_ROADS[i % VERTICAL_ROADS.length] + 90, 500 + i * 300, 0, 'parked', paint[(i + 2) % paint.length]));
  }

  // --- People, pickups, bullets ------------------------------------------
  const peds = [];
  for (let i = 0; i < 14; i += 1) {
    peds.push({
      x: 200 + rand() * 2800, y: 200 + rand() * 1900,
      angle: rand() * Math.PI * 2, speed: 35 + rand() * 25,
      timer: 1 + rand() * 3, flee: 0,
    });
  }
  const pickups = [];
  for (let i = 0; i < 12; i += 1) pickups.push({ x: 200 + rand() * 2800, y: 200 + rand() * 1900, kind: 'cash', active: true, timer: 0 });
  for (let i = 0; i < 4; i += 1) pickups.push({ x: 300 + rand() * 2600, y: 300 + rand() * 1800, kind: 'health', active: true, timer: 0 });
  const bullets = [];
  for (let i = 0; i < 32; i += 1) bullets.push({ x: 0, y: 0, vx: 0, vy: 0, active: false, life: 0, fromPolice: false });

  // --- Player and state ----------------------------------------------------
  const player = {
    x: 1600, y: 1250, angle: -Math.PI / 2, health: PLAYER.health,
    inCar: false, car: null, invulnerable: 0, shootCooldown: 0,
  };
  const state = {
    player, cars, peds, pickups, bullets, blocks,
    roadsV: VERTICAL_ROADS, roadsH: HORIZONTAL_ROADS,
    cash: 0, score: 0, lives: GAME.lives, elapsed: 0,
    wanted: 0, wantedTimer: 0, crimeTimer: 0,
    missionIndex: 0, missionStage: 0, missionTarget: PLACES.marina,
    missionMessage: MISSIONS[0].brief, missionDone: false, won: false,
    message: 'Welcome to Solara Bay.', messageTimer: 4,
    camera: { x: 1600, y: 1250 }, policeTimer: 0,
  };

  function setMission(index, stage) {
    state.missionIndex = index;
    state.missionStage = stage;
    const m = MISSIONS[index];
    if (!m) {
      state.missionDone = true;
      state.won = true;
      state.missionMessage = 'All missions complete. Solara Bay is yours.';
      return;
    }
    let target = PLACES.marina;
    if (m.kind === 'pickup-deliver') target = stage === 0 ? PLACES.market : PLACES.hotel;
    else if (m.kind === 'steal') target = stage === 0 ? null : PLACES.garage;
    else if (m.kind === 'escape') target = PLACES.safehouse;
    else if (m.kind === 'heist') target = stage === 0 ? PLACES.bank : PLACES.docks;
    state.missionTarget = target;
    state.missionMessage = m.brief + (stage === 1 && m.kind === 'pickup-deliver' ? ' Package collected — now deliver it.' : '');
    if (m.kind === 'escape' && stage === 0) { state.wanted = 3; state.crimeTimer = 0; }
    if (m.kind === 'heist' && stage === 1) state.wanted = Math.max(state.wanted, 3);
  }

  function completeMission() {
    const m = MISSIONS[state.missionIndex];
    if (!m) return 0;
    state.cash += m.reward;
    state.score = state.cash;
    state.message = `Mission complete: ${m.title} — +$${m.reward}`;
    state.messageTimer = 4;
    setMission(state.missionIndex + 1, 0);
    return EV_MISSION;
  }

  function addWanted(n) {
    const before = state.wanted;
    state.wanted = clampN(state.wanted + n, 0, 5);
    state.crimeTimer = 0;
    return state.wanted !== before ? EV_WANTED : 0;
  }

  function pushOutOfBlocks(x, y, r) {
    let hit = false;
    for (const b of blocks) {
      if (b.kind !== 'building') continue;
      const cx = clampN(x, b.x, b.x + b.w);
      const cy = clampN(y, b.y, b.y + b.h);
      const dx = x - cx;
      const dy = y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < r * r) {
        hit = true;
        if (d2 > 0.01) {
          const d = Math.sqrt(d2);
          x = cx + (dx / d) * r;
          y = cy + (dy / d) * r;
        } else {
          const dl = x - b.x, dr = b.x + b.w - x, dt = y - b.y, db = b.y + b.h - y;
          const m = Math.min(dl, dr, dt, db);
          if (m === dl) x = b.x - r;
          else if (m === dr) x = b.x + b.w + r;
          else if (m === dt) y = b.y - r;
          else y = b.y + b.h + r;
        }
      }
    }
    return { x, y, hit };
  }

  function nearestCar(maxD) {
    let best = null;
    let bd = maxD;
    for (const c of cars) {
      if (!c.active) continue;
      const d = dist2(player.x, player.y, c.x, c.y);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  function spawnPolice() {
    let count = 0;
    for (const c of cars) if (c.active && c.kind === 'police') count += 1;
    if (count >= state.wanted) return;
    const a = rand() * Math.PI * 2;
    cars.push(newCar(
      clampN(player.x + Math.cos(a) * 600, 100, WORLD.width - 100),
      clampN(player.y + Math.sin(a) * 600, 100, WORLD.height - 100),
      a, 'police', '#3a6ad8',
    ));
  }

  function fireBullet(fromX, fromY, angle, fromPolice) {
    for (const b of bullets) {
      if (b.active) continue;
      b.active = true;
      b.x = fromX; b.y = fromY;
      b.vx = Math.cos(angle) * 700; b.vy = Math.sin(angle) * 700;
      b.life = 1.2; b.fromPolice = fromPolice;
      return true;
    }
    return false;
  }

  function reset() {
    player.x = 1600; player.y = 1250; player.angle = -Math.PI / 2;
    player.health = PLAYER.health; player.inCar = false; player.car = null; player.invulnerable = 0;
    state.cash = 0; state.score = 0; state.lives = GAME.lives; state.elapsed = 0;
    state.wanted = 0; state.wantedTimer = 0; state.crimeTimer = 0;
    state.missionIndex = 0; state.missionStage = 0; state.won = false; state.missionDone = false;
    state.messageTimer = 4;
    for (const c of cars) if (c.kind === 'police') c.active = false;
    for (const p of pickups) p.active = true;
    for (const b of bullets) b.active = false;
    setMission(0, 0);
    state.message = 'Welcome to Solara Bay.';
  }

  function step(dt, ctrl, harmless) {
    let events = 0;
    state.elapsed += dt;
    if (state.messageTimer > 0) state.messageTimer -= dt;
    if (player.invulnerable > 0) player.invulnerable -= dt;
    if (player.shootCooldown > 0) player.shootCooldown -= dt;

    // Wanted stars fade after a quiet spell.
    state.crimeTimer += dt;
    if (state.wanted > 0 && state.crimeTimer > GAME.wantedDecaySeconds) {
      state.wanted -= 1;
      state.crimeTimer = 0;
      events |= EV_WANTED;
    }

    // --- Moving: driving or on foot ---------------------------------------
    if (player.inCar && player.car) {
      const car = player.car;
      car.speed += CAR.accel * -ctrl.y * dt;
      car.speed *= Math.pow(0.4, dt);
      car.speed = clampN(car.speed, -CAR.reverseSpeed, CAR.maxSpeed);
      if (Math.abs(car.speed) > 20) {
        car.angle += ctrl.x * CAR.turn * (car.speed / CAR.maxSpeed) * dt * (car.speed < 0 ? -1 : 1);
      }
      const nx = car.x + Math.cos(car.angle) * car.speed * dt;
      const ny = car.y + Math.sin(car.angle) * car.speed * dt;
      const hit = pushOutOfBlocks(nx, ny, 26);
      if (hit.hit) car.speed *= 0.3;
      car.x = clampN(hit.x, 40, WORLD.width - 40);
      car.y = clampN(hit.y, 40, WORLD.height - 40);
      player.x = car.x; player.y = car.y; player.angle = car.angle;
      for (const p of peds) {
        if (dist2(car.x, car.y, p.x, p.y) < 34 && Math.abs(car.speed) > 120) {
          p.flee = 3;
          events |= addWanted(1);
          state.message = 'Careful — you hit a pedestrian!';
          state.messageTimer = 3;
        }
      }
    } else {
      const len = Math.hypot(ctrl.x, ctrl.y);
      if (len > 0.01) {
        const speed = ctrl.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
        const nx = player.x + (ctrl.x / Math.max(1, len)) * speed * dt;
        const ny = player.y + (ctrl.y / Math.max(1, len)) * speed * dt;
        const hit = pushOutOfBlocks(nx, ny, PLAYER.radius);
        player.x = clampN(hit.x, 30, WORLD.width - 30);
        player.y = clampN(hit.y, 30, WORLD.height - 30);
        player.angle = Math.atan2(ctrl.y, ctrl.x);
      }
      if (typeof ctrl.aim === 'number') player.angle = ctrl.aim;
    }

    // --- Getting in and out of cars ----------------------------------------
    if (ctrl.enter) {
      if (player.inCar) {
        const c = player.car;
        player.inCar = false; player.car = null;
        player.x = c.x + Math.cos(c.angle + Math.PI / 2) * 40;
        player.y = c.y + Math.sin(c.angle + Math.PI / 2) * 40;
      } else {
        const c = nearestCar(60);
        if (c) {
          player.inCar = true; player.car = c;
          if (c.parked) {
            c.parked = false; c.stolen = true; c.kind = 'traffic';
            events |= addWanted(1);
            state.message = 'Car stolen! The police are watching.';
            state.messageTimer = 3;
          }
        }
      }
    }

    // --- Shooting on foot ---------------------------------------------------
    if (ctrl.shoot && !player.inCar && player.shootCooldown <= 0) {
      player.shootCooldown = 0.28;
      fireBullet(player.x + Math.cos(player.angle) * 22, player.y + Math.sin(player.angle) * 22, player.angle, false);
      events |= EV_SHOT;
    }

    // --- Traffic keeps moving ----------------------------------------------
    for (const c of cars) {
      if (!c.active || c === player.car || c.kind === 'parked' || c.kind === 'police') continue;
      if (c.vertical) c.y += c.speed * dt * Math.sin(c.angle);
      else c.x += c.speed * dt * Math.cos(c.angle);
      if (c.x < 60 || c.x > WORLD.width - 60 || c.y < 60 || c.y > WORLD.height - 60) {
        if (c.vertical) c.y = c.angle > 0 ? 80 : WORLD.height - 80;
        else c.x = Math.cos(c.angle) > 0 ? 80 : WORLD.width - 80;
      }
    }

    // --- Police --------------------------------------------------------------
    if (state.wanted > 0 && !harmless) {
      state.policeTimer -= dt;
      if (state.policeTimer <= 0) { spawnPolice(); state.policeTimer = 2; }
      for (const c of cars) {
        if (!c.active || c.kind !== 'police') continue;
        const want = Math.atan2(player.y - c.y, player.x - c.x);
        let da = want - c.angle;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        c.angle += clampN(da, -2.2 * dt, 2.2 * dt);
        c.speed = POLICE.chaseSpeed;
        c.x += Math.cos(c.angle) * c.speed * dt;
        c.y += Math.sin(c.angle) * c.speed * dt;
        const phit = pushOutOfBlocks(c.x, c.y, 26);
        if (phit.hit) { c.x = phit.x; c.y = phit.y; c.speed = 0; }
        c.x = clampN(c.x, 40, WORLD.width - 40);
        c.y = clampN(c.y, 40, WORLD.height - 40);
        if (dist2(c.x, c.y, player.x, player.y) < 44 && player.invulnerable <= 0) {
          player.health -= POLICE.ramDamage;
          player.invulnerable = 0.6;
          events |= EV_HIT;
          if (player.inCar && player.car) player.car.health -= 10;
          c.speed = 0;
        }
        if (dist2(c.x, c.y, player.x, player.y) < POLICE.shootRange && rand() < dt * 0.7) {
          fireBullet(c.x, c.y, want + (rand() - 0.5) * 0.3, true);
        }
      }
    }

    // --- Pedestrians wander and flee -----------------------------------------
    for (const p of peds) {
      p.timer -= dt;
      if (p.timer <= 0) { p.angle = rand() * Math.PI * 2; p.timer = 2 + rand() * 3; }
      const sp = p.flee > 0 ? 140 : p.speed;
      if (p.flee > 0) p.flee -= dt;
      p.x = clampN(p.x + Math.cos(p.angle) * sp * dt, 30, WORLD.width - 30);
      p.y = clampN(p.y + Math.sin(p.angle) * sp * dt, 30, WORLD.height - 30);
    }

    // --- Bullets ---------------------------------------------------------------
    for (const b of bullets) {
      if (!b.active) continue;
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || b.x < 0 || b.x > WORLD.width || b.y < 0 || b.y > WORLD.height) { b.active = false; continue; }
      if (!b.fromPolice) {
        let spent = false;
        for (const c of cars) {
          if (!c.active || c === player.car) continue;
          if (dist2(b.x, b.y, c.x, c.y) < 30) {
            b.active = false; spent = true; c.health -= 25;
            if (c.kind === 'police' && c.health <= 0) {
              c.active = false; state.cash += GAME.policeKillReward; state.score = state.cash;
              events |= addWanted(1);
            }
            break;
          }
        }
        if (spent) continue;
        for (const p of peds) {
          if (dist2(b.x, b.y, p.x, p.y) < 18) {
            b.active = false; p.flee = 4;
            p.angle = Math.atan2(p.y - player.y, p.x - player.x);
            events |= addWanted(1);
            break;
          }
        }
      } else if (dist2(b.x, b.y, player.x, player.y) < 16 && player.invulnerable <= 0) {
        b.active = false; player.health -= POLICE.shotDamage; player.invulnerable = 0.4;
        events |= EV_HIT;
      }
    }

    // --- Pickups ---------------------------------------------------------------
    for (const p of pickups) {
      if (!p.active) { p.timer -= dt; if (p.timer <= 0) p.active = true; continue; }
      if (dist2(player.x, player.y, p.x, p.y) < 34) {
        p.active = false; p.timer = 20;
        if (p.kind === 'cash') { state.cash += GAME.cashPickup; state.score = state.cash; }
        else player.health = Math.min(PLAYER.health, player.health + GAME.healthPickup);
        events |= EV_COIN;
      }
    }

    // --- Missions ----------------------------------------------------------------
    if (!state.missionDone && !harmless) {
      const m = MISSIONS[state.missionIndex];
      if (m) {
        const at = (t) => t && dist2(player.x, player.y, t.x, t.y) < 70;
        if (m.kind === 'goto' && at(state.missionTarget)) events |= completeMission();
        else if (m.kind === 'pickup-deliver') {
          if (state.missionStage === 0 && at(state.missionTarget)) {
            setMission(1, 1);
            state.message = 'Package collected — deliver it to the hotel.';
            state.messageTimer = 3;
          } else if (state.missionStage === 1 && at(state.missionTarget)) events |= completeMission();
        } else if (m.kind === 'steal') {
          if (state.missionStage === 0 && player.inCar && player.car && player.car.stolen) setMission(2, 1);
          else if (state.missionStage === 1 && at(state.missionTarget)) events |= completeMission();
        } else if (m.kind === 'escape') {
          if (state.wanted === 0 && at(state.missionTarget)) events |= completeMission();
        } else if (m.kind === 'heist') {
          if (state.missionStage === 0 && at(state.missionTarget)) {
            state.cash += GAME.bankGrab; state.score = state.cash;
            setMission(4, 1);
            state.message = 'Cash grabbed! Get to the docks.';
            state.messageTimer = 3;
          } else if (state.missionStage === 1 && at(state.missionTarget)) events |= completeMission();
        }
      }
    }
    if (state.missionDone) { state.won = true; events |= EV_OVER; }

    // --- Health and lives --------------------------------------------------------
    if (player.health <= 0) {
      state.lives -= 1;
      player.health = PLAYER.health;
      player.invulnerable = 2;
      player.x = 1600; player.y = 1250; player.inCar = false; player.car = null;
      state.wanted = Math.max(0, state.wanted - 1);
      events |= EV_HIT;
      if (state.lives <= 0) events |= EV_OVER;
    }
    if (player.inCar && player.car && player.car.health <= 0) {
      player.car.active = false; player.inCar = false; player.car = null;
      player.health -= 20;
    }

    // Camera follows the player, clamped to the city.
    state.camera.x = clampN(player.x - 640, 0, WORLD.width - 1280);
    state.camera.y = clampN(player.y - 360, 0, WORLD.height - 720);
    return events;
  }

  reset();
  return { state, reset, step, setMission, completeMission, targets: PLACES };
}
