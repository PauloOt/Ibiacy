import { describe, expect, it } from 'vitest';
import { bushLayer, BG_W, canopyLayer } from './background';
import { heroArts } from './heroes';
import { Raster } from './raster';
import { GROUND_VARIANTS, groundFrame, groundFrames, saplingFrames, tuftFrames, waterFrames } from './world';
import { ramp } from './color';

describe('Raster', () => {
  it('elipse pinta dentro e contorno fica só por fora', () => {
    const r = new Raster(9, 9);
    r.ellipse(4.5, 4.5, 2, 2, ramp(0x808080));
    const filled = r.opaqueCount();
    expect(filled).toBeGreaterThan(8);
    r.outline();
    expect(r.opaqueCount()).toBeGreaterThan(filled);
    expect(r.get(0, 0)).toBeNull();
  });

  it('clear apaga e paint só pinta onde já tem cor', () => {
    const r = new Raster(3, 1);
    r.set(0, 0, 0x111111);
    r.paint(0, 0, 0x222222);
    r.paint(1, 0, 0x222222);
    expect(r.get(0, 0)).toBe(0x222222);
    expect(r.get(1, 0)).toBeNull();
    r.clear(0, 0);
    expect(r.get(0, 0)).toBeNull();
  });
});

describe('heróis', () => {
  for (const art of heroArts()) {
    it(`${art.key}: todo frame tem o tamanho do sheet e algum desenho`, () => {
      for (const a of art.anims) {
        expect(a.frames.length).toBeGreaterThan(0);
        for (const f of a.frames) {
          expect([f.w, f.h]).toEqual([art.frameW, art.frameH]);
          expect(f.opaqueCount()).toBeGreaterThan(30);
        }
      }
    });

    it(`${art.key}: tem as animações que o Hero pede`, () => {
      const names = art.anims.map((a) => a.name);
      expect(names).toEqual(expect.arrayContaining(['idle', 'run', 'jump', 'fall']));
    });
  }
});

describe('mundo', () => {
  it('um frame de chão pra cada combinação de lados e variação', () => {
    const frames = groundFrames();
    expect(frames).toHaveLength(16 * GROUND_VARIANTS);
    const all = { top: true, bottom: true, left: true, right: true };
    expect(groundFrame(all, GROUND_VARIANTS * 10 + 1)).toBe(15 * GROUND_VARIANTS + 1);
    expect(groundFrame({ top: false, bottom: false, left: false, right: false }, 0)).toBe(0);
  });

  it('sheets com o número de frames que as animações usam', () => {
    expect(tuftFrames()).toHaveLength(12);
    expect(waterFrames()).toHaveLength(8);
    expect(saplingFrames()).toHaveLength(10);
  });

  it('camadas do fundo emendam: primeira e última coluna parecidas', () => {
    for (const layer of [canopyLayer(), bushLayer()]) {
      let same = 0;
      for (let y = 0; y < layer.h; y++) if ((layer.get(0, y) === null) === (layer.get(BG_W - 1, y) === null)) same++;
      expect(same / layer.h).toBeGreaterThan(0.9);
    }
  });
});
