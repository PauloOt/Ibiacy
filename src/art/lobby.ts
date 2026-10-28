import { ramp } from './color';
import { Raster } from './raster';
import { rng } from './rng';

// Peças grandes do lobby: o ipê da clareira (Recorde) e a toca no barranco (Créditos).

const BARK = ramp(0x6a4426, 0.35, 0.45);
const IPE = ramp(0xf2c230, 0.45, 0.4);
const DIRT = ramp(0x6e4526, 0.3, 0.4);
const GRASS = ramp(0x4f9a3a, 0.45, 0.4);
const STONE = ramp(0x8a8478, 0.35, 0.4);
const CAVE = { hi: 0x2a1a1e, base: 0x1c1014, lo: 0x140a0e, deep: 0x0c0608 };
const OCHRE = 0xc0582a;

/** Ipê-amarelo grande, 120×130. Base (raízes) na última linha. */
export function bigIpeFrame(): Raster {
  const r = new Raster(120, 130);
  r.limb(60, 129, 60, 62, 5, BARK);
  r.limb(60, 126, 44, 129, 2, BARK);
  r.limb(60, 126, 78, 129, 2, BARK);
  r.limb(60, 86, 34, 54, 2.2, BARK);
  r.limb(60, 80, 88, 50, 2.2, BARK);
  r.limb(60, 72, 58, 36, 2.5, BARK);
  const rand = rng(9);
  const blobs: [number, number, number][] = [[60, 42, 24], [36, 52, 17], [86, 50, 18], [46, 30, 16], [76, 30, 16], [60, 22, 14], [24, 60, 10], [98, 60, 11]];
  for (const [x, y, s] of blobs) r.ellipse(x, y, s, s * 0.82, IPE, { grain: 0.25 });
  // Flores mais claras e mais escuras salpicadas na copa
  for (let i = 0; i < 140; i++) r.paint(10 + rand() * 100, 8 + rand() * 62, rand() < 0.6 ? 0xfff3a0 : 0xd89a18);
  return r.outline();
}

/** Barranco com a boca da toca e a pedra pintada, 150×100. Chão na última linha. */
export function tocaFrame(): Raster {
  const r = new Raster(150, 100);
  r.ellipse(80, 100, 82, 78, DIRT, { grain: 0.2 });
  // Grama no topo do barranco
  for (let x = 0; x < r.w; x++) {
    let top = 0;
    while (top < r.h && r.get(x, top) === null) top++;
    for (let k = 0; k < 4 && top + k < r.h; k++) r.set(x, top + k, k === 0 ? GRASS.hi : k === 3 ? GRASS.deep : GRASS.base);
  }
  r.ellipse(84, 96, 22, 24, CAVE, { flat: true });
  // Raízes penduradas na boca
  const rand = rng(4);
  for (let i = 0; i < 6; i++) {
    let x = 66 + rand() * 36;
    for (let y = 72 + rand() * 4; y < 84 + rand() * 8; y++) {
      x += rand() < 0.5 ? -0.5 : 0.5;
      r.set(x, y, DIRT.deep);
    }
  }
  for (const [x, y, s] of [[58, 92, 5], [110, 94, 6], [62, 98, 4]]) r.ellipse(x, y, s, s * 0.7, STONE);
  // Pedra pintada: uma onça e uma mão em ocre
  r.ellipse(30, 88, 13, 10, STONE);
  for (const [x, y] of [[24, 86], [25, 86], [26, 86], [27, 86], [28, 86], [23, 85], [29, 85], [24, 87], [28, 87], [30, 84], [31, 83], [22, 84]]) r.set(x, y, OCHRE);
  for (const [x, y] of [[34, 84], [35, 84], [36, 84], [34, 85], [35, 85], [36, 85], [33, 83], [34, 82], [35, 82], [36, 82], [37, 83]]) r.set(x, y, OCHRE);
  return r.outline();
}
