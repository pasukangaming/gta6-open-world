// Solara Bay world: no drawing, no browser. A 3200x2400 original city with
// roads, buildings, traffic, pedestrians, police, pickups, bullets and a
// five-mission story. step() advances one fixed step and returns event flags.
import { CAR, CASH_PICKUP, FIELD, LIVES, MISSIONS, PLAYER, WANTED_DECAY_SECONDS, WORLD } from './config.js';

export const EVENT_HIT = 1;
export const EVENT_COIN = 2;
export const EVENT_OVER = 4;
export const EVENT_MISSION = 8;
export const EVENT_WANTED = 16;
export const EVENT_SHOT = 32;

const ROADS_V = [400, 1000, 1600, 2200, 2800];
const ROADS_H = [400, 900, 1400, 1900];
const ROAD_W = 120;
const TARGETS = {
  marina: { x: 2800, y: 1900, label: 'Marina' },
  market: { x: 1000, y: 900, label: 'Market' },
  hotel: { x: 1600, y: 400, label: 'Hotel' },
  garage: { x: 400, y: 1400, label: 'Garage' },
  safehouse: { x: 400, y: 400, label: 'Safehouse' },
  bank: { x: 1600, y: 1400, label: 'Bank Plaza' },
  docks: { x: 2800, y: 2150, label: 'Docks' },
};
function dist(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

export function createWorld(random) {
  // Buildings: one per city block between roads, seeded, never on a road.
  const buildings = [];
  const cols = ['#7a6a8a', '#8a7a5a', '#5a7a8a', '#9a5a6a', '#6a8a5a', '#8a6a3a'];
  for (let i = 0; i < ROADS_V.length - 1; i += 1) {
    for (let j = 0; j < ROADS_H.length - 1; j += 1) {
      const x0 = ROADS_V[i] + 90, y0 = ROADS_H[j] + 90;
      const w = ROADS_V[i + 1] - ROADS_V[i] - 180, h = ROADS_H[j + 1] - ROADS_H[j] - 180;
      if (w < 80 || h < 60) continue;
      // Park in one block, plaza in another, buildings elsewhere.
      if (i === 1 && j === 1) { buildings.push({ x: x0, y: y0, w, h, park: true, color: '#3a7a4a' }); continue; }
      if (i === 2 && j === 2) { buildings.push({ x: x0, y: y0, w, h, plaza: true, color: '#8a8a7a' }); continue; }
      const bw = w * (0.45 + random() * 0.25), bh = h * (0.45 + random() * 0.25);
      buildings.push({ x: x0 + (w - bw) / 2, y: y0 + (h - bh) / 2, w: bw, h: bh, color: cols[Math.floor(random() * cols.length)] });
    }
  }
  function makeCar(x, y, angle, kind, color) {
    return { x, y, angle, speed: 0, kind, color, health: kind === 'police' ? 60 : CAR.health, parked: kind === 'parked', stolen: false, active: true };
  }
  const cars = [];
  const trafficColors = ['#f2c94c', '#7ad06a', '#c98ad6', '#e8e0d0', '#4fc3f7'];
  for (let i = 0; i < 10; i += 1) {
    const vertical = random() < 0.5;
    const road = vertical ? ROADS_V[Math.floor(random() * ROADS_V.length)] : ROADS_H[Math.floor(random() * ROADS_H.length)];
    const along = 100 + random() * (WORLD.width - 200);
    cars.push(makeCar(vertical ? road : along, vertical ? along : road, vertical ? (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (random() < 0.5 ? 0 : Math.PI), 'traffic', trafficColors[i % trafficColors.length]));
    cars[cars.length - 1].speed = 120 + random() * 70;
    cars[cars.length - 1].vertical = vertical;
  }
  for (let i = 0; i < 6; i += 1) {
    const road = ROADS_V[i % ROADS_V.length];
    cars.push(makeCar(road + 90, 500 + i * 300, 0, 'parked', trafficColors[(i + 2) % trafficColors.length]));
  }
  const peds = [];
  for (let i = 0; i < 14; i += 1) {
    peds.push({ x: 200 + random() * 2800, y: 200 + random() * 1900, angle: random() * Math.PI * 2, speed: 35 + random() * 25, timer: 1 + random() * 3, flee: 0 });
  }
  const pickups = [];
  for (let i = 0; i < 12; i += 1) pickups.push({ x: 200 + random() * 2800, y: 200 + random() * 1900, kind: 'cash', active: true, timer: 0 });
  for (let i = 0; i < 4; i += 1) pickups.push({ x: 300 + random() * 2600, y: 300 + random() * 1800, kind: 'health', active: true, timer: 0 });
  const bullets = [];
  for (let i = 0; i < 32; i += 1) bullets.push({ x: 0, y: 0, vx: 0, vy: 0, active: false, life: 0, fromPolice: false });
  const player = { x: 1600, y: 1250, angle: -Math.PI / 2, health: PLAYER.health, inCar: false, car: null, invulnerable: 0, shootCooldown: 0 };
  const state = {
    player, cars, peds, pickups, bullets, buildings, roadsV: ROADS_V, roadsH: ROADS_H,
    cash: 0, score: 0, lives: LIVES, elapsed: 0, wanted: 0, wantedTimer: 0, crimeTimer: 0,
    missionIndex: 0, missionStage: 0, missionTarget: TARGETS.marina, missionMessage: MISSIONS[0].brief,
    missionDone: false, won: false, message: 'Welcome to Solara Bay.', messageTimer: 4,
    camera: { x: 1600, y: 1250 }, policeTimer: 0, shotTimer: 0,
  };
  function setMission(index, stage) {
    state.missionIndex = index; state.missionStage = stage;
    const m = MISSIONS[index];
    if (!m) { state.missionDone = true; state.won = true; state.missionMessage = 'All missions complete. Solara Bay is yours.'; return; }
    let target = TARGETS.marina;
    if (m.kind === 'goto') target = TARGETS.marina;
    else if (m.kind === 'pickup-deliver') target = stage === 0 ? TARGETS.market : TARGETS.hotel;
    else if (m.kind === 'steal') target = stage === 0 ? null : TARGETS.garage;
    else if (m.kind === 'escape') target = stage === 0 ? TARGETS.safehouse : TARGETS.safehouse;
    else if (m.kind === 'heist') target = stage === 0 ? TARGETS.bank : TARGETS.docks;
    state.missionTarget = target;
    state.missionMessage = m.brief + (stage === 1 && m.kind === 'pickup-deliver' ? ' Package collected — now deliver it.' : '');
    if (m.kind === 'escape' && stage === 0) { state.wanted = 3; state.crimeTimer = 0; }
    if (m.kind === 'heist' && stage === 1) { state.wanted = Math.max(state.wanted, 3); }
  }
  function completeMission() {
    const m = MISSIONS[state.missionIndex];
    if (!m) return 0;
    state.cash += m.reward; state.score = state.cash;
    state.message = `Mission complete: ${m.title} — +$${m.reward}`; state.messageTimer = 4;
    setMission(state.missionIndex + 1, 0);
    return EVENT_MISSION;
  }
  function addWanted(n) {
    const before = state.wanted;
    state.wanted = clamp(state.wanted + n, 0, 5); state.crimeTimer = 0;
    return state.wanted !== before ? EVENT_WANTED : 0;
  }
  function collideBuildings(x, y, r) {
    // Returns corrected x,y (push out of buildings) and whether a hit happened.
    let hit = false;
    for (const b of buildings) {
      if (b.park || b.plaza) continue;
      const cx = clamp(x, b.x, b.x + b.w), cy = clamp(y, b.y, b.y + b.h);
      const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
      if (d2 < r * r) {
        hit = true;
        if (d2 > 0.01) { const d = Math.sqrt(d2); x = cx + (dx / d) * r; y = cy + (dy / d) * r; }
        else {
          // Centre is inside the building: push out through the nearest edge.
          const dl = x - b.x, dr = b.x + b.w - x, dt = y - b.y, db = b.y + b.h - y;
          const m = Math.min(dl, dr, dt, db);
          if (m === dl) x = b.x - r; else if (m === dr) x = b.x + b.w + r; else if (m === dt) y = b.y - r; else y = b.y + b.h + r;
        }
      }
    }
    return { x, y, hit };
  }
  function nearestCar(maxD) {
    let best = null, bd = maxD;
    for (const c of cars) { if (!c.active) continue; const d = dist(player.x, player.y, c.x, c.y); if (d < bd) { bd = d; best = c; } }
    return best;
  }
  function spawnPolice() {
    const want = state.wanted;
    let count = 0; for (const c of cars) if (c.active && c.kind === 'police') count += 1;
    if (count >= want) return;
    const a = random() * Math.PI * 2;
    const c = makeCar(clamp(player.x + Math.cos(a) * 600, 100, WORLD.width - 100), clamp(player.y + Math.sin(a) * 600, 100, WORLD.height - 100), a, 'police', '#3a6ad8');
    cars.push(c);
  }
  function fireBullet(fromX, fromY, angle, fromPolice) {
    for (const b of bullets) {
      if (b.active) continue;
      b.active = true; b.x = fromX; b.y = fromY; b.vx = Math.cos(angle) * 700; b.vy = Math.sin(angle) * 700; b.life = 1.2; b.fromPolice = fromPolice;
      return true;
    }
    return false;
  }
  function reset() {
    player.x = 1600; player.y = 1250; player.angle = -Math.PI / 2; player.health = PLAYER.health; player.inCar = false; player.car = null; player.invulnerable = 0;
    state.cash = 0; state.score = 0; state.lives = LIVES; state.elapsed = 0; state.wanted = 0; state.wantedTimer = 0; state.crimeTimer = 0;
    state.missionIndex = 0; state.missionStage = 0; state.won = false; state.missionDone = false; state.messageTimer = 4;
    for (const c of cars) { if (c.kind === 'police') c.active = false; }
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
    // Wanted decays after WANTED_DECAY_SECONDS without crime.
    state.crimeTimer += dt;
    if (state.wanted > 0 && state.crimeTimer > WANTED_DECAY_SECONDS) { state.wanted -= 1; state.crimeTimer = 0; events |= EVENT_WANTED; }
    // --- Player movement ---
    const run = ctrl.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
    if (player.inCar && player.car) {
      const car = player.car;
      const throttle = -ctrl.y; // W/up = forward
      car.speed += CAR.accel * throttle * dt;
      car.speed *= Math.pow(0.4, dt); // drag
      car.speed = clamp(car.speed, -CAR.reverseSpeed, CAR.maxSpeed);
      if (Math.abs(car.speed) > 20) car.angle += ctrl.x * CAR.turn * (car.speed / CAR.maxSpeed) * dt * (car.speed < 0 ? -1 : 1);
      const nx = car.x + Math.cos(car.angle) * car.speed * dt;
      const ny = car.y + Math.sin(car.angle) * car.speed * dt;
      const hit = collideBuildings(nx, ny, 26);
      if (hit.hit) { car.speed *= 0.3; }
      car.x = clamp(hit.x, 40, WORLD.width - 40); car.y = clamp(hit.y, 40, WORLD.height - 40);
      player.x = car.x; player.y = car.y; player.angle = car.angle;
      // Hitting pedestrians in a car is a crime, and it hurts.
      for (const p of peds) {
        if (dist(car.x, car.y, p.x, p.y) < 34 && Math.abs(car.speed) > 120) {
          p.flee = 3; events |= addWanted(1);
          state.message = 'Watch it! You hit a pedestrian — the police are coming.';
          state.messageTimer = 3;
        }
      }
    } else {
      const mx = ctrl.x, my = ctrl.y;
      const len = Math.hypot(mx, my);
      if (len > 0.01) {
        const nx = player.x + (mx / Math.max(1, len)) * run * dt;
        const ny = player.y + (my / Math.max(1, len)) * run * dt;
        const hit = collideBuildings(nx, ny, PLAYER.radius);
        player.x = clamp(hit.x, 30, WORLD.width - 30); player.y = clamp(hit.y, 30, WORLD.height - 30);
        player.angle = Math.atan2(my, mx);
      }
      if (typeof ctrl.aim === 'number') player.angle = ctrl.aim;
    }
    // Enter / exit car
    if (ctrl.enter) {
      if (player.inCar) { player.inCar = false; const c = player.car; player.car = null; player.x = c.x + Math.cos(c.angle + Math.PI / 2) * 40; player.y = c.y + Math.sin(c.angle + Math.PI / 2) * 40; }
      else {
        const c = nearestCar(60);
        if (c) {
          player.inCar = true; player.car = c;
          if (c.parked) { c.parked = false; c.stolen = true; c.kind = 'traffic'; events |= addWanted(1); state.message = 'Car stolen! The police are watching.'; state.messageTimer = 3; }
        }
      }
    }
    // Shooting (on foot, mouse aim)
    if (ctrl.shoot && !player.inCar && player.shootCooldown <= 0) {
      player.shootCooldown = 0.28;
      fireBullet(player.x + Math.cos(player.angle) * 22, player.y + Math.sin(player.angle) * 22, player.angle, false);
      events |= EVENT_SHOT;
    }
    // --- Traffic ---
    for (const c of cars) {
      if (!c.active || c === player.car || c.kind === 'parked' || c.kind === 'police') continue;
      const vertical = c.vertical;
      if (vertical) c.y += c.speed * dt * Math.sin(c.angle); else c.x += c.speed * dt * Math.cos(c.angle);
      if (c.x < 60 || c.x > WORLD.width - 60 || c.y < 60 || c.y > WORLD.height - 60) {
        // Wrap to the other end of its road.
        if (vertical) c.y = c.angle > 0 ? 80 : WORLD.height - 80; else c.x = Math.cos(c.angle) > 0 ? 80 : WORLD.width - 80;
      }
    }
    // --- Police chase ---
    if (state.wanted > 0 && !harmless) {
      state.policeTimer -= dt;
      if (state.policeTimer <= 0) { spawnPolice(); state.policeTimer = 2; }
      for (const c of cars) {
        if (!c.active || c.kind !== 'police') continue;
        const want = Math.atan2(player.y - c.y, player.x - c.x);
        let da = want - c.angle; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
        c.angle += clamp(da, -2.2 * dt, 2.2 * dt);
        c.speed = 380;
        c.x += Math.cos(c.angle) * c.speed * dt; c.y += Math.sin(c.angle) * c.speed * dt;
        const phit = collideBuildings(c.x, c.y, 26);
        if (phit.hit) { c.x = phit.x; c.y = phit.y; c.speed = 0; }
        c.x = clamp(c.x, 40, WORLD.width - 40); c.y = clamp(c.y, 40, WORLD.height - 40);
        if (dist(c.x, c.y, player.x, player.y) < 44) {
          if (player.invulnerable <= 0) {
            player.health -= 12; player.invulnerable = 0.6; events |= EVENT_HIT;
            if (player.inCar && player.car) player.car.health -= 10;
          }
          c.speed = 0;
        }
        // Police shoot occasionally at close range.
        if (dist(c.x, c.y, player.x, player.y) < 320 && random() < dt * 0.7) fireBullet(c.x, c.y, want + (random() - 0.5) * 0.3, true);
      }
    }
    // --- Pedestrians ---
    for (const p of peds) {
      p.timer -= dt;
      if (p.timer <= 0) { p.angle = random() * Math.PI * 2; p.timer = 2 + random() * 3; }
      const sp = p.flee > 0 ? 140 : p.speed;
      if (p.flee > 0) p.flee -= dt;
      p.x = clamp(p.x + Math.cos(p.angle) * sp * dt, 30, WORLD.width - 30);
      p.y = clamp(p.y + Math.sin(p.angle) * sp * dt, 30, WORLD.height - 30);
    }
    // --- Bullets ---
    for (const b of bullets) {
      if (!b.active) continue;
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || b.x < 0 || b.x > WORLD.width || b.y < 0 || b.y > WORLD.height) { b.active = false; continue; }
      if (!b.fromPolice) {
        for (const c of cars) {
          if (!c.active || c === player.car) continue;
          if (dist(b.x, b.y, c.x, c.y) < 30) {
            b.active = false; c.health -= 25;
            if (c.kind === 'police' && c.health <= 0) { c.active = false; state.cash += 50; state.score = state.cash; events |= addWanted(1); }
            break;
          }
        }
        for (const p of peds) {
          if (dist(b.x, b.y, p.x, p.y) < 18) { b.active = false; p.flee = 4; p.angle = Math.atan2(p.y - player.y, p.x - player.x); events |= addWanted(1); break; }
        }
      } else if (dist(b.x, b.y, player.x, player.y) < 16 && player.invulnerable <= 0) {
        b.active = false; player.health -= 8; player.invulnerable = 0.4; events |= EVENT_HIT;
      }
    }
    // --- Pickups ---
    for (const p of pickups) {
      if (!p.active) { p.timer -= dt; if (p.timer <= 0) p.active = true; continue; }
      if (dist(player.x, player.y, p.x, p.y) < 34) {
        p.active = false; p.timer = 20;
        if (p.kind === 'cash') { state.cash += CASH_PICKUP; state.score = state.cash; }
        else player.health = Math.min(PLAYER.health, player.health + 40);
        events |= EVENT_COIN;
      }
    }
    // --- Missions ---
    if (!state.missionDone && !harmless) {
      const m = MISSIONS[state.missionIndex];
      if (m) {
        if (m.kind === 'goto' && state.missionTarget && dist(player.x, player.y, state.missionTarget.x, state.missionTarget.y) < 70) events |= completeMission();
        else if (m.kind === 'pickup-deliver') {
          if (state.missionStage === 0 && state.missionTarget && dist(player.x, player.y, state.missionTarget.x, state.missionTarget.y) < 70) { setMission(1, 1); state.message = 'Package collected — deliver it to the hotel.'; state.messageTimer = 3; }
          else if (state.missionStage === 1 && state.missionTarget && dist(player.x, player.y, state.missionTarget.x, state.missionTarget.y) < 70) events |= completeMission();
        } else if (m.kind === 'steal') {
          if (state.missionStage === 0 && player.inCar && player.car && player.car.stolen) { setMission(2, 1); }
          else if (state.missionStage === 1 && state.missionTarget && dist(player.x, player.y, state.missionTarget.x, state.missionTarget.y) < 70) events |= completeMission();
        } else if (m.kind === 'escape') {
          if (state.wanted === 0 && state.missionTarget && dist(player.x, player.y, state.missionTarget.x, state.missionTarget.y) < 70) events |= completeMission();
        } else if (m.kind === 'heist') {
          if (state.missionStage === 0 && state.missionTarget && dist(player.x, player.y, state.missionTarget.x, state.missionTarget.y) < 70) { state.cash += 500; state.score = state.cash; setMission(4, 1); state.message = 'Cash grabbed! Get to the docks.'; state.messageTimer = 3; }
          else if (state.missionStage === 1 && state.missionTarget && dist(player.x, player.y, state.missionTarget.x, state.missionTarget.y) < 70) events |= completeMission();
        }
      }
    }
    if (state.missionDone) { state.won = true; events |= EVENT_OVER; }
    // --- Health / lives ---
    if (player.health <= 0) {
      state.lives -= 1; player.health = PLAYER.health; player.invulnerable = 2;
      player.x = 1600; player.y = 1250; player.inCar = false; player.car = null;
      state.wanted = Math.max(0, state.wanted - 1);
      events |= EVENT_HIT;
      if (state.lives <= 0) events |= EVENT_OVER;
    }
    if (player.inCar && player.car && player.car.health <= 0) { player.car.active = false; player.inCar = false; player.car = null; player.health -= 20; }
    // Camera follows the player, clamped to the world.
    state.camera.x = clamp(player.x - FIELD.width / 2, 0, WORLD.width - FIELD.width);
    state.camera.y = clamp(player.y - FIELD.height / 2, 0, WORLD.height - FIELD.height);
    return events;
  }
  reset();
  return { state, reset, step, setMission, completeMission, targets: TARGETS };
}
