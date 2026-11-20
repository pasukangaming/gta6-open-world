// Keyboard + mouse input for Solara Bay. Held keys give a movement vector;
// one-shot presses (confirm, pause, enter/exit car) are queued as flags and
// taken once by the loop. Mouse position gives the aim angle on foot, and a
// click shoots.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const ENTER = new Set(['KeyE', 'KeyF']);
const RUN = new Set(['ShiftLeft', 'ShiftRight']);

export function createInput(canvas) {
  let up = false, down = false, left = false, right = false, run = false;
  let actions = 0, shoot = false, mouseX = 0, mouseY = 0, mouseIn = false;
  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (RUN.has(event.code)) run = true;
    else if (CONFIRM.has(event.code)) { if (!event.repeat) actions |= ACTION_CONFIRM; }
    else if (PAUSE.has(event.code)) { if (!event.repeat) actions |= ACTION_PAUSE; }
    else if (ENTER.has(event.code)) { if (!event.repeat) actions |= ACTION_ENTER; }
    else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
    else if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (RUN.has(event.code)) run = false;
  });
  window.addEventListener('blur', () => { up = down = left = right = run = shoot = false; });
  canvas.addEventListener('pointermove', (e) => { mouseX = e.clientX; mouseY = e.clientY; mouseIn = true; });
  canvas.addEventListener('pointerdown', (e) => {
    mouseX = e.clientX; mouseY = e.clientY; mouseIn = true;
    if (e.button === 0) shoot = true; else actions |= ACTION_CONFIRM;
  });
  canvas.addEventListener('pointerup', () => { shoot = false; });
  return {
    // Control vector for world.step: x/y in -1..1, aim in world radians (or null), shoot, enter, run.
    control(camera, player) {
      const x = (right ? 1 : 0) - (left ? 1 : 0);
      const y = (down ? 1 : 0) - (up ? 1 : 0);
      let aim = null;
      if (mouseIn && player && !player.inCar) {
        const rect = canvas.getBoundingClientRect();
        const sx = (mouseX - rect.left) * (1280 / rect.width);
        const sy = (mouseY - rect.top) * (720 / rect.height);
        aim = Math.atan2(camera.y + sy - player.y, camera.x + sx - player.x);
      }
      const enter = !!(actions & ACTION_ENTER);
      return { x, y, aim, shoot, enter, run };
    },
    takeActions() { const t = actions; actions = 0; return t; },
  };
}
