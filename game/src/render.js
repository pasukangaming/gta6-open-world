// Drawing only: Solara Bay's city, cars, people, HUD with minimap, panels.
// The 1280x720 viewport is scaled to the window and centred.
import { FIELD, FONT, LIVES, MISSIONS, PALETTE, WORLD } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const PANEL = { width: 640, top: 150, line: 32, bottom: 70 };

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    view.x = (canvas.width - FIELD.width * view.scale) / 2;
    view.y = (canvas.height - FIELD.height * view.scale) / 2;
  }
  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size); context.fillStyle = color; context.textAlign = align; context.fillText(value, x, y);
  }
  function drawCar(x, y, angle, color, isPolice, isPlayer) {
    context.save(); context.translate(x, y); context.rotate(angle);
    context.fillStyle = '#111'; context.fillRect(-28, -14, 56, 28);
    context.fillStyle = color; context.fillRect(-26, -12, 52, 24);
    context.fillStyle = 'rgba(180,220,255,0.8)'; context.fillRect(8, -10, 10, 20);
    context.fillStyle = '#222'; context.fillRect(-18, -13, 8, 4); context.fillRect(-18, 9, 8, 4); context.fillRect(12, -13, 8, 4); context.fillRect(12, 9, 8, 4);
    if (isPolice) { context.fillStyle = '#fff'; context.fillRect(-6, -12, 12, 24); context.fillStyle = PALETTE.policeLight; context.fillRect(-4, -13, 8, 5); context.fillStyle = '#3a6ad8'; context.fillRect(-4, 8, 8, 5); }
    if (isPlayer) { context.strokeStyle = '#fff'; context.lineWidth = 2; context.strokeRect(-28, -14, 56, 28); }
    context.restore();
  }
  function drawCity(state) {
    const cam = state.camera;
    context.fillStyle = PALETTE.grass; context.fillRect(0, 0, WORLD.width, WORLD.height);
    // Beach + water at the south edge.
    context.fillStyle = PALETTE.sand; context.fillRect(0, 2180, WORLD.width, 70);
    context.fillStyle = PALETTE.water; context.fillRect(0, 2250, WORLD.width, 150);
    // Roads.
    context.fillStyle = PALETTE.road;
    for (const x of state.roadsV) context.fillRect(x - 60, 0, 120, WORLD.height);
    for (const y of state.roadsH) context.fillRect(0, y - 60, WORLD.width, 120);
    context.fillStyle = PALETTE.roadLine;
    for (const x of state.roadsV) for (let y = 40; y < WORLD.height; y += 80) context.fillRect(x - 2, y, 4, 36);
    for (const y of state.roadsH) for (let x = 40; x < WORLD.width; x += 80) context.fillRect(x, y - 2, 36, 4);
    // Buildings / park / plaza.
    for (const b of state.buildings) {
      context.fillStyle = b.color; context.fillRect(b.x, b.y, b.w, b.h);
      if (!b.park && !b.plaza) {
        context.fillStyle = 'rgba(255,255,180,0.55)';
        for (let wx = b.x + 14; wx < b.x + b.w - 10; wx += 34) for (let wy = b.y + 14; wy < b.y + b.h - 10; wy += 34) context.fillRect(wx, wy, 12, 14);
      }
      if (b.park) { context.fillStyle = '#5a9a3a'; context.beginPath(); context.arc(b.x + b.w / 3, b.y + b.h / 2, 26, 0, Math.PI * 2); context.fill(); context.beginPath(); context.arc(b.x + 2 * b.w / 3, b.y + b.h / 3, 20, 0, Math.PI * 2); context.fill(); }
    }
    // Pickups.
    for (const p of state.pickups) {
      if (!p.active) continue;
      if (p.kind === 'cash') { context.fillStyle = PALETTE.gold; context.beginPath(); context.arc(p.x, p.y, 10, 0, Math.PI * 2); context.fill(); context.fillStyle = '#7a5a00'; context.font = 'bold 12px ' + FONT; context.textAlign = 'center'; context.fillText('$', p.x, p.y + 4); }
      else { context.fillStyle = '#fff'; context.fillRect(p.x - 10, p.y - 10, 20, 20); context.fillStyle = PALETTE.red; context.fillRect(p.x - 2, p.y - 8, 4, 16); context.fillRect(p.x - 8, p.y - 2, 16, 4); }
    }
    // Mission target marker (pulsing).
    const t = state.missionTarget;
    if (t && !state.missionDone) {
      const pulse = 18 + Math.sin(state.elapsed * 4) * 6;
      context.strokeStyle = PALETTE.gold; context.lineWidth = 4; context.beginPath(); context.arc(t.x, t.y, pulse + 14, 0, Math.PI * 2); context.stroke();
      context.fillStyle = PALETTE.gold; context.beginPath(); context.moveTo(t.x, t.y - 34); context.lineTo(t.x - 10, t.y - 14); context.lineTo(t.x + 10, t.y - 14); context.fill();
      text(t.label, t.x, t.y - 42, 18, PALETTE.gold, 'center');
    }
    // Pedestrians.
    for (const p of state.peds) {
      context.fillStyle = p.flee > 0 ? '#ff9a5a' : PALETTE.ped;
      context.beginPath(); context.arc(p.x, p.y, 9, 0, Math.PI * 2); context.fill();
      context.fillStyle = '#222'; context.beginPath(); context.arc(p.x, p.y - 3, 4, 0, Math.PI * 2); context.fill();
    }
    // Cars.
    for (const c of state.cars) {
      if (!c.active) continue;
      const isPlayer = state.player.inCar && state.player.car === c;
      drawCar(c.x, c.y, c.angle, isPlayer ? PALETTE.playerCar : c.color, c.kind === 'police', isPlayer);
    }
    // Bullets.
    context.fillStyle = '#ffe66a';
    for (const b of state.bullets) if (b.active) { context.beginPath(); context.arc(b.x, b.y, 4, 0, Math.PI * 2); context.fill(); }
    // Player on foot.
    const pl = state.player;
    if (!pl.inCar) {
      if (pl.invulnerable <= 0 || Math.floor(pl.invulnerable * 10) % 2 === 1) {
        context.fillStyle = PALETTE.player; context.beginPath(); context.arc(pl.x, pl.y, 14, 0, Math.PI * 2); context.fill();
        context.strokeStyle = '#111'; context.lineWidth = 3; context.beginPath(); context.moveTo(pl.x, pl.y); context.lineTo(pl.x + Math.cos(pl.angle) * 22, pl.y + Math.sin(pl.angle) * 22); context.stroke();
        context.fillStyle = '#ffd9a0'; context.beginPath(); context.arc(pl.x, pl.y - 4, 6, 0, Math.PI * 2); context.fill();
      }
    }
    void cam;
  }
  function drawHud(state, save) {
    const pl = state.player;
    context.textBaseline = 'top';
    text(`$${state.cash}`, 24, 18, 30, PALETTE.gold, 'left');
    text(`Mission ${Math.min(state.missionIndex + 1, 5)}/5: ${MISSIONS[Math.min(state.missionIndex, 4)].title}`, 24, 56, 20, PALETTE.text, 'left');
    text(state.missionMessage, 24, 82, 16, PALETTE.muted, 'left');
    if (state.messageTimer > 0) text(state.message, FIELD.width / 2, 18, 20, PALETTE.gold, 'center');
    // Health bar.
    context.fillStyle = '#222'; context.fillRect(24, 112, 200, 16);
    context.fillStyle = pl.health > 40 ? PALETTE.green : PALETTE.red; context.fillRect(24, 112, 200 * Math.max(0, pl.health) / 100, 16);
    text(`Health ${Math.max(0, Math.round(pl.health))}`, 232, 110, 16, PALETTE.text, 'left');
    text(`Lives ${state.lives}`, 24, 136, 18, PALETTE.text, 'left');
    // Stolen-car health, only while driving — a wrecked car strands Rico.
    if (pl.inCar && pl.car) {
      context.fillStyle = '#222'; context.fillRect(24, 160, 200, 12);
      context.fillStyle = pl.car.health > 40 ? PALETTE.gold : PALETTE.red;
      context.fillRect(24, 160, 200 * Math.max(0, pl.car.health) / 100, 12);
      text(`Car ${Math.max(0, Math.round(pl.car.health))}`, 232, 158, 16, PALETTE.text, 'left');
    }
    // Wanted stars.
    for (let i = 0; i < 5; i += 1) { context.fillStyle = i < state.wanted ? PALETTE.red : 'rgba(255,255,255,0.25)'; context.font = '28px ' + FONT; context.textAlign = 'left'; context.fillText('★', FIELD.width - 260 + i * 32, 18); }
    text(state.wanted > 0 ? 'WANTED' : 'Clean', FIELD.width - 260, 52, 16, state.wanted > 0 ? PALETTE.red : PALETTE.green, 'left');
    text(pl.inCar ? 'In car — W/S drive, A/D steer, E exit' : 'On foot — WASD move, mouse aim, click shoot, E steal car', 24, FIELD.height - 28, 16, PALETTE.muted, 'left');
    if (save) text(`Saved: $${save.cash}  •  Best $${save.best}`, FIELD.width - 24, FIELD.height - 28, 16, PALETTE.muted, 'right');
    // Minimap.
    const mw = 220, mh = 165, mx = FIELD.width - mw - 16, my = 110;
    context.fillStyle = PALETTE.minimapBg; context.fillRect(mx - 6, my - 6, mw + 12, mh + 12);
    const sx = mw / WORLD.width, sy = mh / WORLD.height;
    context.fillStyle = PALETTE.grass; context.fillRect(mx, my, mw, mh);
    context.fillStyle = PALETTE.road;
    for (const x of state.roadsV) context.fillRect(mx + x * sx - 2, my, 4, mh);
    for (const y of state.roadsH) context.fillRect(mx, my + y * sy, mw, 4);
    if (state.missionTarget) { context.fillStyle = PALETTE.gold; context.beginPath(); context.arc(mx + state.missionTarget.x * sx, my + state.missionTarget.y * sy, 5, 0, Math.PI * 2); context.fill(); }
    for (const c of state.cars) if (c.active && c.kind === 'police') { context.fillStyle = '#5a8aff'; context.fillRect(mx + c.x * sx - 2, my + c.y * sy - 2, 4, 4); }
    context.fillStyle = '#fff'; context.beginPath(); context.arc(mx + pl.x * sx, my + pl.y * sy, 4, 0, Math.PI * 2); context.fill();
    text('SOLARA BAY', mx, my - 24, 14, PALETTE.muted, 'left');
  }
  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2, y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(20,26,34,0.94)'; context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.gold; context.lineWidth = 2; context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 72, 44, PALETTE.text, 'center');
    for (let i = 0; i < lines.length; i += 1) text(lines[i], FIELD.width / 2, y + PANEL.top + i * PANEL.line, 20, PALETTE.muted, 'center');
    text(prompt, FIELD.width / 2, y + height - 36, 22, PALETTE.gold, 'center');
  }
  function draw(state, screen, save) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop; context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    // Camera transform for the world, HUD drawn in screen space after.
    context.save();
    context.translate(-state.camera.x, -state.camera.y);
    drawCity(state);
    context.restore();
    if (screen === SCREEN_TITLE) {
      drawPanel('SOLARA BAY', ['An original open-world crime game.', 'Rico Marín is back in Solara Bay — and the city owes him.', 'WASD move • W/S drive • E steal a car • Click shoot • P pause', `Best $${save ? save.best : 0}  •  Saved $${save ? save.cash : 0}`], 'Press Space or click to start');
      return;
    }
    drawHud(state, save);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', ['The city waits for you.'], 'Press P to resume');
    else if (screen === SCREEN_OVER) drawPanel(state.won ? 'You Own Solara Bay' : 'Busted', [state.won ? `All 5 missions complete. Final cash $${state.cash}.` : `Lives gone. Cash kept: $${state.cash}.`, `Best $${save ? save.best : 0}`], 'Press Space or click to play again');
    else if (screen === SCREEN_WIN) drawPanel('Mission Complete', [`Cash $${state.cash}`, 'The story continues — free roam Solara Bay.'], 'Press Space to keep playing');
  }
  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
