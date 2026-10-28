import { ramp } from '../color';
import { Raster } from '../raster';
import { cycle, foot, TAU, type HeroArt } from './types';

const W = 31;
const H = 17;
const GROUND = 14.5;

const FUR = ramp(0xe3a23c);
const FUR_FAR = ramp(0xb87424);
const BELLY = ramp(0xf7e0b0, 0.2, 0.25);
const SPOT = 0x2c1a10;
const CORE = 0xb8641c;
const TAIL_TIP = ramp(0x3a2414, 0.2, 0.2);
const NOSE = 0x7a3a30;
const EYE = 0xd8e04a;
const STREAK = 0xfff4d0;

// Rosetas do corpo, relativas ao centro do corpo
const ROSETTES: [number, number][] = [[-5.5, -1.5], [-1.5, 0], [2.5, -2], [5.5, 0.5], [-4, 1.8]];

interface Pose {
  bob: number;
  phase: number;
  stride: number;
  wave: number;
  legs: 'walk' | 'tuck' | 'dangle' | 'dash';
  stretch: number;
}

function drawOnca(p: Pose): Raster {
  const r = new Raster(W, H);
  const bx = 13.5;
  const by = 8.5 + p.bob;
  const rx = 8.6 + p.stretch;

  // Cauda: desce do quadril e enrola na ponta escura
  const pts: [number, number][] = [];
  for (let i = 0; i <= 6; i++) {
    const lift = p.legs === 'dash' ? -0.5 : 0.9;
    pts.push([bx - rx + 1.5 - i * 0.95, by - 0.5 + i * lift + Math.sin(i * 0.8 + p.wave * TAU) * 0.7]);
  }
  r.tail(pts, 1.2, 0.8, FUR, TAIL_TIP);

  const hips: [number, number][] = [[bx - rx + 3, by + 1.8], [bx + rx - 2.5, by + 1.8]];
  const legsFor = (far: boolean) => {
    const tone = far ? FUR_FAR : FUR;
    hips.forEach(([hx0, hy], i) => {
      const hx = hx0 + (far ? 0.8 : 0);
      let fx: number;
      let fy: number;
      if (p.legs === 'walk') [fx, fy] = foot(hx, GROUND, p.phase + i * 0.5 + (far ? 0.3 : 0), p.stride, 1.8);
      else if (p.legs === 'dash') [fx, fy] = [hx + (i === 0 ? -4.5 : 4.5), hy + 1.5];
      else if (p.legs === 'tuck') [fx, fy] = [hx + (i === 0 ? 2 : 1.5), hy + 2.3];
      else [fx, fy] = [hx + (i === 0 ? -1.5 : 1), GROUND - 0.5];
      r.limb(hx, hy, fx, fy, 1.15, tone);
    });
  };

  legsFor(true);
  r.ellipse(bx, by, rx, 3.8 - p.stretch * 0.3, FUR, { grain: 0.12 });
  r.ellipse(bx + 0.5, by + 2.4, rx - 2.2, 1.5, BELLY, { only: true });
  for (const [dx, dy] of ROSETTES) rosette(r, bx + dx * (rx / 8.6), by + dy);
  legsFor(false);

  // Cabeça
  const hx = bx + rx + 1.2;
  const hy = by - 1.8 + (p.legs === 'dash' ? 0.8 : 0);
  r.ellipse(hx - 1.6, hy - 3, 1.2, 1.1, FUR_FAR);
  r.ellipse(hx + 0.6, hy - 3.3, 1.2, 1.1, FUR);
  r.ellipse(hx, hy, 3.9, 3.3, FUR);
  r.ellipse(hx + 2.4, hy + 1.3, 1.9, 1.5, BELLY);
  r.paint(hx - 1.8, hy - 0.6, SPOT);
  r.paint(hx - 0.8, hy - 2, SPOT);
  r.outline();
  r.set(hx + 1.3, hy - 0.7, EYE);
  r.set(hx + 3.9, hy + 0.6, NOSE);

  if (p.legs === 'dash') {
    for (const [y, len] of [[by - 2, 4], [by + 1, 6], [by + 3.5, 3]] as const) {
      for (let x = 0; x < len; x++) if (r.get(x, Math.floor(y)) === null) r.set(x, y, STREAK);
    }
  }
  return r;
}

// Anel aberto 4×3 de roseta; o miolo fica num tom mais quente que o pelo
const RING: [number, number][] = [[1, 0], [2, 0], [0, 1], [3, 1], [1, 2]];

/** Roseta: anel escuro com miolo mais quente, só onde já tem pelo. */
function rosette(r: Raster, cx: number, cy: number): void {
  const x = Math.floor(cx) - 1;
  const y = Math.floor(cy) - 1;
  r.paint(x + 1, y + 1, CORE);
  r.paint(x + 2, y + 1, CORE);
  for (const [dx, dy] of RING) r.paint(x + dx, y + dy, SPOT);
}

export function oncaArt(): HeroArt {
  return {
    key: 'onca',
    frameW: W,
    frameH: H,
    anims: [
      {
        name: 'idle',
        fps: 4,
        repeat: true,
        frames: cycle(4, (t) => drawOnca({ bob: Math.round(Math.sin(t * TAU) * 0.5 + 0.5) * 0.5, phase: 0, stride: 0, wave: t, legs: 'walk', stretch: 0 })),
      },
      {
        name: 'run',
        fps: 13,
        repeat: true,
        frames: cycle(6, (t) => drawOnca({ bob: Math.abs(Math.sin(t * TAU)) * -0.7, phase: t, stride: 2.8, wave: t, legs: 'walk', stretch: Math.sin(t * TAU) * 0.6 })),
      },
      { name: 'jump', fps: 10, repeat: false, frames: [drawOnca({ bob: -0.5, phase: 0, stride: 0, wave: 0.2, legs: 'tuck', stretch: -0.4 })] },
      {
        name: 'fall',
        fps: 8,
        repeat: true,
        frames: cycle(2, (t) => drawOnca({ bob: 0, phase: 0, stride: 0, wave: 0.5 + t * 0.4, legs: 'dangle', stretch: 0 })),
      },
      {
        name: 'dash',
        fps: 16,
        repeat: true,
        frames: cycle(2, (t) => drawOnca({ bob: 0.5, phase: 0, stride: 0, wave: t, legs: 'dash', stretch: 1.4 })),
      },
    ],
  };
}
