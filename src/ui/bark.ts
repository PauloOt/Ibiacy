import type Phaser from 'phaser';
import { OCO } from './tokens';

/**
 * Painel de casca entalhada (guia visual): veio vertical, borda de 3 px e, por dentro,
 * um filete escuro e um filete âmbar fraco. Canto reto.
 */
export function drawBark(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, o: { focus?: boolean } = {}): void {
  g.fillStyle(OCO.casca).fillRect(x, y, w, h);
  g.fillStyle(OCO.sulco);
  for (let i = x + 7; i < x + w - 2; i += 9) g.fillRect(i, y, 2, h);
  frame(g, x, y, w, h, 3, o.focus ? OCO.ambar : OCO.veio, 1);
  frame(g, x + 3, y + 3, w - 6, h - 6, 2, OCO.noite, 1);
  frame(g, x + 5, y + 5, w - 10, h - 10, 2, OCO.ambar, 0.35);
}

/** Botão: borda de 3 px; em foco, cheio de âmbar. */
export function drawButton(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, focus: boolean): void {
  if (focus) g.fillStyle(OCO.ambar).fillRect(x, y, w, h);
  frame(g, x, y, w, h, 3, focus ? OCO.ambar : OCO.veio, 1);
}

/** Barra (XP): trilho de veio, enchimento âmbar. */
export function drawBar(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, p: number): void {
  g.fillStyle(OCO.veio).fillRect(x, y, w, h);
  g.fillStyle(OCO.ambar).fillRect(x + 2, y + 2, Math.round((w - 4) * Math.max(0, Math.min(1, p))), h - 4);
}

function frame(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, t: number, color: number, alpha: number): void {
  g.fillStyle(color, alpha);
  g.fillRect(x, y, w, t);
  g.fillRect(x, y + h - t, w, t);
  g.fillRect(x, y + t, t, h - 2 * t);
  g.fillRect(x + w - t, y + t, t, h - 2 * t);
}
