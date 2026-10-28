import { hash2, rng } from '../art/rng';

/**
 * Gerador do mundo: a partir de uma semente, monta um mapa grande no formato do levelParser
 * (um caractere por tile), com as camadas do jogo — copas, superfície, lagos, cavernas — e
 * trechos fixos desenhados à mão carimbados no meio (começo, queimadas, acampamento, gruta).
 *
 * Puro (sem Phaser): mesma semente, mesmo mundo. Cada missão vai poder pedir o seu.
 */

export interface WorldOptions {
  seed: number;
  /** Em tiles */
  width?: number;
  height?: number;
  /** Lagos na superfície (até 3) */
  lakes?: number;
  /** Queimadas na margem dos primeiros lagos (até `lakes`) */
  queimadas?: number;
  /** Acampamento de caçadores no subsolo (0 ou 1) */
  acampamento?: boolean;
  /** Gruta com poça e foco de fogo (0 ou 1) */
  gruta?: boolean;
  /** Rio largo com correnteza pro oeste: só a lontra atravessa nadando contra (0 ou 1) */
  rio?: boolean;
  /** Frente de fogo que avança pela superfície depois do rio, até o lago seguinte (0 ou 1) */
  frente?: boolean;
  /** Máquinas de desmatamento patrulhando a superfície (até 4) */
  maquinas?: number;
}

/** Retângulo de água com correnteza, em tiles (inclusive). `dir` -1 = pro oeste. */
export interface Corrente { x0: number; x1: number; y0: number; y1: number; dir: 1 | -1 }

/** Frente de fogo: nasce em `start` quando o bicho passa de `trigger` e anda até `stop` (colunas). */
export interface Frente { start: number; trigger: number; stop: number }

export interface World {
  seed: number;
  width: number;
  height: number;
  rows: string[];
  /** Linha do primeiro tile de chão de cada coluna (sem contar árvore) */
  surface: number[];
  /** Fogos + armadilhas + máquinas: o time vence quando sumirem todos */
  metas: number;
  correntes: Corrente[];
  frentes: Frente[];
}

// ---------- trechos fixos ----------
// ' ' mantém o que o gerador pôs; os outros caracteres sobrescrevem.

/** Começo: o time nasce aqui, com um checkpoint e umas sementes pra ensinar o caminho. */
export const INICIO = ['   P       *     *        C  *  '];

/** Margem de lago com 3 focos de fogo a até 6 tiles da água (a lontra fica molhada 2 s). */
export const QUEIMADA = [' F F *F  '];

/** Sala de caçadores no subsolo: 3 armadilhas. O poço de entrada desce nas colunas 3–5. */
export const ACAMPAMENTO = [
  'SSS...SSSSSSSSSSSSSSSSS',
  'S..V..................S',
  'S..V..........*.......S',
  'S..V..................S',
  'S..V.C.T.......T.....TS',
  'SSSSSSSSSSSSSSSSSSSSSSS',
];
const ACAMPAMENTO_POCO = 3;

/** Gruta com poça (a lontra se molha) e 2 focos de fogo. Poço de entrada nas colunas 19–21. */
export const GRUTA = [
  'SSSSSSSSSSSSSSSSSSS...SS',
  'S..................V...S',
  'S..................V...S',
  'S........*.........V...S',
  'S~~~~~~~~...F..F...V...S',
  'S~~~~o~~~SSSSSSSSSSSSSSS',
  'SSSSSSSSSSSSSSSSSSSSSSSS',
];
const GRUTA_POCO = 19;

// ---------- ruído ----------

const U32 = 4294967296;
const smooth = (t: number) => t * t * (3 - 2 * t);

function noise1(seed: number, x: number): number {
  const i = Math.floor(x);
  const a = hash2(i, seed) / U32;
  const b = hash2(i + 1, seed) / U32;
  return a + (b - a) * smooth(x - i);
}

function noise2(seed: number, x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const h = (a: number, b: number) => hash2(a + Math.imul(seed, 7919), b + seed) / U32;
  const top = h(ix, iy) + (h(ix + 1, iy) - h(ix, iy)) * fx;
  const bottom = h(ix, iy + 1) + (h(ix + 1, iy + 1) - h(ix, iy + 1)) * fx;
  return top + (bottom - top) * fy;
}

// ---------- grade ----------

class Grid {
  readonly c: string[][];

  constructor(readonly w: number, readonly h: number) {
    this.c = Array.from({ length: h }, () => Array<string>(w).fill('.'));
  }

  get(x: number, y: number): string {
    if (x < 0 || x >= this.w || y >= this.h) return 'S';
    if (y < 0) return '.';
    return this.c[y][x];
  }

  set(x: number, y: number, ch: string): void {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.c[y][x] = ch;
  }

  stamp(x0: number, y0: number, rows: readonly string[]): void {
    rows.forEach((row, dy) => [...row].forEach((ch, dx) => {
      if (ch !== ' ') this.set(x0 + dx, y0 + dy, ch);
    }));
  }

  count(chars: string): number {
    let n = 0;
    for (const row of this.c) for (const ch of row) if (chars.includes(ch)) n++;
    return n;
  }
}

interface Lake { cx: number; half: number; depth: number; y: number; flat?: boolean }

// ---------- geração ----------

export function generateWorld(opts: WorldOptions): World {
  const seed = opts.seed >>> 0;
  const W = opts.width ?? 560;
  const H = opts.height ?? 190;
  const rand = rng(seed);
  const g = new Grid(W, H);
  const base = Math.round(H * 0.32);

  // 1. Superfície: morros largos com ondulação miúda por cima
  const surface = Array.from({ length: W }, (_, x) =>
    Math.round(base + (noise1(seed, x / 46) - 0.5) * 26 + (noise1(seed + 7, x / 12) - 0.5) * 6));
  // Trechos planos ficam travados: o alisamento abaixo mexe só em volta deles
  const locked = new Set<number>();
  const flatten = (x0: number, x1: number, y: number) => {
    for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) {
      surface[x] = y;
      locked.add(x);
    }
  };
  flatten(0, 46, surface[24]);

  // Lagos em lugares fixos do mapa, com a margem da direita plana (é lá que fica a queimada)
  const lakes: Lake[] = [];
  const lakeCount = Math.min(3, opts.lakes ?? 3);
  [0.27, 0.59, 0.93].slice(0, lakeCount).forEach((f) => {
    const half = 7 + Math.floor(rand() * 5);
    const cx = Math.max(60, Math.min(W - half - 14, Math.round(f * W + (rand() - 0.5) * 20)));
    flatten(cx - half - 2, cx + half + 12, surface[cx]);
    lakes.push({ cx, half, depth: 4 + Math.floor(rand() * 3), y: surface[cx] });
  });
  // Rio: largo demais pro pulo de qualquer bicho, fundo chato, entre o primeiro lago e o acampamento
  const rivers: Lake[] = [];
  if (opts.rio ?? true) {
    const half = 13;
    const cx = Math.round(W * 0.385);
    flatten(cx - half - 4, cx + half + 4, surface[cx]);
    rivers.push({ cx, half, depth: 4, y: surface[cx], flat: true });
  }
  const waters = [...lakes, ...rivers];

  // Degrau de no máximo 1 tile entre colunas: todo bicho sobe pulando (a onça pula só ~2 tiles)
  for (let pass = 0; pass < 2; pass++) {
    for (let x = 1; x < W; x++) if (!locked.has(x)) surface[x] = Math.max(surface[x - 1] - 1, Math.min(surface[x - 1] + 1, surface[x]));
    for (let x = W - 2; x >= 0; x--) if (!locked.has(x)) surface[x] = Math.max(surface[x + 1] - 1, Math.min(surface[x + 1] + 1, surface[x]));
  }

  // Colunas que árvore e poço genérico não podem ocupar
  const reserved = new Set<number>();
  const reserve = (x0: number, x1: number) => { for (let x = x0; x <= x1; x++) reserved.add(x); };
  reserve(0, 48);
  for (const l of lakes) reserve(l.cx - l.half - 4, l.cx + l.half + 12);
  for (const r of rivers) reserve(r.cx - r.half - 5, r.cx + r.half + 5);

  // Trechos de subsolo: posição escolhida já, pra reservar a coluna do poço
  const camp = opts.acampamento ?? true ? { x: Math.round(W * 0.45), y: 0 } : null;
  const grotto = opts.gruta ?? true ? { x: Math.round(W * 0.8), y: 0 } : null;
  if (camp) reserve(camp.x + ACAMPAMENTO_POCO - 3, camp.x + ACAMPAMENTO_POCO + 5);
  if (grotto) reserve(grotto.x + GRUTA_POCO - 3, grotto.x + GRUTA_POCO + 5);

  // 2. Terra por cima, pedra embaixo, com bolsões de terra na pedra
  for (let x = 0; x < W; x++) {
    const dirt = 10 + Math.round(noise1(seed + 3, x / 20) * 8);
    for (let y = surface[x]; y < H; y++) {
      const deep = y >= surface[x] + dirt;
      g.set(x, y, !deep || noise2(seed + 5, x / 9, y / 9) > 0.7 ? '#' : 'S');
    }
  }
  for (let x = 0; x < W; x++) for (let y = H - 2; y < H; y++) g.set(x, y, 'S');

  // 3. Cavernas: túneis (faixa estreita do ruído) e salões (picos), mais abertas no fundo
  const nearLake = (x: number) => waters.some((l) => Math.abs(x - l.cx) <= l.half + 2);
  for (let x = 1; x < W - 1; x++) {
    const top = surface[x] + (nearLake(x) ? 16 : 12);
    for (let y = top + 1; y < H - 2; y++) {
      const deep = (y - top) / (H - top);
      const n = noise2(seed + 11, x / 24, y / 12);
      const m = noise2(seed + 13, x / 15, y / 15);
      if (Math.abs(n - 0.5) < 0.035 + deep * 0.03 || m > 0.76 - deep * 0.04) g.set(x, y, '.');
    }
  }

  // 4. Bacia dos lagos e leito do rio, cheios até a borda
  for (const l of waters) {
    for (let dx = -l.half; dx <= l.half; dx++) {
      const edge = l.half - Math.abs(dx);
      const d = l.flat ? Math.min(l.depth, edge + 2) : Math.max(1, Math.round(l.depth * (1 - (dx / (l.half + 1)) ** 2)));
      for (let y = l.y; y < l.y + d; y++) g.set(l.cx + dx, y, '~');
    }
  }

  // Galhos altos sobre o rio: só o pulo duplo do mico alcança (a lontra nada, a onça cava por baixo)
  for (const r of rivers) {
    for (let x = r.cx - r.half + 1; x < r.cx + r.half; x += 5) {
      g.set(x, r.y - 5, '=');
      g.set(x + 1, r.y - 5, '=');
    }
  }

  // 5. Poços da superfície até as cavernas, com cipó na parede pro mico subir
  const shaft = (x: number, from: number, to: number) => {
    for (let y = from; y <= to; y++) {
      for (let dx = 0; dx < 3; dx++) g.set(x + dx, y, '.');
      g.set(x, y, 'V');
    }
  };
  [0.12, 0.38, 0.7].forEach((f) => {
    let x = Math.round(f * W);
    while (reserved.has(x) && x < W - 6) x += 5;
    if (x >= W - 6) return;
    shaft(x, surface[x], surface[x] + 28 + Math.floor(rand() * 26));
    reserve(x - 2, x + 4);
  });

  // 6. Poças nas cavernas: até 3 tiles de água em cima do chão da caverna (fora dos poços)
  for (let x = 1; x < W - 1; x++) {
    if (reserved.has(x)) continue;
    for (let y = surface[x] + 20; y < H - 2; y++) {
      if (g.get(x, y) !== '.' || !'#S'.includes(g.get(x, y + 1)) || noise2(seed + 17, x / 30, y / 22) < 0.66) continue;
      for (let k = 0; k < 3 && g.get(x, y - k) === '.'; k++) g.set(x, y - k, '~');
    }
  }
  settleWater(g);

  // 7. Árvores: tronco de fundo, copa na "linha das copas" (que vira caminho pro mico), galho e cipó
  const canopyY = (x: number) => base - 18 + Math.round((noise1(seed + 19, x / 60) - 0.5) * 10);
  const trees: { x: number; top: number }[] = [];
  for (let x = 50; x < W - 8; x += 7 + Math.floor(rand() * 7)) {
    if (reserved.has(x)) continue;
    const s = surface[x];
    if (g.get(x, s) !== '#' || g.get(x, s - 1) !== '.') continue;
    const top = Math.min(canopyY(x), s - 8);
    for (let y = s - 1; y > top; y--) g.set(x, y, '|');
    const half = 3 + Math.floor(rand() * 3);
    for (let dx = -half; dx <= half; dx++) if ('.|'.includes(g.get(x + dx, top))) g.set(x + dx, top, '%');
    for (let dx = 1 - half; dx < half; dx++) if (g.get(x + dx, top - 1) === '.') g.set(x + dx, top - 1, '%');
    const side = rand() < 0.5 ? -1 : 1;
    const by = top + Math.max(3, Math.round((s - top) * 0.55));
    const len = 2 + Math.floor(rand() * 3);
    for (let k = 1; k <= len; k++) if (g.get(x + side * k, by) === '.') g.set(x + side * k, by, '=');
    if (rand() < 0.55) {
      const vx = x - side * half;
      for (let y = top + 1; y < top + 12 && g.get(vx, y) === '.'; y++) g.set(vx, y, 'V');
    }
    trees.push({ x, top });
  }

  // 8. Trechos fixos
  g.stamp(6, surface[6] - 1, INICIO);
  lakes.slice(0, Math.min(lakes.length, opts.queimadas ?? 2)).forEach((l) => g.stamp(l.cx + l.half + 1, l.y - 1, QUEIMADA));
  const room = (spot: { x: number; y: number } | null, rows: readonly string[], pocoCol: number, depth: number) => {
    if (!spot) return;
    const px = spot.x + pocoCol;
    spot.y = Math.max(surface[px], surface[px + 2]) + depth;
    g.stamp(spot.x, spot.y, rows);
    // Poço do chão até o teto da sala, com o cipó emendando no da sala
    shaft(px, Math.min(surface[px], surface[px + 2]), spot.y);
  };
  room(camp, ACAMPAMENTO, ACAMPAMENTO_POCO, 26);
  room(grotto, GRUTA, GRUTA_POCO, 30);
  settleWater(g);

  // Paredes nas pontas, do chão pra baixo
  for (const x of [0, W - 1]) for (let y = surface[x]; y < H; y++) g.set(x, y, 'S');

  // Máquinas: em trechos de chão livre da metade leste, longe de água e poço
  const maquinas: number[] = [];
  for (const f of [0.52, 0.68, 0.76, 0.88].slice(0, Math.min(4, opts.maquinas ?? 2))) {
    for (let d = 0; d <= 16; d++) {
      const x = Math.round(f * W) + (d % 2 ? -1 : 1) * Math.ceil(d / 2);
      if (reserved.has(x) || g.get(x, surface[x]) !== '#' || !'.|'.includes(g.get(x, surface[x] - 1))) continue;
      g.set(x, surface[x] - 1, 'M');
      maquinas.push(x);
      reserve(x - 3, x + 3);
      break;
    }
  }

  // Correnteza do rio e frente de fogo depois dele (até a margem do lago seguinte)
  const correntes: Corrente[] = rivers.map((r) => ({ x0: r.cx - r.half, x1: r.cx + r.half, y0: r.y, y1: r.y + r.depth - 1, dir: -1 }));
  const frentes: Frente[] = [];
  if (opts.frente ?? true) {
    const start = rivers.length ? rivers[0].cx + rivers[0].half + 6 : Math.round(W * 0.42);
    const next = lakes.find((l) => l.cx - l.half > start + 30);
    const stop = next ? next.cx - next.half - 1 : Math.min(W - 10, start + 90);
    if (stop > start + 20) frentes.push({ start, trigger: start + 16, stop });
  }

  // 9. Checkpoints a cada ~100 tiles, numa coluna de chão livre
  for (let cx = 100; cx < W - 20; cx += 100) {
    for (let d = 0; d <= 12; d++) {
      const x = cx + (d % 2 ? -1 : 1) * Math.ceil(d / 2);
      if (reserved.has(x) || g.get(x, surface[x]) !== '#' || !'.|'.includes(g.get(x, surface[x] - 1))) continue;
      g.set(x, surface[x] - 1, 'C');
      break;
    }
  }

  // 10. Sementes: superfície, copas, cavernas e no fundo dos lagos
  for (let x = 50; x < W - 4; x++) {
    if (rand() < 0.07 && g.get(x, surface[x] - 1) === '.' && g.get(x, surface[x]) === '#') g.set(x, surface[x] - 1 - Math.floor(rand() * 2), '*');
  }
  for (const t of trees) if (rand() < 0.45 && g.get(t.x, t.top - 2) === '.') g.set(t.x, t.top - 2, '*');
  for (let tries = 0, placed = 0; tries < 4000 && placed < 22; tries++) {
    const x = 2 + Math.floor(rand() * (W - 4));
    const y = surface[x] + 14 + Math.floor(rand() * (H - surface[x] - 17));
    if (g.get(x, y) === '.' && g.get(x, y - 1) === '.' && '#S'.includes(g.get(x, y + 1))) {
      g.set(x, y, '*');
      placed++;
    }
  }
  for (const l of lakes) if (g.get(l.cx, l.y + l.depth - 1) === '~') g.set(l.cx, l.y + l.depth - 1, 'o');

  return { seed, width: W, height: H, rows: g.c.map((r) => r.join('')), surface, metas: g.count('FTM'), correntes, frentes };
}

/** Água desce até apoiar em algo: não sobra água boiando em cima de ar. */
function settleWater(g: Grid): void {
  for (let pass = 0; pass < g.h; pass++) {
    let moved = false;
    for (let y = g.h - 2; y >= 0; y--) {
      for (let x = 0; x < g.w; x++) {
        if (g.c[y][x] === '~' && g.c[y + 1][x] === '.') {
          g.c[y + 1][x] = '~';
          g.c[y][x] = '.';
          moved = true;
        }
      }
    }
    if (!moved) return;
  }
}
