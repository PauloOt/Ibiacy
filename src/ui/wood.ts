import type Phaser from 'phaser';
import { WOOD } from './tokens';

/**
 * Tábua: contorno de 4 px, luz de 4 px no topo, sombra de 4 px na base, canto reto.
 * `drop` põe a sombra dura de 6 px embaixo (painel grande).
 */
export function drawPlank(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, o: { on?: boolean; drop?: boolean } = {}): void {
  if (o.drop) {
    g.fillStyle(WOOD.drop);
    g.fillRect(x, y + 6, w, h);
  }
  g.fillStyle(WOOD.dark);
  g.fillRect(x, y, w, h);
  g.fillStyle(o.on ? WOOD.light : WOOD.body);
  g.fillRect(x + 4, y + 4, w - 8, h - 8);
  g.fillStyle(o.on ? WOOD.ipe : WOOD.light);
  g.fillRect(x + 4, y + 4, w - 8, 4);
  g.fillStyle(WOOD.shade);
  g.fillRect(x + 4, y + h - 8, w - 8, 4);
}

/** Linha tracejada de 2 px entre as linhas de um painel. */
export function drawDashes(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number): void {
  g.fillStyle(WOOD.shade);
  for (let i = 0; i < w; i += 8) g.fillRect(x + i, y, 4, 2);
}
