// Fichas do guia visual e do guia de movimento (docs/guia-visual.md, docs/guia-movimento.md).

/** Madeira do lugar: toda placa e painel sai daqui. */
export const WOOD = {
  dark: 0x3b2414,
  body: 0x8a5a32,
  light: 0xc98e4a,
  shade: 0x5e3a1e,
  drop: 0x2a180c,
  cream: 0xfbe7c0,
  ipe: 0xf2c230,
  ipeLight: 0xffe27a,
} as const;

export const css = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

export const FONT_TITLE = '"Jersey 10", monospace';
export const FONT_TEXT = '"Pixelify Sans", monospace';

/** Tempos, em ms. */
export const D = {
  ja: 0,
  curto: 200,
  base: 600,
  longo: 1000,
  reduzido: 150,
} as const;

/** Quantas folhas e pétalas. */
export const N = {
  poucas: 6,
  chuva: 14,
  ar: 8,
} as const;

/** Movimento reduzido: por enquanto segue o sistema (o jogo ainda não tem a opção no menu). */
export function reducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** O oco aceso pelos fungos: fichas do hub e das telas do jogo (docs/guia-visual.md). */
export const OCO = {
  noite: 0x120a08,
  casca: 0x2a1810,
  sulco: 0x26150e,
  veio: 0x6a4428,
  seiva: 0xf3e2c8,
  cinza: 0xb89878,
  ambar: 0xffa040,
  ambarClaro: 0xffd070,
} as const;

export const FONT_HUB = '"Jacquard 12", serif';

/** Viagem de câmera mais longa (descer pelo tronco na entrada do hub). */
export const D_CAMERA = 1600;
