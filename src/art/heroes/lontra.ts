import { ramp } from '../color';
import { Raster } from '../raster';
import { cycle, foot, TAU, type HeroArt } from './types';

const W = 26;
const H = 13;
const GROUND = 10.5;

const FUR = ramp(0x7d4b2a, 0.38);
const FUR_FAR = ramp(0x5c3519, 0.3);
const BELLY = ramp(0xd8b088, 0.2, 0.25);
const NOSE = 0x241410;
const EYE = 0x140c08;
const SHINE = 0xfff4d8;

interface Pose {
  bob: number;
  phase: number;
  stride: number;
  wave: number;
  mode: 'walk' | 'tuck' | 'dangle' | 'swim';
}

function drawLontra(p: Pose): Raster {
  const r = new Raster(W, H);
  const swim = p.mode === 'swim';
  const bx = 12;
  const by = 6.8 + p.bob;
  const rx = swim ? 8 : 7.4;

  // Cauda grossa que afina, ondulando (bem mais na água)
  const amp = swim ? 1.3 : 0.5;
  const pts: [number, number][] = [];
  for (let i = 0; i <= 5; i++) pts.push([bx - rx + 1.5 - i * 1.1, by + 0.6 + i * 0.25 + Math.sin(i * 0.9 - p.wave * TAU) * amp * (i / 5)]);
  r.tail(pts, 1.9, 0.7, FUR);

  const hips: [number, number][] = [[bx - rx + 2.6, by + 1.6], [bx + rx - 2.4, by + 1.6]];
  const legsFor = (far: boolean) => {
    const tone = far ? FUR_FAR : FUR;
    hips.forEach(([hx0, hy], i) => {
      const hx = hx0 + (far ? 0.7 : 0);
      let fx: number;
      let fy: number;
      if (p.mode === 'walk') [fx, fy] = foot(hx, GROUND, p.phase + i * 0.5 + (far ? 0.25 : 0), p.stride, 1.2);
      else if (p.mode === 'swim') {
        // Remada: o pé vai pra trás e volta
        const s = Math.sin((p.phase + i * 0.5 + (far ? 0.5 : 0)) * TAU);
        [fx, fy] = [hx - 1.5 + s * 1.6, hy + 1.6 - Math.abs(s) * 0.6];
      } else if (p.mode === 'tuck') [fx, fy] = [hx + 1.4, hy + 1.6];
      else [fx, fy] = [hx + (i === 0 ? -1 : 1), GROUND - 0.3];
      r.limb(hx, hy, fx, fy, 0.95, tone);
    });
  };

  legsFor(true);
  r.ellipse(bx, by, rx, 2.9, FUR, { grain: 0.12 });
  r.ellipse(bx + 1, by + 1.9, rx - 1.8, 1.3, BELLY, { only: true });
  legsFor(false);

  const hx = bx + rx + 0.6;
  const hy = by - 1.2 - (swim ? 0.6 : 0);
  r.ellipse(hx - 1.6, hy - 2.1, 0.9, 0.8, FUR);
  r.ellipse(hx, hy, 3.2, 2.6, FUR);
  r.ellipse(hx + 2, hy + 0.8, 1.5, 1.2, BELLY);
  r.outline();
  r.set(hx + 0.6, hy - 0.8, EYE);
  r.set(hx + 3.3, hy + 0.2, NOSE);
  if (swim) r.set(hx - 1, hy - 1.5, SHINE);
  return r;
}

export function lontraArt(): HeroArt {
  return {
    key: 'lontra',
    frameW: W,
    frameH: H,
    anims: [
      {
        name: 'idle',
        fps: 5,
        repeat: true,
        frames: cycle(4, (t) => drawLontra({ bob: Math.round(Math.sin(t * TAU) * 0.5 + 0.5) * 0.5, phase: 0, stride: 0, wave: t * 0.5, mode: 'walk' })),
      },
      {
        name: 'run',
        fps: 12,
        repeat: true,
        // Lontra em terra anda "corcunda", subindo e descendo bastante
        frames: cycle(6, (t) => drawLontra({ bob: -Math.abs(Math.sin(t * TAU)) * 1.1, phase: t, stride: 1.8, wave: t, mode: 'walk' })),
      },
      { name: 'jump', fps: 10, repeat: false, frames: [drawLontra({ bob: -0.5, phase: 0, stride: 0, wave: 0.2, mode: 'tuck' })] },
      {
        name: 'fall',
        fps: 8,
        repeat: true,
        frames: cycle(2, (t) => drawLontra({ bob: 0, phase: 0, stride: 0, wave: 0.5 + t * 0.4, mode: 'dangle' })),
      },
      {
        name: 'swim',
        fps: 10,
        repeat: true,
        frames: cycle(6, (t) => drawLontra({ bob: Math.sin(t * TAU) * 0.5, phase: t, stride: 0, wave: t, mode: 'swim' })),
      },
    ],
  };
}
