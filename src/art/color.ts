/** Cores como número 0xRRGGBB. Sem Phaser, pra testar no Node. */

export type Color = number;

const r = (c: Color) => (c >> 16) & 0xff;
const g = (c: Color) => (c >> 8) & 0xff;
const b = (c: Color) => c & 0xff;
const rgb = (rr: number, gg: number, bb: number): Color =>
  (Math.round(rr) << 16) | (Math.round(gg) << 8) | Math.round(bb);

export function mix(a: Color, c: Color, t: number): Color {
  return rgb(r(a) + (r(c) - r(a)) * t, g(a) + (g(c) - g(a)) * t, b(a) + (b(c) - b(a)) * t);
}

// Luz quente e sombra fria: o brilho puxa pro amarelo e a sombra pro roxo, em vez de só clarear/escurecer
const WARM_LIGHT = 0xfff1b8;
const COOL_SHADOW = 0x2a1838;
export const OUTLINE = 0x1a0f14;

export interface Ramp {
  hi: Color;
  base: Color;
  lo: Color;
  deep: Color;
}

export function ramp(base: Color, light = 0.42, shadow = 0.45): Ramp {
  return {
    hi: mix(base, WARM_LIGHT, light),
    base,
    lo: mix(base, COOL_SHADOW, shadow),
    deep: mix(base, COOL_SHADOW, Math.min(0.85, shadow * 1.6)),
  };
}

/** Contorno: a cor vizinha bem escurecida, não um preto chapado. */
export function outlineOf(neighbor: Color): Color {
  return mix(neighbor, OUTLINE, 0.78);
}

export function toCss(c: Color): string {
  return `#${c.toString(16).padStart(6, '0')}`;
}
