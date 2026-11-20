// Solara Bay — drawing. Every pixel of the game comes from here: the
// streets, the beach, the cars, the people, the HUD and the minimap, and
// the start, pause, win and busted screens. It reads the world state and
// never changes it.

import { MISSIONS, WORLD } from './config.js';

function drawCar(ctx, x, y, angle, color, kind) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.fillRect(-20, -10, 40, 20);
  ctx.fillStyle = '#222a33';
  ctx.fillRect(-8, -9, 16, 18);
  ctx.fillStyle = kind === 'police' ? '#ffffff' : '#e8e0d0';
  ctx.fillRect(14, -7, 5, 14);
  if (kind === 'police') {
    ctx.fillStyle = '#e05a4f';
    ctx.fillRect(-14, -11, 8, 4);
    ctx.fillStyle = '#3a6ad8';
    ctx.fillRect(-14, 7, 8, 4);
  }
  ctx.restore();
}

function drawPed(ctx, x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = '#f2c94c';
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(4, -3, 6, 6);
  ctx.restore();
}

export function render(ctx, world, screen, best) {
  const s = world.state;
  const cam = s.camera;
  const W = 1280;
  const H = 720;

  // --- Ground: grass, beach, water --------------------------------------
  ctx.fillStyle = '#4a8a4a';
  ctx.fillRect(0, 0, W, H);
  const beachTop = WORLD.height - WORLD.beach - cam.y;
  if (beachTop < H) {
    ctx.fillStyle = '#e8d89a';
    ctx.fillRect(0, Math.max(0, beachTop), W, H - Math.max(0, beachTop));
    const waterTop = WORLD.height - 60 - cam.y;
    if (waterTop < H) {
      ctx.fillStyle = '#3a7ac8';
      ctx.fillRect(0, Math.max(0, waterTop), W, H - Math.max(0, waterTop));
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 8; i += 1) {
        const wx = ((i * 317 + s.elapsed * 40) % 1400) - 60;
        ctx.fillRect(wx, Math.max(0, waterTop) + 12 + (i % 3) * 10, 70, 3);
      }
    }
  }

  // --- Roads ----------------------------------------------------------------
  ctx.fillStyle = '#3a3a42';
  for (const rx of s.roadsV) ctx.fillRect(rx - 60 - cam.x, -cam.y, 120, WORLD.height);
  for (const ry of s.roadsH) ctx.fillRect(-cam.x, ry - 60 - cam.y, WORLD.width, 120);
  ctx.strokeStyle = '#e8d89a';
  ctx.setLineDash([18, 22]);
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (const rx of s.roadsV) { ctx.moveTo(rx - cam.x, -cam.y); ctx.lineTo(rx - cam.x, WORLD.height - cam.y); }
  for (const ry of s.roadsH) { ctx.moveTo(-cam.x, ry - cam.y); ctx.lineTo(WORLD.width - cam.x, ry - cam.y); }
  ctx.stroke();
  ctx.setLineDash([]);

  // --- Blocks: buildings, park, plaza ---------------------------------------
  for (const b of s.blocks) {
    const bx = b.x - cam.x;
    const by = b.y - cam.y;
    if (bx > W || by > H || bx + b.w < 0 || by + b.h < 0) continue;
    ctx.fillStyle = b.color;
    ctx.fillRect(bx, by, b.w, b.h);
    if (b.kind === 'building') {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      for (let wy = by + 12; wy < by + b.h - 8; wy += 24) {
        for (let wx = bx + 10; wx < bx + b.w - 10; wx += 26) ctx.fillRect(wx, wy, 12, 14);
      }
    } else if (b.kind === 'park') {
      ctx.fillStyle = '#2a5a3a';
      ctx.beginPath(); ctx.arc(bx + b.w / 2, by + b.h / 2, 30, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8e0d0';
      ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('PARK', bx + b.w / 2, by + b.h / 2 + 5);
    } else {
      ctx.fillStyle = '#5a5a4a';
      ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('PLAZA', bx + b.w / 2, by + b.h / 2 + 5);
    }
  }

  // --- Mission target marker --------------------------------------------------
  if (s.missionTarget && !s.missionDone) {
    const tx = s.missionTarget.x - cam.x;
    const ty = s.missionTarget.y - cam.y;
    const bob = Math.sin(s.elapsed * 4) * 6;
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.moveTo(tx, ty - 34 + bob);
    ctx.lineTo(tx - 10, ty - 14 + bob);
    ctx.lineTo(tx + 10, ty - 14 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(s.missionTarget.label, tx, ty - 42 + bob);
  }

  // --- Pickups ------------------------------------------------------------------
  for (const p of s.pickups) {
    if (!p.active) continue;
    ctx.fillStyle = p.kind === 'cash' ? '#ffd23f' : '#ff6a6a';
    ctx.beginPath();
    ctx.arc(p.x - cam.x, p.y - cam.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(p.kind === 'cash' ? '$' : '+', p.x - cam.x, p.y - cam.y + 4);
  }

  // --- Pedestrians, cars, bullets -------------------------------------------------
  for (const p of s.peds) drawPed(ctx, p.x - cam.x, p.y - cam.y, p.angle);
  for (const c of s.cars) {
    if (!c.active) continue;
    drawCar(ctx, c.x - cam.x, c.y - cam.y, c.angle, c.color, c.kind);
  }
  ctx.fillStyle = '#ffd23f';
  for (const b of s.bullets) {
    if (!b.active) continue;
    ctx.beginPath();
    ctx.arc(b.x - cam.x, b.y - cam.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Player -----------------------------------------------------------------------
  const px = s.player.x - cam.x;
  const py = s.player.y - cam.y;
  if (!s.player.inCar) {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(s.player.angle);
    ctx.fillStyle = s.player.invulnerable > 0 && Math.floor(s.elapsed * 10) % 2 === 0 ? '#f2c94c' : '#e05a4f';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillRect(8, -4, 12, 8);
    ctx.restore();
    // Aim line, short and faint.
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(s.player.angle) * 34, py + Math.sin(s.player.angle) * 34);
    ctx.stroke();
  }

  // --- HUD ----------------------------------------------------------------------------
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, 46);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`$${s.cash}`, 16, 30);
  ctx.fillText(`♥ ${Math.max(0, Math.ceil(s.player.health))}`, 120, 30);
  ctx.fillText(`Lives ${s.lives}`, 220, 30);
  ctx.fillText(`Best $${best || 0}`, 320, 30);
  // Wanted stars.
  ctx.textAlign = 'right';
  let stars = '';
  for (let i = 0; i < 5; i += 1) stars += i < s.wanted ? '★' : '☆';
  ctx.fillStyle = s.wanted > 0 ? '#ff6a6a' : '#fff';
  ctx.fillText(stars, W - 240, 30);
  // Mission objective.
  ctx.textAlign = 'left';
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#ffd23f';
  const mission = MISSIONS[s.missionIndex];
  ctx.fillText(mission ? `${mission.title}: ${s.missionMessage}` : 'All missions complete.', 16, 68);
  if (s.messageTimer > 0) {
    ctx.fillStyle = '#fff';
    ctx.fillText(s.message, 16, 92);
  }
  // Stolen-car health bar.
  if (s.player.inCar && s.player.car) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(16, 104, 200, 14);
    ctx.fillStyle = '#4fc3f7';
    ctx.fillRect(16, 104, 200 * Math.max(0, s.player.car.health / 100), 14);
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.fillText('Car', 224, 115);
  }

  // --- Minimap ---------------------------------------------------------------------------
  const mw = 200;
  const mh = 150;
  const mx = W - mw - 16;
  const my = H - mh - 16;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(mx, my, mw, mh);
  ctx.fillStyle = '#4a8a4a';
  ctx.fillRect(mx + 4, my + 4, mw - 8, mh - 8);
  ctx.fillStyle = '#3a3a42';
  for (const rx of s.roadsV) ctx.fillRect(mx + (rx / WORLD.width) * mw, my, 3, mh);
  for (const ry of s.roadsH) ctx.fillRect(mx, my + (ry / WORLD.height) * mh, mw, 3);
  ctx.fillStyle = '#3a7ac8';
  ctx.fillRect(mx, my + mh - 12, mw, 12);
  if (s.missionTarget && !s.missionDone) {
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(mx + (s.missionTarget.x / WORLD.width) * mw, my + (s.missionTarget.y / WORLD.height) * mh, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#e05a4f';
  ctx.beginPath();
  ctx.arc(mx + (s.player.x / WORLD.width) * mw, my + (s.player.y / WORLD.height) * mh, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('SOLARA BAY', mx + 6, my + 14);

  // --- Screens ------------------------------------------------------------------------------
  if (screen === 'start') {
    ctx.fillStyle = 'rgba(10,20,40,0.82)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SOLARA BAY', W / 2, 220);
    ctx.fillStyle = '#fff';
    ctx.font = '24px sans-serif';
    ctx.fillText('An open-world crime game in the spirit of GTA 6', W / 2, 270);
    ctx.font = '18px sans-serif';
    ctx.fillText('WASD move · Shift run · E steal a car · W/S drive · Mouse aim · Click shoot', W / 2, 340);
    ctx.fillText('P pause · M mute · Your cash and best score are saved in the browser', W / 2, 372);
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('Press SPACE to start', W / 2, 450);
    ctx.fillStyle = '#ccc';
    ctx.font = '15px sans-serif';
    ctx.fillText('Rico Marin owes money all over town. Meet Mara, run the jobs, and own the city.', W / 2, 500);
  } else if (screen === 'pause') {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', W / 2, H / 2 - 10);
    ctx.font = '20px sans-serif';
    ctx.fillText('Press P to keep playing', W / 2, H / 2 + 30);
  } else if (screen === 'win') {
    ctx.fillStyle = 'rgba(10,40,20,0.85)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 56px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('YOU OWN THE CITY', W / 2, 300);
    ctx.fillStyle = '#fff';
    ctx.font = '22px sans-serif';
    ctx.fillText(`All five missions done. Final cash: $${s.cash}`, W / 2, 350);
    ctx.fillText('Press SPACE to play again', W / 2, 400);
  } else if (screen === 'busted') {
    ctx.fillStyle = 'rgba(40,10,10,0.85)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ff6a6a';
    ctx.font = 'bold 56px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BUSTED', W / 2, 300);
    ctx.fillStyle = '#fff';
    ctx.font = '22px sans-serif';
    ctx.fillText(`Out of lives. You kept $${s.cash}.`, W / 2, 350);
    ctx.fillText('Press SPACE to try again', W / 2, 400);
  }
}
