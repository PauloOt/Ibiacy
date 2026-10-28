import { mix, ramp } from './color';
import { Raster } from './raster';
import { rng } from './rng';

// O hub: o salão dentro do tronco da árvore gigante, em vista 3/4 de cima (guia visual).
// O fundo é uma imagem só (parede, chão, rampa, fungos); o que o bicho pode passar na frente
// ou atrás (lojinha, monte do Ubiraçá, bica) é sprite separado, ordenado pela altura do pé.

const BARK = ramp(0x7a4e30, 0.35, 0.45);
const FLOOR = ramp(0xa47450, 0.3, 0.4);
const WOOD = ramp(0xb07a48, 0.35, 0.4);
const CAP = ramp(0xd8783a, 0.45, 0.45);
const FUNGUS = ramp(0xffa040, 0.45, 0.4);
const MOSS = ramp(0x4a6a2a, 0.4, 0.45);
const STONE = ramp(0x8a8478, 0.35, 0.4);
const OLIVE = ramp(0x6f7a4a, 0.4, 0.45);
const SKIN = ramp(0x8a8a6a, 0.4, 0.4);
const BROWN = ramp(0x7a5a3a, 0.4, 0.45);
const QUATI = ramp(0xb06a3a, 0.45, 0.45);
const NIGHT = 0x120a08;
const RIM = 0x1c100a;

/** Tamanho do fundo em pixels de arte (no mundo é o dobro). */
export const HUB_W = 480;
export const HUB_H = 520;
/** Chão: elipse do corte do tronco visto de cima. */
export const FLOOR_E = { cx: 240, cy: 380, rx: 220, ry: 128 } as const;
/** Fungos de prateleira na parede (luz do lugar). */
export const HUB_FUNGI: readonly [number, number][] = [
  [70, 212], [128, 196], [186, 226], [298, 204], [352, 230], [414, 198],
  [36, 128], [150, 104], [258, 150], [440, 118], [96, 46], [392, 160], [212, 60],
];
/** Nó da casca por onde entra um fio de luz. */
export const KNOT: readonly [number, number] = [352, 58];

const inFloor = (x: number, y: number) => ((x - FLOOR_E.cx) / FLOOR_E.rx) ** 2 + ((y - FLOOR_E.cy) / FLOOR_E.ry) ** 2;

export function hubRoomFrame(): Raster {
  const r = new Raster(HUB_W, HUB_H);
  const rand = rng(41);
  const jitter = Array.from({ length: HUB_W }, () => rand());

  // Casca por dentro em tudo: sulcos verticais ondulados, escurecendo pra cima (o oco sobe no escuro)
  for (let y = 0; y < HUB_H; y++) {
    const dark = y < 250 ? (1 - y / 250) * 0.65 : 0;
    for (let x = 0; x < HUB_W; x++) {
      const g = (x + Math.round(Math.sin(y * 0.11 + jitter[x] * 6) * 1.5)) % 11;
      const c = g === 0 ? BARK.deep : g === 1 ? BARK.lo : g === 10 ? BARK.hi : (x * 7 + y * 3) % 13 === 0 ? BARK.lo : BARK.base;
      r.set(x, y, mix(c, NIGHT, dark));
    }
  }

  // Chão: anéis do tronco cortado, com sombra junto da parede do fundo
  for (let y = 0; y < HUB_H; y++) for (let x = 0; x < HUB_W; x++) {
    const d2 = inFloor(x, y);
    if (d2 > 1) continue;
    const d = Math.sqrt(d2);
    const a = Math.atan2((y - FLOOR_E.cy) / FLOOR_E.ry, (x - FLOOR_E.cx) / FLOOR_E.rx);
    const ring = Math.floor(d * 13 + Math.sin(a * 5) * 0.25);
    let c = ring % 4 === 0 ? FLOOR.lo : ring % 2 ? FLOOR.base : FLOOR.hi;
    if ((x * 5 + y * 11) % 17 === 0) c = FLOOR.lo;
    if (d > 0.95) c = FLOOR.deep;
    const back = y < FLOOR_E.cy ? Math.max(0, (FLOOR_E.cy - y) / FLOOR_E.ry - 0.55) : 0;
    r.set(x, y, mix(c, RIM, Math.min(0.55, back)));
  }

  // Borda de perto: o corte da casca visto de cima, escuro
  for (let y = FLOOR_E.cy; y < HUB_H; y++) for (let x = 0; x < HUB_W; x++) {
    if (inFloor(x, y) <= 1) continue;
    const c = r.get(x, y) ?? BARK.base;
    r.set(x, y, mix(c, RIM, 0.62));
  }
  // Sombra na base da parede do fundo
  for (let x = 0; x < HUB_W; x++) {
    const dx = (x - FLOOR_E.cx) / FLOOR_E.rx;
    if (Math.abs(dx) >= 1) continue;
    const top = Math.round(FLOOR_E.cy - FLOOR_E.ry * Math.sqrt(1 - dx * dx));
    for (let k = 1; k <= 8; k++) {
      const c = r.get(x, top - k);
      if (c !== null) r.set(x, top - k, mix(c, RIM, 0.5 * (1 - k / 9)));
    }
  }

  // Rampa em espiral subindo pela parede: degraus com face de cima clara e frente escura
  for (let i = 0; i < 12; i++) {
    const x = 18 + i * 36;
    const y = 252 - i * 21;
    const dark = y < 250 ? (1 - y / 250) * 0.55 : 0;
    r.rect(x, y, 28, 5, mix(WOOD.hi, NIGHT, dark));
    r.rect(x, y + 5, 28, 6, mix(WOOD.lo, NIGHT, dark));
    r.rect(x, y + 11, 28, 1, RIM);
  }

  // Nó da casca: um buraco claro lá no alto
  r.ellipse(KNOT[0], KNOT[1], 11, 8, ramp(0x3a2214), { flat: true });
  r.ellipse(KNOT[0], KNOT[1] + 1, 8, 5.5, ramp(0xffe0a0, 0.3, 0.2), { flat: true });

  // Fungos de prateleira
  for (const [fx, fy] of HUB_FUNGI) {
    r.ellipse(fx, fy + 2, 9, 2.6, ramp(0x8a4a20), { flat: true });
    r.ellipse(fx, fy, 9, 3.4, FUNGUS);
    for (let i = -6; i <= 6; i += 3) r.set(fx + i, fy - 1, 0xffe0a0);
  }
  return r;
}

/** Lojinha do quati: balcão em 3/4 com o cogumelo de toldo e os potes. Base na última linha. */
export function lojaFrame(): Raster {
  const r = new Raster(100, 76);
  // Toldo de cogumelo
  r.limb(50, 52, 50, 22, 3, ramp(0xe8dcc0));
  r.ellipse(50, 18, 44, 13, CAP, { grain: 0.2 });
  for (const [x, y] of [[30, 12], [46, 8], [64, 14], [74, 20], [22, 20], [56, 22]]) r.ellipse(x, y, 3, 2, ramp(0xf3e2c8), { only: true });
  r.rect(8, 26, 84, 2, CAP.deep);
  // Balcão: tampo (de cima) e frente
  r.rect(8, 48, 84, 10, WOOD.hi);
  r.rect(8, 58, 84, 16, WOOD.base);
  for (let x = 12; x < 92; x += 10) r.rect(x, 58, 1, 16, WOOD.lo);
  r.rect(8, 74, 84, 2, WOOD.deep);
  // Potes em cima do tampo
  const jars = [0xf2a830, 0x6fc04a, 0xf0f0e8, 0xd84a4a, 0xf2a830];
  jars.forEach((c, i) => {
    const t = ramp(c, 0.4, 0.4);
    r.rect(16 + i * 16, 40, 8, 10, t.base);
    r.rect(16 + i * 16, 40, 8, 2, t.hi);
    r.rect(17 + i * 16, 38, 6, 2, WOOD.lo);
  });
  return r.outline();
}

/** Monte de musgo onde o Ubiraçá fica. */
export function moundFrame(): Raster {
  const r = new Raster(90, 26);
  r.ellipse(45, 16, 43, 10, MOSS, { grain: 0.3 });
  const rand = rng(8);
  for (let i = 0; i < 9; i++) {
    const x = 6 + rand() * 78;
    r.limb(x, 18, x + (rand() - 0.5) * 6, 8 + rand() * 4, 0.6, ramp(0x6aa83a));
  }
  return r.outline();
}

/** Bica d'água da lontra: bacia de pedra com água. */
export function basinFrame(): Raster {
  const r = new Raster(64, 30);
  r.ellipse(32, 17, 30, 12, STONE);
  r.ellipse(32, 15, 24, 8, ramp(0x3f8ec0, 0.4, 0.3), { flat: true });
  for (const [x, y] of [[22, 13], [23, 13], [36, 16], [37, 16], [44, 12]]) r.set(x, y, 0xbfe8f0);
  return r.outline();
}

/** Ubiraçá: jabuti ancião, com as trilhas das missões em dourado no casco. `nod` 1 = cabeça levantada. */
export function jabutiFrame(nod: number): Raster {
  const r = new Raster(48, 30);
  r.limb(10, 27, 8, 29, 2, SKIN);
  r.limb(36, 27, 38, 29, 2, SKIN);
  r.ellipse(24, 18, 17, 11, OLIVE, { grain: 0.2 });
  for (let y = 9; y < 28; y++) for (let x = 7; x < 42; x++) {
    if (r.get(x, y) === null) continue;
    if ((x + (Math.floor(y / 5) % 2) * 4) % 8 === 0 || y % 5 === 0) r.paint(x, y, OLIVE.deep);
  }
  r.rect(7, 26, 35, 2, BROWN.lo);
  for (const [x, y] of [[14, 15], [15, 15], [16, 16], [17, 16], [18, 17], [20, 17], [21, 16], [22, 15], [24, 14], [25, 14], [27, 15], [29, 16], [30, 17], [32, 18]]) r.paint(x, y, 0xf2c230);
  for (const [x, y] of [[13, 15], [33, 18], [24, 13]]) r.paint(x, y, 0xfff3a0);
  const hy = 19 - nod;
  r.limb(9, 22, 4, hy, 2.4, SKIN);
  r.ellipse(3, hy - 1, 3.4, 2.6, SKIN);
  r.set(2, hy - 2, 0x1a0f14);
  r.set(1, hy, SKIN.deep);
  r.set(4, hy + 1, SKIN.lo);
  return r.outline();
}

/** O quati da lojinha, com a cauda listrada balançando (4 quadros). */
export function quatiFrames(): Raster[] {
  return [0, 0.25, 0.5, 0.75].map((t) => {
    const r = new Raster(28, 22);
    const sway = Math.sin(t * Math.PI * 2) * 1.5;
    r.tail([[19, 14], [23, 10], [24 + sway, 5], [22 + sway, 1]], 2.2, 1.2, QUATI);
    for (let y = 0; y < 14; y += 3) for (let x = 18; x < 28; x++) if (r.get(x, y) !== null) r.paint(x, y, QUATI.deep);
    r.ellipse(14, 15, 7, 4.5, QUATI, { grain: 0.15 });
    r.limb(10, 18, 10, 21, 1, QUATI);
    r.limb(17, 18, 17, 21, 1, QUATI);
    r.ellipse(7, 12, 4, 3.2, QUATI);
    r.limb(5, 13, 1, 15, 1.2, QUATI);
    r.ellipse(6, 11, 2, 1, ramp(0xf0e0c8));
    r.set(6, 11, 0x1a0f14);
    return r.outline();
  });
}
