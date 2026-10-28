import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, TILE } from '../config';
import { hash2 } from '../art/rng';
import { groundFrame } from '../art/world';
import { cellAt, type ParsedLevel, type TilePos } from '../core/levelParser';

// Montagem do cenário a partir do mapa em texto: usada pela fase e pelo lobby.

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

/** Chão, tufos, cipó e água. Devolve os corpos de colisão do chão. */
export function buildTerrain(scene: Phaser.Scene, lvl: ParsedLevel): Phaser.Physics.Arcade.StaticGroup {
  const solid = (tx: number, ty: number) => cellAt(lvl, tx, ty) === '#';
  lvl.grid.forEach((row, ty) => {
    [...row].forEach((ch, tx) => {
      const { x, y } = tileCenter({ tx, ty });
      if (ch === '#') {
        const sides = { top: !solid(tx, ty - 1), bottom: !solid(tx, ty + 1) && ty + 1 < lvl.height, left: !solid(tx - 1, ty), right: !solid(tx + 1, ty) };
        // Quanto mais fundo na terra, mais escuro: dá profundidade sem desenhar tile novo
        let depth = 0;
        while (depth < 5 && solid(tx, ty - depth - 1)) depth++;
        const shade = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(0xffffff), Phaser.Display.Color.ValueToColor(0x5a4a66), 6, depth);
        scene.add.image(x, y, 'ground', groundFrame(sides, hash2(tx, ty)))
          .setTint(Phaser.Display.Color.GetColor(shade.r, shade.g, shade.b));
        // Tufo de grama, flor ou samambaia em cima de parte do chão
        const h = hash2(tx * 3, ty * 5);
        if (sides.top && h % 5 < 2 && cellAt(lvl, tx, ty - 1) === '.') {
          scene.add.sprite(x + ((h >>> 4) % 9) - 4, y - TILE / 2 + 1, 'tuft').setOrigin(0.5, 1).setDepth(DEPTH.deco)
            .play({ key: `tuft-${(h >>> 8) % 4}`, startFrame: (h >>> 12) % 4 });
        }
      } else if (ch === 'V') {
        scene.add.sprite(x, y, 'vine').setDepth(DEPTH.deco).play('vine-sway');
      } else if (ch === '~') {
        // Superfície só onde tem ar em cima (embaixo da pedra não tem)
        const above = cellAt(lvl, tx, ty - 1);
        const surface = above !== '~' && above !== '#';
        let depth = 0;
        // Embaixo da pedra também conta como fundo (fica escuro)
        while (depth < 6 && '~#'.includes(cellAt(lvl, tx, ty - depth - 1))) depth++;
        const deep = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(0xffffff), Phaser.Display.Color.ValueToColor(0x5a7aa8), 7, depth);
        scene.add.sprite(x, y, 'water').setDepth(DEPTH.water).setAlpha(0.72)
          .setTint(Phaser.Display.Color.GetColor(deep.r, deep.g, deep.b))
          .play({ key: surface ? 'water-top' : 'water-deep', startFrame: tx % 4 });
      }
    });
  });

  // Corpo de colisão por faixa contínua de chão (invisível; o desenho é por tile)
  const solids = scene.physics.add.staticGroup();
  for (const r of lvl.solids) {
    solids.add(scene.add.zone((r.tx + r.w / 2) * TILE, (r.ty + r.h / 2) * TILE, r.w * TILE, r.h * TILE));
  }
  return solids;
}
