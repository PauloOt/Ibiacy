import { mix, ramp, type Ramp } from './color';
import { Raster } from './raster';
import { rng } from './rng';

/** Camadas do fundo em resolução de arte (480×270 = tela inteira com ART_SCALE 2). Emendam nas laterais. */
export const BG_W = 480;
export const BG_H = 270;

const TAU = Math.PI * 2;

/** Elipse que dá a volta na largura, pra camada emendar quando repete. */
function wrapEllipse(r: Raster, cx: number, cy: number, rx: number, ry: number, tone: Ramp, grain = 0): void {
  for (const off of [-BG_W, 0, BG_W]) {
    if (cx + off + rx < 0 || cx + off - rx > BG_W) continue;
    r.ellipse(cx + off, cy, rx, ry, tone, { grain });
  }
}

/** Ondulação periódica na largura: soma de senos com número inteiro de ciclos. */
function ridge(x: number, waves: [number, number, number][]): number {
  return waves.reduce((y, [cycles, amp, phase]) => y + Math.sin((x / BG_W) * TAU * cycles + phase) * amp, 0);
}

export function skyLayer(): Raster {
  const r = new Raster(BG_W, BG_H);
  const top = 0x8fd0e8;
  const bottom = 0xf0f0c8;
  // Degradê em faixas, com xadrez na troca de faixa (cara de pixel art)
  const bands = 14;
  for (let y = 0; y < BG_H; y++) {
    const t = y / BG_H;
    const band = Math.floor(t * bands);
    const frac = t * bands - band;
    for (let x = 0; x < BG_W; x++) {
      const b = frac > 0.75 && (x + y) % 2 === 0 ? band + 1 : band;
      r.set(x, y, mix(top, bottom, Math.min(1, b / bands)));
    }
  }
  // Nuvens fofas
  const rand = rng(3);
  const cloud = ramp(0xffffff, 0.1, 0.18);
  for (let i = 0; i < 6; i++) {
    const cx = rand() * BG_W;
    const cy = 20 + rand() * 60;
    for (let j = 0; j < 5; j++) wrapEllipse(r, cx + (j - 2) * 9 + rand() * 4, cy - Math.sin((j / 4) * Math.PI) * 6, 9 + rand() * 4, 5 + rand() * 2, cloud);
  }
  return r;
}

/** Serra do Mar ao longe, azulada, com névoa embaixo. */
export function mountainLayer(): Raster {
  const r = new Raster(BG_W, BG_H);
  const far = 0x86aeb0;
  const near = 0x6e9a8c;
  for (let x = 0; x < BG_W; x++) {
    const y1 = 120 + ridge(x, [[2, 22, 0.4], [5, 9, 1.3], [11, 3, 2]]);
    const y2 = 150 + ridge(x, [[3, 16, 2.1], [7, 7, 0.2], [13, 2.5, 1]]);
    for (let y = Math.floor(y1); y < BG_H; y++) r.set(x, y, y < y1 + 2 ? mix(far, 0xffffff, 0.35) : far);
    for (let y = Math.floor(y2); y < BG_H; y++) r.set(x, y, y < y2 + 2 ? mix(near, 0xffffff, 0.3) : near);
  }
  // Névoa
  for (let y = 175; y < BG_H; y++) for (let x = 0; x < BG_W; x++) {
    const t = (y - 175) / 60;
    if (t > 0.15 || (x + y) % 2 === 0) r.set(x, y, mix(r.get(x, y) ?? near, 0xe8f2e0, Math.min(0.75, t)));
  }
  return r;
}

/** Copas da mata: cachos de folhagem com luz, e alguns ipês-amarelos. */
export function canopyLayer(): Raster {
  const r = new Raster(BG_W, BG_H);
  const rand = rng(11);
  const greens = [ramp(0x3e7d4a, 0.38, 0.4), ramp(0x4a8a46, 0.4, 0.4), ramp(0x356f45, 0.35, 0.4)];
  const ipe = ramp(0xe8b830, 0.4, 0.4);
  const trunk = ramp(0x4a3a30, 0.2, 0.3);
  for (let i = 0; i < 26; i++) {
    const cx = (i / 26) * BG_W + rand() * 12;
    const base = 175 + ridge(cx, [[3, 10, 1], [7, 5, 0.3]]);
    const size = 16 + rand() * 12;
    for (let y = base; y < BG_H; y++) for (const off of [-BG_W, 0, BG_W]) r.set(cx + off, y, trunk.lo);
    const tone = rand() < 0.12 ? ipe : greens[i % 3];
    for (let j = 0; j < 4; j++) {
      wrapEllipse(r, cx + (rand() - 0.5) * size, base - size * 0.5 - rand() * size * 0.5, size * (0.45 + rand() * 0.25), size * (0.35 + rand() * 0.15), tone, 0.12);
    }
  }
  // Massa de mata embaixo das copas
  const low = ramp(0x2f6440, 0.3, 0.4);
  for (let x = 0; x < BG_W; x += 7) wrapEllipse(r, x, 205 + ridge(x, [[4, 5, 0]]), 12, 9, low, 0.1);
  for (let y = 210; y < BG_H; y++) for (let x = 0; x < BG_W; x++) if (r.get(x, y) === null) r.set(x, y, low.lo);
  return r;
}

/** Folhagem escura bem perto, na base da tela. */
export function bushLayer(): Raster {
  const r = new Raster(BG_W, BG_H);
  const rand = rng(23);
  const dark = ramp(0x23452e, 0.35, 0.35);
  for (let x = 0; x < BG_W; x += 10) {
    const h = 26 + ridge(x, [[5, 8, 0.7], [9, 4, 2]]);
    wrapEllipse(r, x + rand() * 6, BG_H - h, 13 + rand() * 6, 10 + rand() * 5, dark, 0.15);
  }
  for (let y = BG_H - 24; y < BG_H; y++) for (let x = 0; x < BG_W; x++) if (r.get(x, y) === null) r.set(x, y, dark.lo);
  // Pontinhos de luz na folhagem
  for (let i = 0; i < 60; i++) r.paint(rand() * BG_W, BG_H - 10 - rand() * 30, dark.hi);
  return r;
}
