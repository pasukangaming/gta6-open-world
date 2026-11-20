// Solara Bay — shared tuning for the whole game.
// A sun-soaked coastal city, top-down, Canvas 2D. All numbers here are the
// single place the rest of the game reads them from, so a balance change is
// one edit instead of a hunt through five files.

export const WORLD = {
  width: 3200,
  height: 2400,
  beach: 220, // the strip of sand along the south edge, before the water
};

export const VIEW = { width: 1280, height: 720 };

export const PLAYER = {
  walkSpeed: 250,
  runSpeed: 350,
  radius: 14,
  health: 100,
};

export const CAR = {
  accel: 430,
  maxSpeed: 560,
  reverseSpeed: 190,
  turn: 2.5,
  health: 100,
};

export const POLICE = {
  chaseSpeed: 390,
  ramDamage: 12,
  shotDamage: 8,
  shootRange: 330,
};

export const GAME = {
  lives: 3,
  cashPickup: 25,
  healthPickup: 40,
  wantedDecaySeconds: 20,
  policeKillReward: 50,
  bankGrab: 500,
};

export const MISSIONS = [
  {
    id: 'meet-mara',
    title: 'Meet Mara',
    kind: 'goto',
    brief: 'Mara is waiting at the Marina. Drive or walk there to start.',
    reward: 100,
  },
  {
    id: 'courier-run',
    title: 'Courier Run',
    kind: 'pickup-deliver',
    brief: 'Pick up the package at the Market, then deliver it to the Hotel.',
    reward: 200,
  },
  {
    id: 'borrowed-wheels',
    title: 'Borrowed Wheels',
    kind: 'steal',
    brief: 'Steal a parked car and bring it to the Garage. The owner will notice.',
    reward: 300,
  },
  {
    id: 'hot-pursuit',
    title: 'Hot Pursuit',
    kind: 'escape',
    brief: 'The police are on you. Lose the heat, then reach the Safehouse.',
    reward: 400,
  },
  {
    id: 'last-getaway',
    title: 'The Last Getaway',
    kind: 'heist',
    brief: 'Grab the cash at Bank Plaza and get to the Docks. Do not get caught.',
    reward: 600,
  },
];

// Where the missions point. Kept in config so the world and the HUD agree.
export const PLACES = {
  marina: { x: 2800, y: 1900, label: 'Marina' },
  market: { x: 1000, y: 900, label: 'Market' },
  hotel: { x: 1600, y: 400, label: 'Hotel' },
  garage: { x: 400, y: 1400, label: 'Garage' },
  safehouse: { x: 400, y: 400, label: 'Safehouse' },
  bank: { x: 1600, y: 1400, label: 'Bank Plaza' },
  docks: { x: 2800, y: 2150, label: 'Docks' },
};
