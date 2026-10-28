import type { Raster } from '../raster';

export interface AnimDef {
  name: string;
  frames: Raster[];
  fps: number;
  repeat: boolean;
}

export interface HeroArt {
  key: string;
  /** Tamanho do frame em pixels de arte (no mundo é vezes ART_SCALE) */
  frameW: number;
  frameH: number;
  anims: AnimDef[];
}

/** Frames de 0 a n-1 com t indo de 0 a 1 (fase do ciclo). */
export function cycle(n: number, draw: (t: number, i: number) => Raster): Raster[] {
  return Array.from({ length: n }, (_, i) => draw(i / n, i));
}

export const TAU = Math.PI * 2;

/**
 * Pé numa passada: anda pra frente e pra trás com sin, e sobe um pouco
 * só na metade em que está voltando pra frente (o pé no ar).
 */
export function foot(hipX: number, groundY: number, phase: number, stride: number, lift: number): [number, number] {
  const x = hipX + Math.sin(phase * TAU) * stride;
  const up = Math.max(0, Math.cos(phase * TAU)) * lift;
  return [x, groundY - up];
}
