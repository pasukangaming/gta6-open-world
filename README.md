# Solara Bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/pasukangaming/gta6-open-world/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/pasukangaming/gta6-open-world/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solara Bay is an original top-down open-world crime game: explore a coastal city on foot and by car, steal cars, outrun the police, and finish five story missions.

Rico Marin owes money all over town. Mara, his contact at the Marina, has five jobs for him: meet her, run a courier package, borrow a car that is not his, lose a three-star police chase, and pull one last getaway from Bank Plaza to the Docks. The city is his to drive, on foot or behind the wheel, with traffic, pedestrians, wanted stars and police cars that chase, ram and shoot.

## Features

- A 3200×2400 coastal city: roads, buildings, a park, a plaza, a beach and water
- On foot (WASD, Shift to run) and by car (W/S drive, A/D steer)
- Traffic cars and pedestrians who flee when threatened
- Cars to steal (E near a parked car, wanted +1)
- Wanted level 0–5 and police that chase, ram and shoot
- Five story missions, combat, pickups, and a HUD with a minimap
- Start, pause, win and busted screens, and a save in localStorage
- Synthesized WebAudio sound only — no audio files, no network requests

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move on foot, drive in a car |
| Shift | Run |
| E | Steal / enter a car, get out |
| Mouse + click | Aim and shoot on foot |
| P | Pause |
| M | Mute |
| Space | Start / play again |

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — no build step, no install, no network.

To build the entry dossier locally:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

Entered on [make.fun](https://make.fun/?ref=e2a089vq&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards
