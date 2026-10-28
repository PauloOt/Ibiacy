import { mix, ramp, type Color } from './color';
import { cycle, TAU } from './heroes/types';
import { Raster } from './raster';
import { rng } from './rng';

/** Tile de arte: 16×16 (no mundo, 32×32). */
export const T = 16;

const DIRT = ramp(0x6e4526, 0.3, 0.4);
const STONE = ramp(0x8a8478, 0.35, 0.4);
const GRASS = ramp(0x4f9a3a, 0.45, 0.4);
const MOSS = ramp(0x5f8f2e, 0.4, 0.4);
const BARK = ramp(0x6a4426, 0.35, 0.45);
const WOOD = ramp(0xc89a62, 0.3, 0.35);
const LEAF = ramp(0x3f8a3a, 0.45, 0.45);
const ROPE = ramp(0xcaa66a, 0.3, 0.4);
const SEED = ramp(0x9a5a2a, 0.45, 0.45);
const IPE = ramp(0xf2c230, 0.45, 0.4);
const WATER = { top: 0x6fc0dc, body: 0x2f86b8, deep: 0x23649a, light: 0xbfe8f0 };

// ---------- chão ----------

export interface GroundSides {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
}

/** Índice do frame no sheet 'ground': 16 combinações de lados expostos × GROUND_VARIANTS variações. */
export const GROUND_VARIANTS = 6;
export function groundFrame(s: GroundSides, variant: number): number {
  const combo = (s.top ? 1 : 0) | (s.bottom ? 2 : 0) | (s.left ? 4 : 0) | (s.right ? 8 : 0);
  return combo * GROUND_VARIANTS + (variant % GROUND_VARIANTS);
}

function groundTile(s: GroundSides, variant: number): Raster {
  const r = new Raster(T, T);
  const rand = rng(1000 + variant * 77);
  // Terra em manchas (não pixel solto): fundo, manchas escuras e alguns pontos de luz
  r.rect(0, 0, T, T, DIRT.base);
  for (let i = 0; i < 4; i++) {
    r.ellipse(rand() * T, rand() * T, 1.5 + rand() * 2.5, 1 + rand() * 1.5, { ...DIRT, base: DIRT.lo, hi: DIRT.lo }, { flat: true });
  }
  for (let i = 0; i < 6; i++) r.set(rand() * T, rand() * T, rand() < 0.5 ? DIRT.hi : DIRT.deep);
  // Pedrinha só em parte dos tiles
  const stones = Math.floor(rand() * 2.4);
  for (let i = 0; i < stones; i++) {
    const cx = 2.5 + rand() * 11;
    const cy = (s.top ? 7 : 2.5) + rand() * (s.top ? 6 : 11);
    r.ellipse(cx, cy, 1.3 + rand() * 0.9, 0.9 + rand() * 0.5, STONE);
  }
  // Raízes finas
  if (rand() < 0.5) {
    let x = rand() * T;
    for (let y = s.top ? 5 : 0; y < T; y++) {
      x += rand() < 0.5 ? -0.6 : 0.6;
      r.set(x, y, DIRT.deep);
    }
  }
  if (s.left) for (let y = 0; y < T; y++) { r.set(0, y, DIRT.deep); r.set(1, y, DIRT.lo); }
  if (s.right) for (let y = 0; y < T; y++) { r.set(T - 1, y, DIRT.deep); r.set(T - 2, y, DIRT.lo); }
  if (s.bottom) for (let x = 0; x < T; x++) { r.set(x, T - 1, DIRT.deep); r.set(x, T - 2, DIRT.lo); }
  if (s.top) {
    // Camada de grama com a borda de baixo irregular, luz em cima
    for (let x = 0; x < T; x++) {
      const depth = 3 + Math.round(rand() * 2 + Math.sin(x * 1.3 + variant) * 0.8);
      for (let y = 0; y < depth; y++) {
        const c = y === 0 ? GRASS.hi : y === depth - 1 ? GRASS.lo : (x + y) % 3 === 0 ? GRASS.hi : GRASS.base;
        r.set(x, y, c);
      }
      r.set(x, depth, GRASS.deep);
    }
    if (s.left) for (let y = 0; y < 4; y++) r.set(0, y, GRASS.lo);
    if (s.right) for (let y = 0; y < 4; y++) r.set(T - 1, y, GRASS.lo);
  }
  return r;
}

export function groundFrames(): Raster[] {
  const out: Raster[] = [];
  for (let combo = 0; combo < 16; combo++) {
    const s = { top: !!(combo & 1), bottom: !!(combo & 2), left: !!(combo & 4), right: !!(combo & 8) };
    for (let v = 0; v < GROUND_VARIANTS; v++) out.push(groundTile(s, v));
  }
  return out;
}

// ---------- mundo gerado: pedra, copa, galho, tronco e parede do subsolo ----------

/** Índice no sheet 'stone': 16 combinações de lados expostos × STONE_VARIANTS. */
export const STONE_VARIANTS = 3;
export function stoneFrame(s: GroundSides, variant: number): number {
  const combo = (s.top ? 1 : 0) | (s.bottom ? 2 : 0) | (s.left ? 4 : 0) | (s.right ? 8 : 0);
  return combo * STONE_VARIANTS + (variant % STONE_VARIANTS);
}

function stoneTile(s: GroundSides, variant: number): Raster {
  const r = new Raster(T, T);
  const rand = rng(2000 + variant * 53);
  r.rect(0, 0, T, T, STONE.lo);
  // Blocos de pedra encaixados, com luz em cima
  for (let i = 0; i < 5; i++) r.ellipse(rand() * T, rand() * T, 3 + rand() * 3, 2 + rand() * 2, STONE, { grain: 0.15 });
  // Fendas
  let x = rand() * T;
  for (let y = 0; y < T; y++) {
    x += rand() < 0.5 ? -0.6 : 0.6;
    if (rand() < 0.7) r.set(x, y, STONE.deep);
  }
  if (s.left) for (let y = 0; y < T; y++) r.set(0, y, STONE.deep);
  if (s.right) for (let y = 0; y < T; y++) r.set(T - 1, y, STONE.deep);
  if (s.bottom) for (let x2 = 0; x2 < T; x2++) r.set(x2, T - 1, STONE.deep);
  if (s.top) {
    // Musgo por cima da pedra exposta
    for (let x2 = 0; x2 < T; x2++) {
      const depth = 1 + Math.round(rand() * 1.5 + Math.sin(x2 * 1.1 + variant));
      for (let y = 0; y < depth; y++) r.set(x2, y, y === 0 ? MOSS.hi : MOSS.base);
      r.set(x2, depth, STONE.hi);
    }
  }
  return r;
}

export function stoneFrames(): Raster[] {
  const out: Raster[] = [];
  for (let combo = 0; combo < 16; combo++) {
    const s = { top: !!(combo & 1), bottom: !!(combo & 2), left: !!(combo & 4), right: !!(combo & 8) };
    for (let v = 0; v < STONE_VARIANTS; v++) out.push(stoneTile(s, v));
  }
  return out;
}

/** Copa que dá pra pisar: 0 ponta esquerda, 1–2 meio, 3 ponta direita. */
export function canopyFrames(): Raster[] {
  return [0, 1, 2, 3].map((kind) => {
    const r = new Raster(T, T);
    const rand = rng(3000 + kind);
    const x0 = kind === 0 ? 4 : -2;
    const x1 = kind === 3 ? 12 : T + 2;
    for (let i = 0; i < 9; i++) {
      const cx = x0 + rand() * (x1 - x0);
      r.ellipse(cx, 4 + rand() * 9, 3 + rand() * 2.5, 2.5 + rand() * 2, LEAF, { grain: 0.2 });
    }
    // Pontos de luz no topo
    for (let i = 0; i < 6; i++) r.paint(x0 + rand() * (x1 - x0), 2 + rand() * 3, LEAF.hi);
    return r.outline();
  });
}

/** Galho que dá pra pisar: 0 ponta esquerda, 1 meio, 2 ponta direita. */
export function branchFrames(): Raster[] {
  return [0, 1, 2].map((kind) => {
    const r = new Raster(T, T);
    const x0 = kind === 0 ? 3 : 0;
    const x1 = kind === 2 ? 12 : T;
    for (let x = x0; x < x1; x++) {
      const taper = kind === 0 ? (x - x0) / 6 : kind === 2 ? (x1 - x) / 6 : 1;
      const h = 2 + Math.round(Math.min(1, taper) * 2);
      for (let y = 0; y < h; y++) r.set(x, 2 + y, y === 0 ? BARK.hi : y === h - 1 ? BARK.lo : BARK.base);
    }
    if (kind === 2) r.ellipse(12.5, 2, 2, 1.3, LEAF);
    return r.outline();
  });
}

/** Tronco de fundo (não colide): 4 variações que emendam em cima e embaixo. */
export function trunkFrames(): Raster[] {
  return [0, 1, 2, 3].map((v) => {
    const r = new Raster(T, T);
    const rand = rng(4000 + v);
    for (let y = 0; y < T; y++) for (let x = 4; x < 12; x++) {
      const stripe = (x + Math.floor(Math.sin(y * 0.35 + v) * 1.4)) % 3 === 0;
      r.set(x, y, x === 4 ? BARK.hi : x === 11 ? BARK.deep : stripe ? BARK.lo : BARK.base);
    }
    if (rand() < 0.5) r.ellipse(8, 4 + rand() * 8, 1.5, 1.2, { ...BARK, base: BARK.deep, hi: BARK.lo }, { flat: true });
    return r;
  });
}

/** Parede do subsolo, atrás das cavernas: 0–3 terra, 4–7 pedra. Escura, sem contorno. */
export function wallFrames(): Raster[] {
  const out: Raster[] = [];
  for (const tone of [DIRT, STONE]) {
    for (let v = 0; v < 4; v++) {
      const r = new Raster(T, T);
      const rand = rng(5000 + v + (tone === STONE ? 10 : 0));
      const dark = (c: Color) => mix(c, 0x1a1020, 0.55);
      r.rect(0, 0, T, T, dark(tone.lo));
      for (let i = 0; i < 4; i++) r.ellipse(rand() * T, rand() * T, 2 + rand() * 3, 1.5 + rand() * 2, { hi: dark(tone.base), base: dark(tone.base), lo: dark(tone.lo), deep: dark(tone.deep) }, { flat: true });
      for (let i = 0; i < 5; i++) r.set(rand() * T, rand() * T, dark(tone.deep));
      out.push(r);
    }
  }
  return out;
}

// ---------- enfeites da grama (ficam em cima do tile, balançando) ----------

const FLOWERS: Color[] = [0xfff3d0, 0xf7d23e, 0xe86a9a, 0xb38cf0];

/** 4 tipos × 3 frames de balanço. Âncora: base embaixo. */
export function tuftFrames(): Raster[] {
  const out: Raster[] = [];
  for (let kind = 0; kind < 4; kind++) {
    for (let f = 0; f < 3; f++) {
      const sway = [0, 0.6, -0.4][f];
      const r = new Raster(12, 9);
      const rand = rng(500 + kind * 31);
      const blades = kind === 3 ? 2 : 5;
      for (let i = 0; i < blades; i++) {
        const bx = 2 + rand() * 8;
        const h = 3 + rand() * 4;
        for (let y = 0; y < h; y++) {
          const t = y / h;
          r.set(bx + sway * t * 2 + (rand() - 0.5) * 0.3, 8 - y, t > 0.6 ? GRASS.hi : GRASS.base);
        }
      }
      if (kind === 1 || kind === 3) {
        const c = FLOWERS[(kind * 3 + 1) % FLOWERS.length];
        const fx = 5 + sway;
        r.limb(5, 8, fx, 3.5, 0.5, GRASS);
        r.set(fx, 2.5, c);
        r.set(fx - 1, 3.5, c);
        r.set(fx + 1, 3.5, c);
        r.set(fx, 4.5, c);
        r.set(fx, 3.5, 0xffe27a);
      }
      if (kind === 2) {
        // Samambaia
        r.limb(3, 8, 7 + sway, 2, 0.5, LEAF);
        for (let i = 0; i < 4; i++) r.ellipse(4.5 + i + sway * (i / 4), 7 - i * 1.4, 1.6, 0.7, LEAF);
      }
      out.push(r.outline());
    }
  }
  return out;
}

// ---------- tronco podre ----------

/** frame 0: topo quebrado; frame 1: meio do tronco. */
export function logFrames(): Raster[] {
  return [true, false].map((top) => {
    const r = new Raster(T, T);
    const rand = rng(top ? 41 : 42);
    for (let y = 0; y < T; y++) for (let x = 2; x < T - 2; x++) {
      const stripe = (x + Math.floor(Math.sin(y * 0.4 + x) * 1.2)) % 4 === 0;
      const edge = x === 2 ? BARK.hi : x >= T - 4 ? BARK.lo : stripe ? BARK.deep : BARK.base;
      r.set(x, y, rand() < 0.08 ? BARK.deep : edge);
    }
    // Rachaduras (é por isso que a onça quebra)
    let cx = 6 + rand() * 4;
    for (let y = 3; y < 13; y++) {
      cx += rand() < 0.5 ? -0.7 : 0.7;
      r.set(cx, y, 0x24140a);
    }
    if (top) {
      // Topo serrilhado com a madeira clara aparecendo
      for (let x = 2; x < T - 2; x++) {
        const cut = Math.round(1 + Math.abs(Math.sin(x * 1.7)) * 3);
        for (let y = 0; y < cut; y++) r.clear(x, y);
        r.set(x, cut, WOOD.hi);
        r.set(x, cut + 1, WOOD.base);
      }
      r.ellipse(4, 6, 2.2, 1.4, MOSS, { only: true });
      // Cogumelo
      r.ellipse(13.4, 9, 2, 1.2, ramp(0xe0763a, 0.4, 0.4));
      r.set(13, 10.5, 0xf0e0c0);
    } else {
      r.ellipse(3.5, 12, 2, 3, MOSS, { only: true });
    }
    return r.outline();
  });
}

// ---------- cipó ----------

export function vineFrames(): Raster[] {
  return cycle(4, (t) => {
    const r = new Raster(T, T);
    for (let y = 0; y < T; y++) {
      const x = 8 + Math.sin(y * 0.39 + t * TAU) * 1.6;
      r.set(x, y, LEAF.lo);
      r.set(x + 1, y, LEAF.base);
    }
    // Folhas alternando de lado (y múltiplo do tile pra emendar com o de cima)
    for (const [y, side] of [[3, -1], [8, 1], [13, -1]] as const) {
      const x = 8 + Math.sin(y * 0.39 + t * TAU) * 1.6;
      r.ellipse(x + side * 3, y, 2.4, 1.1, LEAF);
    }
    return r.outline();
  });
}

// ---------- água ----------

/** frames 0-3: superfície; 4-7: fundo. Desenhada opaca, a cena põe transparência. */
export function waterFrames(): Raster[] {
  const frames: Raster[] = [];
  for (const surface of [true, false]) {
    frames.push(...cycle(4, (t) => {
      const r = new Raster(T, T);
      // Cor chapada: o escurecer com a profundidade é feito na cena, por tile, pra não marcar emenda
      r.rect(0, 0, T, T, WATER.body);
      // Reflexos de luz (cáusticas) andando
      for (let y = 3; y < T; y += 5) {
        for (let x = 0; x < T; x++) {
          const w = Math.sin((x / T) * TAU * 2 + t * TAU + y) * 1.2;
          if (Math.sin((x / T) * TAU + t * TAU * 2 + y * 0.7) > 0.55) r.set(x, y + w, mix(WATER.body, WATER.light, 0.45));
        }
      }
      if (surface) {
        for (let x = 0; x < T; x++) {
          const crest = Math.sin((x / T) * TAU * 2 + t * TAU) > 0.3;
          r.set(x, 0, crest ? WATER.light : WATER.top);
          r.set(x, 1, crest ? WATER.top : mix(WATER.top, WATER.body, 0.5));
        }
      }
      return r;
    }));
  }
  return frames;
}

// ---------- fogo ----------

const FIRE_COLORS: Color[] = [0xfffbe0, 0xffd84a, 0xff9a2a, 0xe8452a, 0x9a2420];

export function fireFrames(): Raster[] {
  return cycle(6, (t) => {
    const r = new Raster(T, T);
    for (let x = 1; x < T - 1; x++) {
      const d = Math.abs(x - 7.5);
      const h = 12.5 - d * 1.35 + Math.sin(x * 1.3 + t * TAU) * 1.4 + Math.sin(x * 0.6 - t * TAU * 2) * 0.9;
      for (let y = 0; y < h; y++) {
        const heat = 1 - y / h + (1 - d / 8) * 0.6;
        const i = heat > 1.25 ? 0 : heat > 0.95 ? 1 : heat > 0.6 ? 2 : heat > 0.3 ? 3 : 4;
        r.set(x, T - 1 - y, FIRE_COLORS[i]);
      }
    }
    // Brasas soltas subindo
    const rand = rng(Math.floor(t * 6) + 9);
    for (let i = 0; i < 2; i++) r.set(3 + rand() * 10, 1 + ((rand() * 4 + t * 8) % 4), FIRE_COLORS[1]);
    return r;
  });
}

// ---------- armadilha ----------

/** frame 0: armada (laço no chão); frame 1: disparada. */
export function trapFrames(): Raster[] {
  return [false, true].map((sprung) => {
    const r = new Raster(T, T);
    // Estaca
    r.limb(13, 15, 13.5, 6, 0.9, BARK);
    if (!sprung) {
      for (let a = 0; a < 40; a++) {
        const ang = (a / 40) * TAU;
        r.set(7 + Math.cos(ang) * 5.5, 14 + Math.sin(ang) * 1.3, ROPE.base);
      }
      r.limb(12.5, 14, 13, 8, 0.4, ROPE);
      // Folhas disfarçando o laço
      r.ellipse(4, 14.5, 1.6, 0.7, LEAF);
      r.ellipse(9.5, 15, 1.4, 0.6, ramp(0x8a6a2a));
    } else {
      r.limb(6, 15, 13, 7, 0.45, ROPE);
      r.ellipse(6, 14.5, 1.4, 1.1, ROPE);
    }
    return r.outline();
  });
}

// ---------- semente ----------

export function seedFrames(): Raster[] {
  return cycle(8, (t) => {
    const r = new Raster(10, 12);
    r.ellipse(5, 7.5, 3, 3.6, SEED);
    r.limb(5, 4, 6.5, 1.8, 0.4, LEAF);
    r.ellipse(7.3, 2, 1.5, 0.8, LEAF);
    r.outline();
    // Brilho que passa de tempos em tempos
    const k = Math.floor(t * 8);
    if (k < 3) {
      const sx = 3 + k;
      r.set(sx, 6 - k * 0.5, 0xfffbe8);
      if (k === 1) {
        r.set(sx - 1, 6 - k * 0.5, 0xffe9a0);
        r.set(sx, 5 - k * 0.5, 0xffe9a0);
      }
    }
    return r;
  });
}

// ---------- muda / ipê ----------

/** 16×32. frames 0-1 muda balançando, 2-7 crescendo, 8-9 ipê florido balançando. */
export function saplingFrames(): Raster[] {
  const W = 16;
  const H = 32;
  const out: Raster[] = [];
  const sprout = (sway: number) => {
    const r = new Raster(W, H);
    r.limb(8, 31, 8 + sway, 26, 0.5, GRASS);
    r.ellipse(6 + sway, 26, 2, 1, LEAF);
    r.ellipse(10.5 + sway, 25, 2, 1, LEAF);
    return r.outline();
  };
  const tree = (g: number, sway: number) => {
    const r = new Raster(W, H);
    const top = 31 - 22 * g;
    r.limb(8, 31, 8 + sway * g, top + 4, 0.6 + g * 0.8, BARK);
    if (g > 0.35) r.limb(8 + sway * g, 22, 4 + sway, 15, 0.5, BARK);
    const cr = g * 7.5;
    if (cr > 1) {
      const rand = rng(77);
      const blobs: [number, number, number][] = [[0, 0, 1], [-4, 2, 0.7], [4, 1.5, 0.75], [-2, -3, 0.65], [3, -3, 0.6]];
      for (const [dx, dy, s] of blobs) r.ellipse(8 + dx * g + sway, top + dy * g, cr * s, cr * s * 0.85, IPE, { grain: 0.25 });
      // Flores mais claras espalhadas
      for (let i = 0; i < 10 * g; i++) r.paint(8 + (rand() - 0.5) * cr * 2 + sway, top + (rand() - 0.5) * cr * 1.6, 0xfff3a0);
    } else {
      r.ellipse(8, top, 2, 1, LEAF);
    }
    return r.outline();
  };
  out.push(sprout(0), sprout(0.7));
  for (let i = 1; i <= 6; i++) out.push(tree(i / 6, 0));
  out.push(tree(1, 0.4), tree(1, -0.3));
  return out;
}

// ---------- coração da HUD ----------

const HEART_SHAPE = [
  '.XX...XX.',
  'XXXX.XXXX',
  'XXXXXXXXX',
  'XXXXXXXXX',
  '.XXXXXXX.',
  '..XXXXX..',
  '...XXX...',
  '....X....',
];

/** frame 0: cheio; 1: vazio. */
export function heartFrames(): Raster[] {
  return [true, false].map((full) => {
    const r = new Raster(11, 10);
    const tone = ramp(full ? 0xe03a3a : 0x4a3038, 0.45, 0.4);
    HEART_SHAPE.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch !== 'X') return;
      const lit = (x < 4 && y < 3) ? tone.hi : y > 4 ? tone.lo : tone.base;
      r.set(x + 1, y + 1, lit);
    }));
    if (full) r.set(3, 2, 0xffffff);
    return r.outline();
  });
}

// ---------- partículas ----------

export function particleFrames(): Record<string, Raster> {
  const leaf = new Raster(4, 3);
  leaf.ellipse(2, 1.5, 2, 1.2, LEAF);
  const petal = new Raster(3, 3);
  petal.ellipse(1.5, 1.5, 1.3, 1.1, IPE);
  const dust = new Raster(3, 3);
  dust.ellipse(1.5, 1.5, 1.4, 1.4, ramp(0xe8dcc0), { flat: true });
  const ember = new Raster(1, 1);
  ember.set(0, 0, 0xffb040);
  const mote = new Raster(1, 1);
  mote.set(0, 0, 0xfff6c8);
  const splash = new Raster(2, 2);
  splash.rect(0, 0, 2, 2, WATER.light);
  const sparkle = new Raster(5, 5);
  for (const [x, y] of [[2, 0], [2, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [2, 3], [2, 4]]) sparkle.set(x, y, x === 2 && y === 2 ? 0xffffff : 0xfff0a0);
  return { leaf, petal, dust, ember, mote, splash, sparkle };
}
