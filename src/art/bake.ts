import type Phaser from 'phaser';
import { ART_SCALE } from '../config';
import type { HeroArt } from './heroes/types';
import type { Raster } from './raster';

/** Frames lado a lado num canvas, cada pixel de arte virando scale×scale (sem suavizar). */
export function rasterStrip(frames: readonly Raster[], scale = ART_SCALE): HTMLCanvasElement {
  const w = frames[0].w;
  const h = frames[0].h;
  const small = document.createElement('canvas');
  small.width = w * frames.length;
  small.height = h;
  const img = small.getContext('2d')!.createImageData(small.width, h);
  frames.forEach((f, i) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = f.get(x, y);
      if (c === null) continue;
      const o = (y * small.width + i * w + x) * 4;
      img.data[o] = (c >> 16) & 0xff;
      img.data[o + 1] = (c >> 8) & 0xff;
      img.data[o + 2] = c & 0xff;
      img.data[o + 3] = 255;
    }
  });
  small.getContext('2d')!.putImageData(img, 0, 0);
  if (scale === 1) return small;

  const big = document.createElement('canvas');
  big.width = small.width * scale;
  big.height = h * scale;
  const ctx = big.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, big.width, big.height);
  return big;
}

/** Vira textura com frames numerados 0..n-1. */
export function addSheet(scene: Phaser.Scene, key: string, frames: readonly Raster[], scale = ART_SCALE): void {
  const tex = scene.textures.addCanvas(key, rasterStrip(frames, scale))!;
  const fw = frames[0].w * scale;
  const fh = frames[0].h * scale;
  frames.forEach((_, i) => tex.add(i, 0, i * fw, 0, fw, fh));
}

/** Textura do herói com todas as animações e as anims "<herói>-<nome>" registradas. */
export function bakeHero(scene: Phaser.Scene, art: HeroArt): void {
  const all = art.anims.flatMap((a) => a.frames);
  addSheet(scene, art.key, all);
  let start = 0;
  for (const a of art.anims) {
    const frames = a.frames.map((_, i) => start + i);
    addAnim(scene, `${art.key}-${a.name}`, art.key, frames, a.fps, a.repeat);
    start += a.frames.length;
  }
}

export function addAnim(scene: Phaser.Scene, key: string, texture: string, frames: number[], fps: number, repeat = true): void {
  scene.anims.create({ key, frames: frames.map((frame) => ({ key: texture, frame })), frameRate: fps, repeat: repeat ? -1 : 0 });
}

/** Textura desenhada com o canvas 2D comum (degradês de luz, que não são pixel art). */
export function addCanvasTexture(scene: Phaser.Scene, key: string, w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void): void {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  paint(canvas.getContext('2d')!);
  scene.textures.addCanvas(key, canvas);
}
