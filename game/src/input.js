// Solara Bay — keyboard and mouse input.
// One object owns the keys, the pointer and the per-frame control vector
// the world steps with. The world never reads the DOM itself.

export function createInput(canvas) {
  const keys = new Set();
  const pointer = { x: 0, y: 0, down: false };

  function onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    keys.add(e.key.toLowerCase());
  }
  function onKeyUp(e) { keys.delete(e.key.toLowerCase()); }
  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
  }
  function onMouseDown(e) { onMouseMove(e); pointer.down = true; }
  function onMouseUp() { pointer.down = false; }
  function onPointerLeave() { pointer.down = false; }
  function onBlur() { keys.clear(); pointer.down = false; }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('pointerleave', onPointerLeave);

  // Edge-triggered presses (E to steal, P to pause, M to mute): the world
  // sees them once, on the frame they happen, then they clear.
  const pressed = new Set();
  function pressOnce(code) {
    if (pressed.has(code)) return false;
    pressed.add(code);
    return true;
  }

  return {
    pointer,
    // A fresh control vector every frame. x/y are -1..1, aim is a world
    // angle in radians, enter/shoot are booleans for this frame only.
    read(camX, camY) {
      const up = keys.has('w') || keys.has('arrowup');
      const down = keys.has('s') || keys.has('arrowdown');
      const left = keys.has('a') || keys.has('arrowleft');
      const right = keys.has('d') || keys.has('arrowright');
      const ctrl = {
        x: (right ? 1 : 0) - (left ? 1 : 0),
        y: (down ? 1 : 0) - (up ? 1 : 0),
        run: keys.has('shift'),
        enter: keys.has('e') && pressOnce('e'),
        shoot: pointer.down,
        aim: Math.atan2(pointer.y + camY - 0, pointer.x + camX - 0),
        pause: keys.has('p') && pressOnce('p'),
        mute: keys.has('m') && pressOnce('m'),
      };
      // The aim angle needs the player's position, which the caller fills
      // in: read() gets the camera, main.js rewrites aim from the player.
      ctrl.aimX = pointer.x + camX;
      ctrl.aimY = pointer.y + camY;
      if (!keys.has('e')) pressed.delete('e');
      if (!keys.has('p')) pressed.delete('p');
      if (!keys.has('m')) pressed.delete('m');
      return ctrl;
    },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
    },
  };
}
