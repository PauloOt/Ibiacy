import { outlineOf, type Color, type Ramp } from './color';
import { hash2 } from './rng';

/** Luz vindo de cima e um pouco da esquerda (vetor apontando pra luz). */
const LIGHT_X = -0.45;
const LIGHT_Y = -0.89;

/**
 * Tela de pixel art em memória: só cores e transparência, sem DOM.
 * Os desenhos usam formas com volume (elipses sombreadas pela luz) e um passe de contorno no fim.
 */
export class Raster {
  private readonly px: Int32Array;

  constructor(readonly w: number, readonly h: number) {
    this.px = new Int32Array(w * h).fill(-1);
  }

  get(x: number, y: number): Color | null {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    const c = this.px[y * this.w + x];
    return c < 0 ? null : c;
  }

  set(x: number, y: number, c: Color): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.px[y * this.w + x] = c;
  }

  clear(x: number, y: number): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.px[y * this.w + x] = -1;
  }

  /** Pinta só onde já tem cor (manchas da onça, barriga, musgo). */
  paint(x: number, y: number, c: Color): void {
    if (this.get(Math.floor(x), Math.floor(y)) !== null) this.set(x, y, c);
  }

  rect(x: number, y: number, w: number, h: number, c: Color): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, c);
  }

  /**
   * Elipse com volume: o lado virado pra luz ganha o tom claro, o oposto o escuro,
   * e a borda de baixo o mais escuro. Na fronteira entre tons entra um xadrez (dither).
   */
  ellipse(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    tone: Ramp,
    opts: { flat?: boolean; only?: boolean; grain?: number } = {},
  ): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        const d2 = dx * dx + dy * dy;
        if (d2 > 1) continue;
        if (opts.only && this.get(x, y) === null) continue;
        this.set(x, y, opts.flat ? tone.base : shadeAt(dx, dy, d2, x, y, tone, opts.grain ?? 0));
      }
    }
  }

  /** Membro: uma linha grossa de bolinhas, com sombreado simples. */
  limb(x0: number, y0: number, x1: number, y1: number, radius: number, tone: Ramp): void {
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.ellipse(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, radius, radius, tone);
    }
  }

  /** Curva por pontos (cauda), afinando do começo pro fim. */
  tail(points: readonly [number, number][], r0: number, r1: number, tone: Ramp, tip?: Ramp): void {
    const n = points.length - 1;
    for (let i = 0; i < n; i++) {
      const [ax, ay] = points[i];
      const [bx, by] = points[i + 1];
      const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) * 2));
      for (let s = 0; s <= steps; s++) {
        const t = (i + s / steps) / n;
        const rad = r0 + (r1 - r0) * t;
        const tn = tip && t > 0.8 ? tip : tone;
        this.ellipse(ax + (bx - ax) * (s / steps), ay + (by - ay) * (s / steps), rad, rad, tn);
      }
    }
  }

  /** Contorno de 1 px por fora, com a cor do vizinho escurecida. */
  outline(): this {
    const add: [number, number, Color][] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y) !== null) continue;
        const n = this.get(x, y - 1) ?? this.get(x, y + 1) ?? this.get(x - 1, y) ?? this.get(x + 1, y);
        if (n !== null) add.push([x, y, outlineOf(n)]);
      }
    }
    for (const [x, y, c] of add) this.set(x, y, c);
    return this;
  }

  /** Copia outro raster por cima (transparente não apaga). */
  draw(src: Raster, ox: number, oy: number): void {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const c = src.get(x, y);
      if (c !== null) this.set(ox + x, oy + y, c);
    }
  }

  flipX(): Raster {
    const out = new Raster(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const c = this.get(x, y);
      if (c !== null) out.set(this.w - 1 - x, y, c);
    }
    return out;
  }

  opaqueCount(): number {
    let n = 0;
    for (const c of this.px) if (c >= 0) n++;
    return n;
  }
}

const TONES = ['deep', 'lo', 'base', 'hi'] as const;

/**
 * Tom de um pixel da elipse. A luz decide o tom e a fronteira entre tons vira xadrez.
 * grain (0..1) sorteia alguns pixels um tom acima ou abaixo: textura de pelo/casca.
 */
function shadeAt(dx: number, dy: number, d2: number, x: number, y: number, tone: Ramp, grain: number): Color {
  const lit = dx * LIGHT_X + dy * LIGHT_Y;
  const checker = (x + y) % 2 === 0;
  let i: number;
  if (d2 > 0.62 && dy > 0.5) i = 0;
  else if (lit > 0.35 || (lit > 0.22 && checker)) i = 3;
  else if (lit < -0.3 || (lit < -0.18 && checker)) i = 1;
  else i = 2;
  if (grain > 0) {
    const h = hash2(x * 7 + 3, y * 13 + 5) / 4294967296;
    if (h < grain / 2) i = Math.max(0, i - 1);
    else if (h > 1 - grain / 2) i = Math.min(3, i + 1);
  }
  return tone[TONES[i]];
}
