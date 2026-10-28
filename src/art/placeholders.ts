import type Phaser from 'phaser';
import { TILE } from '../config';

/**
 * Arte provisória desenhada em código (greybox). Cada chave vira textura e
 * depois é só trocar pelo sprite de verdade com o mesmo nome.
 */
export function makePlaceholderTextures(scene: Phaser.Scene): void {
  const draw = (key: string, w: number, h: number, paint: (g: Phaser.GameObjects.Graphics) => void) => {
    const g = scene.make.graphics({}, false);
    paint(g);
    g.generateTexture(key, w, h);
    g.destroy();
  };

  // Heróis (olhando pra direita; o flip cuida do outro lado)
  draw('mico', 20, 26, (g) => {
    g.fillStyle(0xe8a33d).fillRect(0, 6, 20, 20);
    g.fillStyle(0xc9761c).fillCircle(10, 8, 9); // juba
    g.fillStyle(0x6b3b1a).fillRect(11, 5, 7, 7); // cara
    g.fillStyle(0xffffff).fillRect(15, 6, 2, 2);
  });
  draw('onca', 38, 26, (g) => {
    g.fillStyle(0xd9a441).fillRect(0, 4, 38, 22);
    g.fillStyle(0x2b1d0e);
    [[5, 9], [12, 15], [19, 8], [25, 17], [8, 20], [16, 21]].forEach(([x, y]) => g.fillCircle(x, y, 2.5));
    g.fillStyle(0xe6b85c).fillRect(28, 2, 10, 14); // cabeça
    g.fillStyle(0xffffff).fillRect(33, 6, 2, 2);
  });
  draw('lontra', 32, 18, (g) => {
    g.fillStyle(0x7a5230).fillRect(0, 2, 32, 16);
    g.fillStyle(0xc9a27a).fillRect(4, 12, 22, 6); // barriga
    g.fillStyle(0x7a5230).fillRect(24, 0, 8, 10); // cabeça
    g.fillStyle(0xffffff).fillRect(28, 3, 2, 2);
  });

  // Terreno
  draw('dirt', TILE, TILE, (g) => {
    g.fillStyle(0x5b3f26).fillRect(0, 0, TILE, TILE);
    g.fillStyle(0x4a321d);
    [[4, 6], [20, 12], [10, 22], [26, 26]].forEach(([x, y]) => g.fillRect(x, y, 3, 3));
  });
  draw('grass', TILE, TILE, (g) => {
    g.fillStyle(0x5b3f26).fillRect(0, 0, TILE, TILE);
    g.fillStyle(0x3f8f3a).fillRect(0, 0, TILE, 8);
    g.fillStyle(0x2f6f2c).fillRect(0, 8, TILE, 2);
  });
  draw('log', TILE, TILE, (g) => {
    g.fillStyle(0x6a4a2a).fillRect(2, 0, TILE - 4, TILE);
    g.lineStyle(2, 0x3d2914).lineBetween(8, 4, 12, 28).lineBetween(20, 2, 18, 18).lineBetween(24, 20, 26, 30);
  });
  draw('vine', TILE, TILE, (g) => {
    g.lineStyle(3, 0x2e7d32).lineBetween(16, 0, 14, 16).lineBetween(14, 16, 17, 32);
    g.fillStyle(0x4caf50).fillEllipse(10, 10, 8, 4).fillEllipse(22, 24, 8, 4);
  });
  draw('water', TILE, TILE, (g) => {
    g.fillStyle(0x2f78b7, 0.6).fillRect(0, 0, TILE, TILE);
  });
  draw('water-top', TILE, TILE, (g) => {
    g.fillStyle(0x2f78b7, 0.6).fillRect(0, 4, TILE, TILE - 4);
    g.fillStyle(0xa8d8f0, 0.8).fillRect(0, 4, TILE, 3);
  });

  // Ameaças e coisas
  draw('fire', TILE, TILE, (g) => {
    g.fillStyle(0xe53935).fillTriangle(2, 32, 16, 2, 30, 32);
    g.fillStyle(0xffb300).fillTriangle(8, 32, 16, 12, 24, 32);
  });
  draw('trap', TILE, TILE, (g) => {
    g.lineStyle(2, 0x9e9e9e).strokeEllipse(16, 28, 24, 6);
    g.lineStyle(2, 0x757575).lineBetween(28, 28, 32, 20);
  });
  draw('trap-sprung', TILE, TILE, (g) => {
    g.lineStyle(2, 0x616161).lineBetween(4, 30, 28, 30);
  });
  draw('seed', 12, 14, (g) => {
    g.fillStyle(0x8d5a2b).fillEllipse(6, 8, 10, 12);
    g.fillStyle(0x66bb6a).fillEllipse(6, 2, 6, 4);
  });
  draw('sprout', TILE, TILE, (g) => {
    g.lineStyle(2, 0x558b2f).lineBetween(16, 32, 16, 20);
    g.fillStyle(0x7cb342).fillEllipse(12, 20, 8, 4).fillEllipse(20, 18, 8, 4);
  });
  draw('tree', TILE, TILE * 2, (g) => {
    g.fillStyle(0x6d4c41).fillRect(13, 30, 6, 34);
    g.fillStyle(0x43a047).fillCircle(16, 22, 15);
    g.fillStyle(0xffd54f).fillCircle(10, 18, 2).fillCircle(22, 26, 2); // ipê começando a florir
  });
  draw('leaf', 6, 4, (g) => {
    g.fillStyle(0x66bb6a).fillEllipse(3, 2, 6, 4);
  });
}
