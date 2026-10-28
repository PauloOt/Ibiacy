import { ramp } from '../color';
import { Raster } from '../raster';
import { cycle, foot, TAU, type HeroArt } from './types';

const W = 22;
const H = 18;
const GROUND = 15.5;

const FUR = ramp(0xf2a531);
const FUR_FAR = ramp(0xc06a18);
const MANE = ramp(0xec8a1e, 0.4);
const FACE = ramp(0x5c2f19, 0.25, 0.3);
const EYE = 0xfff1c4;

interface Pose {
  bob: number;
  /** Fase da passada (0..1) e tamanho do passo */
  phase: number;
  stride: number;
  /** Onda da cauda */
  wave: number;
  legs: 'walk' | 'tuck' | 'dangle';
  tailUp: number;
}

function drawMico(p: Pose): Raster {
  const r = new Raster(W, H);
  const by = 10 + p.bob;

  // Cauda: sai do quadril, desce e enrola pra cima conforme tailUp
  const pts: [number, number][] = [];
  for (let i = 0; i <= 6; i++) {
    const x = 6.5 - i * 1.15;
    const y = by - 0.5 + i * (1.3 - p.tailUp * 0.55) - Math.sin(i * 0.9 + p.wave * TAU) * 0.8;
    pts.push([x, y]);
  }
  r.tail(pts, 1.6, 1, FUR_FAR, MANE);

  const legsFor = (far: boolean) => {
    const tone = far ? FUR_FAR : FUR;
    const off = far ? 0.5 : 0;
    const hips: [number, number][] = [[8 + (far ? 0.6 : 0), by + 1.2], [13.5 + (far ? 0.6 : 0), by + 1.2]];
    hips.forEach(([hx, hy], i) => {
      let fx: number;
      let fy: number;
      if (p.legs === 'walk') {
        [fx, fy] = foot(hx, GROUND, p.phase + off + i * 0.5, p.stride, 1.6);
      } else if (p.legs === 'tuck') {
        fx = hx + (i === 0 ? 1.5 : 2.5);
        fy = hy + 2.2;
      } else {
        fx = hx + (i === 0 ? -1.5 : 1.5);
        fy = GROUND - 0.5;
      }
      r.limb(hx, hy, fx, fy, 0.8, tone);
    });
  };

  legsFor(true);
  r.ellipse(10.8, by, 4.6, 3, FUR, { grain: 0.1 });
  legsFor(false);

  // Cabeça: juba grande e a cara escura virada pra frente
  const hx = 16;
  const hy = by - 3.6;
  r.ellipse(hx - 0.5, hy - 2.4, 1.6, 1.4, MANE);
  r.ellipse(hx, hy, 4, 3.8, MANE, { grain: 0.18 });
  r.ellipse(hx + 1.7, hy + 0.7, 1.9, 2.2, FACE);
  r.outline();
  r.set(hx + 2.2, hy, EYE);
  return r;
}

function drawClimb(t: number, moving: boolean): Raster {
  const r = new Raster(W, H);
  const reach = moving ? Math.sin(t * TAU) * 1.6 : 0;

  // Cauda pendurada, balançando
  const pts: [number, number][] = [];
  for (let i = 0; i <= 6; i++) pts.push([9 - Math.sin(i * 0.7 + t * TAU) * 0.8 - i * 0.3, 12 + i * 0.9]);
  r.tail(pts, 1.2, 0.7, FUR_FAR, MANE);

  r.limb(11, 7, 13, 2.5 + reach, 0.8, FUR_FAR);
  r.limb(11, 13, 13, 15.5 - reach, 0.8, FUR_FAR);
  r.ellipse(11, 10, 3, 4.4, FUR);
  r.limb(11.5, 7.5, 13.5, 3.5 - reach, 0.8, FUR);
  r.limb(11.5, 13, 13.5, 15 + reach * 0.5, 0.8, FUR);

  r.ellipse(11.8, 3.2, 3.5, 3.3, MANE);
  r.ellipse(13.4, 3.8, 1.7, 2, FACE);
  r.outline();
  r.set(14, 3.2, EYE);
  return r;
}

export function micoArt(): HeroArt {
  return {
    key: 'mico',
    frameW: W,
    frameH: H,
    anims: [
      {
        name: 'idle',
        fps: 5,
        repeat: true,
        frames: cycle(4, (t) => drawMico({ bob: Math.round(Math.sin(t * TAU) * 0.5 + 0.5) * 0.5, phase: 0, stride: 0, wave: t, legs: 'walk', tailUp: 0 })),
      },
      {
        name: 'run',
        fps: 14,
        repeat: true,
        frames: cycle(6, (t) => drawMico({ bob: Math.abs(Math.sin(t * TAU)) * -0.8, phase: t, stride: 2.4, wave: t * 2, legs: 'walk', tailUp: 0.6 })),
      },
      {
        name: 'jump',
        fps: 10,
        repeat: false,
        frames: cycle(2, (t) => drawMico({ bob: -0.5, phase: 0, stride: 0, wave: t * 0.5, legs: 'tuck', tailUp: 1 })),
      },
      {
        name: 'fall',
        fps: 8,
        repeat: true,
        frames: cycle(2, (t) => drawMico({ bob: 0, phase: 0, stride: 0, wave: 0.5 + t * 0.5, legs: 'dangle', tailUp: 1.4 })),
      },
      { name: 'climb', fps: 8, repeat: true, frames: cycle(4, (t) => drawClimb(t, true)) },
      { name: 'cling', fps: 1, repeat: false, frames: [drawClimb(0, false)] },
    ],
  };
}
