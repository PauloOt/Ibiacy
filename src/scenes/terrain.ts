import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, TILE } from '../config';
import type { TilePos } from '../core/levelParser';

// Peças comuns de montagem do cenário da fase: camadas de desenho e fundo em parallax.

/** Camadas de desenho, de trás pra frente. A interface (placa, painel) fica acima da luz. */
export const DEPTH = { bg: -10, deco: 1, object: 2, hero: 3, water: 5, fx: 6, light: 7, ui: 8 } as const;

export const tileCenter = (p: TilePos) => ({ x: p.tx * TILE + TILE / 2, y: p.ty * TILE + TILE / 2 });

export interface Parallax {
  layer: Phaser.GameObjects.TileSprite;
  factor: number;
}

/** Céu, serra, copas e folhagem em camadas que andam em velocidades diferentes. */
export function buildParallax(scene: Phaser.Scene): Parallax[] {
  const layers: [string, number][] = [['bg-sky', 0.02], ['bg-mountain', 0.08], ['bg-canopy', 0.2], ['bg-bush', 0.4]];
  return layers.map(([key, factor], i) => ({
    layer: scene.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, key).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.bg + i),
    factor,
  }));
}
