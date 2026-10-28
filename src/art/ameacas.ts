import { ramp } from './color';
import { Raster } from './raster';

// Ameaças que andam: a máquina de desmatamento.

const BODY = ramp(0xe8b030, 0.4, 0.45);
const RUST = 0x8a4a20;
const TREAD = ramp(0x4a4a52, 0.3, 0.4);
const STEEL = ramp(0xc0c8d0, 0.45, 0.4);
const GLASS = ramp(0x3a5a7a, 0.5, 0.3);

/**
 * Máquina de desmatamento, 40×28, virada pra esquerda (a serra na frente).
 * Frames 0–3: andando (esteira e serra girando); 4: desligada (serra parada, sem dente).
 */
export function maquinaFrames(): Raster[] {
  const frame = (t: number, off: boolean) => {
    const r = new Raster(40, 28);
    // Esteira com rodas e dentes andando
    r.rect(6, 20, 30, 7, TREAD.base);
    r.rect(6, 20, 30, 1, TREAD.hi);
    for (let x = 6 + (t % 3); x < 36; x += 3) r.set(x, 26, TREAD.deep);
    for (const wx of [10, 21, 32]) r.ellipse(wx, 23.5, 2.6, 2.6, STEEL);
    // Corpo amarelo com faixa e ferrugem
    r.rect(8, 9, 26, 11, BODY.base);
    r.rect(8, 9, 26, 2, BODY.hi);
    r.rect(8, 17, 26, 3, BODY.lo);
    for (const [x, y] of [[12, 13], [13, 14], [27, 12], [30, 15], [31, 15]]) r.set(x, y, RUST);
    // Cabine com vidro e escapamento
    r.rect(22, 2, 12, 8, BODY.base);
    r.rect(24, 3, 8, 4, GLASS.base);
    r.set(25, 3, GLASS.hi);
    r.rect(14, 1, 3, 8, TREAD.lo);
    // Braço e serra circular
    r.rect(3, 13, 6, 2, TREAD.lo);
    r.ellipse(4, 14, 4.6, 4.6, STEEL);
    r.set(4, 14, TREAD.deep);
    if (!off) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + t * (Math.PI / 8);
        r.set(4 + Math.cos(a) * 5.5, 14 + Math.sin(a) * 5.5, STEEL.hi);
      }
    }
    return r.outline();
  };
  return [0, 1, 2, 3].map((t) => frame(t, false)).concat(frame(0, true));
}
