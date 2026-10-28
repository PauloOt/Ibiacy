import Phaser from 'phaser';
import { TILE } from '../config';
import { hash2 } from '../art/rng';
import { TILESET } from '../art/tileset';
import { groundFrame, stoneFrame } from '../art/world';
import { cellAt, type ParsedLevel } from '../core/levelParser';
import { DEPTH } from './terrain';

const isSolid = (ch: string) => ch === '#' || ch === 'S';
const shade = (from: number, to: number, steps: number, i: number) => {
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(
    Phaser.Display.Color.ValueToColor(from), Phaser.Display.Color.ValueToColor(to), steps, i);
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
};

/**
 * O mundo gerado no Phaser: Tilemap com duas camadas (fundo: parede do subsolo e troncos;
 * frente: terra, pedra, copa e galho) e sprites pra água, cipó e tufo, que são animados.
 *
 * Cada camada do Tilemap cria um objeto por célula, por isso água e cipó não viram camada.
 */
export class WorldMap {
  readonly front: Phaser.Tilemaps.TilemapLayer;
  private readonly back: Phaser.Tilemaps.TilemapLayer;
  /** Tufo em cima de cada tile de chão, pra sumir junto quando a onça cava */
  private readonly tufts = new Map<string, Phaser.GameObjects.Sprite>();

  constructor(scene: Phaser.Scene, private readonly level: ParsedLevel, private readonly surface: readonly number[]) {
    const map = scene.make.tilemap({ width: level.width, height: level.height, tileWidth: TILE, tileHeight: TILE });
    const tiles = map.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0)!;
    // Fundo acima do céu em camadas e dos raios de sol: no subsolo a parede cobre tudo
    this.back = map.createBlankLayer('fundo', tiles)!.setDepth(DEPTH.bg + 7);
    this.front = map.createBlankLayer('frente', tiles)!.setDepth(0);

    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        this.paintBack(x, y);
        this.paintFront(x, y);
        this.addSprites(scene, x, y);
      }
    }
    this.front.calculateFacesWithin(0, 0, level.width, level.height);
  }

  /** Cava o tile de terra em (tx, ty). Pedra não cava. true se cavou. */
  dig(tx: number, ty: number): boolean {
    if (cellAt(this.level, tx, ty) !== '#' || tx <= 0 || tx >= this.level.width - 1) return false;
    const row = this.level.grid[ty];
    this.level.grid[ty] = row.slice(0, tx) + '.' + row.slice(tx + 1);
    this.front.removeTileAt(tx, ty, true, false);
    this.tufts.get(`${tx},${ty}`)?.destroy();
    this.tufts.delete(`${tx},${ty}`);
    // Vizinhos mudam de borda e os de baixo de sombra
    for (let y = ty - 1; y <= ty + 6; y++) for (let x = tx - 1; x <= tx + 1; x++) this.paintFront(x, y);
    this.front.calculateFacesWithin(tx - 1, ty - 1, 3, 8);
    return true;
  }

  /** A frente de fogo passou: a grama da coluna fica queimada e o tufo vira cinza. */
  burn(x: number): void {
    const y = this.surface[x];
    if (y === undefined) return;
    for (let k = 0; k < 2; k++) {
      const tile = this.front.getTileAt(x, y + k);
      if (tile) tile.tint = k === 0 ? 0x5a4a46 : 0x7a6a66;
    }
    this.tufts.get(`${x},${y}`)?.setTint(0x3a3230).stop();
  }

  private paintBack(x: number, y: number): void {
    const h = hash2(x * 7, y * 13);
    if (cellAt(this.level, x, y) === '|') {
      this.back.putTileAt(TILESET.trunk + (h % 4), x, y, false);
      return;
    }
    const below = y - this.surface[x];
    if (below <= 0) return;
    const tile = this.back.putTileAt((below > 14 ? TILESET.wallStone : TILESET.wallDirt) + (h % 4), x, y, false);
    tile.tint = shade(0xffffff, 0x6a5a78, 40, Math.min(40, below));
  }

  private paintFront(x: number, y: number): void {
    if (x < 0 || y < 0 || x >= this.level.width || y >= this.level.height) return;
    const ch = cellAt(this.level, x, y);
    const at = (dx: number, dy: number) => cellAt(this.level, x + dx, y + dy);
    const h = hash2(x, y);
    let index = -1;
    if (isSolid(ch)) {
      const sides = {
        top: !isSolid(at(0, -1)),
        bottom: !isSolid(at(0, 1)) && y + 1 < this.level.height,
        left: !isSolid(at(-1, 0)),
        right: !isSolid(at(1, 0)),
      };
      index = ch === '#' ? TILESET.dirt + groundFrame(sides, h) : TILESET.stone + stoneFrame(sides, h);
    } else if (ch === '%' || ch === '=') {
      const first = ch === '%' ? TILESET.canopy : TILESET.branch;
      const last = ch === '%' ? 3 : 2;
      index = first + (at(-1, 0) !== ch ? 0 : at(1, 0) !== ch ? last : ch === '%' ? 1 + (h % 2) : 1);
    }
    if (index < 0) {
      this.front.removeTileAt(x, y, true, false);
      return;
    }
    const tile = this.front.putTileAt(index, x, y, false);
    if (isSolid(ch)) {
      tile.setCollision(true, true, true, true, false);
      // Quanto mais fundo na terra, mais escuro: dá profundidade sem desenhar tile novo
      let depth = 0;
      while (depth < 5 && isSolid(at(0, -depth - 1))) depth++;
      tile.tint = shade(0xffffff, 0x5a4a66, 6, depth);
    } else {
      // Copa e galho: só o lado de cima segura (dá pra pular por baixo)
      tile.setCollision(false, false, true, false, false);
    }
  }

  private addSprites(scene: Phaser.Scene, x: number, y: number): void {
    const ch = cellAt(this.level, x, y);
    const cx = x * TILE + TILE / 2;
    const cy = y * TILE + TILE / 2;
    if (ch === '~') {
      const above = cellAt(this.level, x, y - 1);
      const top = above !== '~' && !isSolid(above);
      let depth = 0;
      // Embaixo da pedra também conta como fundo (fica escuro)
      while (depth < 6 && '~#S'.includes(cellAt(this.level, x, y - depth - 1))) depth++;
      const water = scene.add.sprite(cx, cy, 'water', top ? 0 : 4).setDepth(DEPTH.water).setAlpha(0.72).setTint(shade(0xffffff, 0x5a7aa8, 7, depth));
      if (top) water.play({ key: 'water-top', startFrame: x % 4 });
    } else if (ch === 'V') {
      scene.add.sprite(cx, cy, 'vine').setDepth(DEPTH.deco).play({ key: 'vine-sway', startFrame: y % 4 });
    } else if (ch === '#' && cellAt(this.level, x, y - 1) === '.' && y <= this.surface[x] + 2) {
      // Tufo de grama, flor ou samambaia em parte do chão da superfície
      const h = hash2(x * 3, y * 5);
      if (h % 5 >= 2) return;
      const tuft = scene.add.sprite(cx + ((h >>> 4) % 9) - 4, cy - TILE / 2 + 1, 'tuft').setOrigin(0.5, 1).setDepth(DEPTH.deco)
        .play({ key: `tuft-${(h >>> 8) % 4}`, startFrame: (h >>> 12) % 4 });
      this.tufts.set(`${x},${y}`, tuft);
    }
  }
}
