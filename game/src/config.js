// Solara Bay — an original open-world crime game. All tuning in one place.
// Viewport is a fixed 1280x720 logical area; the world is 3200x2400 and the
// camera follows the player, so no rule depends on the screen size.
export const FIELD = { width: 1280, height: 720 };
export const WORLD = { width: 3200, height: 2400 };
export const STEP = 1 / 60;
export const PLAYER = { radius: 14, walkSpeed: 230, runSpeed: 320, health: 100 };
export const CAR = { length: 54, width: 26, accel: 420, maxSpeed: 520, reverseSpeed: 180, turn: 2.6, health: 100 };
export const LIVES = 3;
export const PALETTE = {
  backdrop: '#0d1117', grass: '#2e5d3a', park: '#3a7a4a', road: '#2b2f36', roadLine: '#d8c95a',
  sidewalk: '#5a6068', building: '#7a6a8a', building2: '#8a7a5a', building3: '#5a7a8a', building4: '#9a5a6a',
  water: '#2a6a9a', sand: '#c9b078', player: '#4fc3f7', playerCar: '#e5534b', traffic: '#f2c94c',
  traffic2: '#7ad06a', traffic3: '#c98ad6', police: '#3a6ad8', policeLight: '#ff3b30', ped: '#e8e0d0',
  text: '#eef1f5', muted: '#aab2bd', panel: '#1c222c', gold: '#f2c94c', red: '#e5534b', green: '#5ad06a',
  minimapBg: 'rgba(10,14,20,0.82)',
};
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const BEST_KEY = 'solara-bay.save.v1';
export const MISSIONS = [
  { id: 1, title: 'Meet Mara', brief: 'Drive to the yellow marker at the Marina and meet Mara Solis.', kind: 'goto', reward: 150 },
  { id: 2, title: 'Courier Run', brief: 'Pick up the package at the market, then deliver it to the hotel in the north.', kind: 'pickup-deliver', reward: 250 },
  { id: 3, title: 'Borrowed Wheels', brief: 'Steal any parked car (press E near one) and bring it to the garage.', kind: 'steal', reward: 300 },
  { id: 4, title: 'Hot Pursuit', brief: 'The police are on you. Lose the wanted level, then reach the safehouse.', kind: 'escape', reward: 400 },
  { id: 5, title: 'The Last Getaway', brief: 'Grab the cash at the bank plaza, then escape to the docks with 3 wanted stars or less.', kind: 'heist', reward: 800 },
];
