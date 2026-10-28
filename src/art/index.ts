import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { bushLayer, canopyLayer, mountainLayer, skyLayer } from './background';
import { addAnim, addCanvasTexture, addSheet, addTileset, bakeHero } from './bake';
import { heroArts } from './heroes';
import { basinFrame, hubRoomFrame, jabutiFrame, lojaFrame, moundFrame, quatiFrames } from './hub';
import { TILESET, tilesetFrames } from './tileset';
import {
  fireFrames,
  groundFrames,
  heartFrames,
  logFrames,
  particleFrames,
  saplingFrames,
  seedFrames,
  trapFrames,
  tuftFrames,
  vineFrames,
  waterFrames,
} from './world';

/** Gera toda a arte do jogo em código e registra texturas e animações. Roda uma vez no Boot. */
export function bakeAll(scene: Phaser.Scene): void {
  for (const art of heroArts()) bakeHero(scene, art);

  addSheet(scene, 'ground', groundFrames());
  addTileset(scene, 'tiles', tilesetFrames(), TILESET.cols);
  addSheet(scene, 'tuft', tuftFrames());
  for (let k = 0; k < 4; k++) addAnim(scene, `tuft-${k}`, 'tuft', [k * 3, k * 3 + 1, k * 3, k * 3 + 2], 3);
  addSheet(scene, 'log', logFrames());
  addSheet(scene, 'vine', vineFrames());
  addAnim(scene, 'vine-sway', 'vine', [0, 1, 2, 3], 4);
  addSheet(scene, 'water', waterFrames());
  addAnim(scene, 'water-top', 'water', [0, 1, 2, 3], 6);
  addAnim(scene, 'water-deep', 'water', [4, 5, 6, 7], 4);
  addSheet(scene, 'fire', fireFrames());
  addAnim(scene, 'fire-burn', 'fire', [0, 1, 2, 3, 4, 5], 12);
  addSheet(scene, 'trap', trapFrames());
  addSheet(scene, 'seed', seedFrames());
  addAnim(scene, 'seed-shine', 'seed', [0, 1, 2, 3, 4, 5, 6, 7], 8);
  addSheet(scene, 'sapling', saplingFrames());
  addAnim(scene, 'sapling-idle', 'sapling', [0, 1], 2);
  addAnim(scene, 'sapling-grow', 'sapling', [2, 3, 4, 5, 6, 7], 12, false);
  addAnim(scene, 'tree-idle', 'sapling', [8, 9], 2);
  // Hub (salão dentro da árvore)
  addSheet(scene, 'hub-sala', [hubRoomFrame()]);
  addSheet(scene, 'hub-loja', [lojaFrame()]);
  addSheet(scene, 'hub-monte', [moundFrame()]);
  addSheet(scene, 'hub-bica', [basinFrame()]);
  addSheet(scene, 'jabuti', [jabutiFrame(0), jabutiFrame(1)]);
  addSheet(scene, 'quati', quatiFrames());
  addAnim(scene, 'quati-idle', 'quati', [0, 1, 2, 3], 4);
  addSheet(scene, 'heart', heartFrames());
  for (const [name, r] of Object.entries(particleFrames())) addSheet(scene, `p-${name}`, [r]);

  addSheet(scene, 'bg-sky', [skyLayer()]);
  addSheet(scene, 'bg-mountain', [mountainLayer()]);
  addSheet(scene, 'bg-canopy', [canopyLayer()]);
  addSheet(scene, 'bg-bush', [bushLayer()]);

  // Luz: brilho redondo (fogo, semente), raios de sol entre as copas e vinheta nas bordas
  addCanvasTexture(scene, 'glow', 128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
  addCanvasTexture(scene, 'rays', GAME_WIDTH, GAME_HEIGHT, (ctx) => {
    for (const [x, w] of [[180, 70], [330, 40], [560, 90], [760, 50]]) {
      const g = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
      g.addColorStop(0, 'rgba(255,244,200,0.5)');
      g.addColorStop(1, 'rgba(255,244,200,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + w, 0);
      ctx.lineTo(x + w - 220, GAME_HEIGHT);
      ctx.lineTo(x - 220 - w * 0.5, GAME_HEIGHT);
      ctx.fill();
    }
  });
  addCanvasTexture(scene, 'vignette', GAME_WIDTH, GAME_HEIGHT, (ctx) => {
    const g = ctx.createRadialGradient(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_HEIGHT * 0.45, GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH * 0.7);
    g.addColorStop(0, 'rgba(10,20,14,0)');
    g.addColorStop(1, 'rgba(10,20,14,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  });
}
