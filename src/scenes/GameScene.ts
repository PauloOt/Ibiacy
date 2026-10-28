import Phaser from 'phaser';
import { TILE } from '../config';
import { cellAt, connectedBreakables, parseLevel, type ParsedLevel, type TilePos } from '../core/levelParser';
import type { Hero, LevelQuery } from '../heroes/Hero';
import { Lontra } from '../heroes/Lontra';
import { Mico } from '../heroes/Mico';
import { Onca } from '../heroes/Onca';
import { Controls } from '../input/Controls';
import { salaDeTeste } from '../levels/salaDeTeste';
import { TeamManager } from '../team/TeamManager';

type Img = Phaser.Physics.Arcade.Image;

const tileCenter = (p: TilePos) => ({ x: p.tx * TILE + TILE / 2, y: p.ty * TILE + TILE / 2 });

export class GameScene extends Phaser.Scene implements LevelQuery {
  private level!: ParsedLevel;
  private team!: TeamManager;
  private controls!: Controls;
  private leaves!: Phaser.GameObjects.Particles.ParticleEmitter;
  private breakables = new Map<string, Img>();
  /** Sementes pegas desde o último checkpoint: voltam pro mapa se o time morrer */
  private seedsSinceCheckpoint: Img[] = [];

  constructor() {
    super('Game');
  }

  create(): void {
    this.level = parseLevel(salaDeTeste);
    const worldW = this.level.width * TILE;
    const worldH = this.level.height * TILE;
    this.cameras.main.setBackgroundColor('#bfe3c4').setBounds(0, 0, worldW, worldH);
    this.physics.world.setBounds(0, 0, worldW, worldH + TILE * 4);

    const solids = this.buildTerrain();
    const breakables = this.physics.add.staticGroup();
    for (const p of this.level.breakables) {
      const c = tileCenter(p);
      const log = breakables.create(c.x, c.y, 'log') as Img;
      this.breakables.set(`${p.tx},${p.ty}`, log);
    }
    const fires = this.staticGroupOf(this.level.fires, 'fire');
    const traps = this.staticGroupOf(this.level.traps, 'trap');
    const seeds = this.staticGroupOf(this.level.seeds, 'seed');
    const checkpoints = this.physics.add.staticGroup();
    for (const p of this.level.checkpoints) {
      const c = tileCenter(p);
      (checkpoints.create(c.x, c.y, 'sprout') as Img).setData('reached', false);
    }

    const heroes: Hero[] = [new Mico(this), new Onca(this), new Lontra(this)];
    const start = tileCenter(this.level.start);
    this.team = new TeamManager(heroes, { x: start.x, bottom: (this.level.start.ty + 1) * TILE });

    this.physics.add.collider(heroes, solids);
    this.physics.add.collider(heroes, breakables, undefined, (h, log) => this.onLogContact(h as Hero, log as Img));
    this.physics.add.overlap(heroes, fires, (h, f) => this.onFire(h as Hero, f as Img));
    this.physics.add.overlap(heroes, traps, (h, t) => this.onTrap(h as Hero, t as Img));
    this.physics.add.overlap(heroes, seeds, (_h, s) => this.onSeed(s as Img));
    this.physics.add.overlap(heroes, checkpoints, (_h, c) => this.onCheckpoint(c as Img));

    this.leaves = this.add.particles(0, 0, 'leaf', {
      speed: { min: 60, max: 180 },
      angle: { min: 0, max: 360 },
      rotate: { min: 0, max: 360 },
      lifespan: 450,
      gravityY: 300,
      scale: { start: 1.4, end: 0 },
      emitting: false,
    }).setDepth(4);

    this.team.on('swapped', (x: number, y: number) => {
      this.leaves.explode(12, x, y);
      this.follow();
    });
    this.team.on('respawned', () => this.restoreSeeds());
    this.team.on('changed', () => this.registry.set('hud', this.team.snapshot()));
    this.registry.set('hud', this.team.snapshot());
    this.follow();

    this.controls = new Controls(this);
    this.events.on(Phaser.Scenes.Events.RESUME, () => this.controls.reset());
    this.scene.launch('Hud');

    // Pra testar pelo console do navegador
    (window as unknown as { __ibiacy?: unknown }).__ibiacy = { scene: this, team: this.team };
  }

  update(time: number, delta: number): void {
    const input = this.controls.read();
    if (input.pausePressed) {
      this.scene.pause();
      this.scene.launch('Pause');
      return;
    }
    // Delta limitado: aba voltando do segundo plano não teleporta o herói
    this.team.update(input, time, Math.min(delta, 50), this);
    if (this.team.active.body.top > this.level.height * TILE) this.team.respawn();
  }

  isWater(x: number, y: number): boolean {
    return cellAt(this.level, Math.floor(x / TILE), Math.floor(y / TILE)) === '~';
  }

  isVine(x: number, y: number): boolean {
    return cellAt(this.level, Math.floor(x / TILE), Math.floor(y / TILE)) === 'V';
  }

  private buildTerrain(): Phaser.Physics.Arcade.StaticGroup {
    const { grid } = this.level;
    grid.forEach((row, ty) => {
      [...row].forEach((ch, tx) => {
        const { x, y } = tileCenter({ tx, ty });
        if (ch === '#') this.add.image(x, y, cellAt(this.level, tx, ty - 1) === '#' ? 'dirt' : 'grass');
        else if (ch === 'V') this.add.image(x, y, 'vine').setDepth(1);
        else if (ch === '~') {
          // Linha de superfície só onde tem ar em cima (embaixo da pedra não tem)
          const above = cellAt(this.level, tx, ty - 1);
          this.add.image(x, y, above === '~' || above === '#' ? 'water' : 'water-top').setDepth(5);
        }
      });
    });

    // Corpo de colisão por faixa contínua de chão (invisível; o desenho é por tile)
    const solids = this.physics.add.staticGroup();
    for (const r of this.level.solids) {
      const zone = this.add.zone((r.tx + r.w / 2) * TILE, (r.ty + r.h / 2) * TILE, r.w * TILE, r.h * TILE);
      solids.add(zone);
    }
    return solids;
  }

  private staticGroupOf(positions: TilePos[], texture: string): Phaser.Physics.Arcade.StaticGroup {
    const group = this.physics.add.staticGroup();
    for (const p of positions) {
      const c = tileCenter(p);
      group.create(c.x, c.y, texture).setDepth(2);
    }
    return group;
  }

  private follow(): void {
    this.cameras.main.startFollow(this.team.active, true, 0.15, 0.15);
  }

  /** Onça em investida atravessa e quebra o tronco inteiro; pros outros é parede. */
  private onLogContact(hero: Hero, log: Img): boolean {
    if (!(hero instanceof Onca) || !hero.isDashing) return true;
    const p = { tx: Math.floor(log.x / TILE), ty: Math.floor(log.y / TILE) };
    for (const piece of connectedBreakables(this.level, p)) {
      const key = `${piece.tx},${piece.ty}`;
      this.breakables.get(key)?.destroy();
      this.breakables.delete(key);
      // Tira do grid pra não quebrar de novo
      const row = this.level.grid[piece.ty];
      this.level.grid[piece.ty] = row.slice(0, piece.tx) + '.' + row.slice(piece.tx + 1);
    }
    this.cameras.main.shake(120, 0.006);
    return false;
  }

  private onFire(hero: Hero, fire: Img): void {
    if (hero instanceof Lontra && hero.isWet(this.time.now)) {
      this.leaves.explode(6, fire.x, fire.y);
      fire.destroy();
      return;
    }
    this.team.hurt(this.time.now, fire.x);
  }

  private onTrap(hero: Hero, trap: Img): void {
    if (trap.getData('sprung')) return;
    if (hero instanceof Onca && hero.isDashing) {
      trap.destroy();
      return;
    }
    if (this.team.trap(this.time.now, trap.x)) {
      trap.setData('sprung', true).setTexture('trap-sprung');
    }
  }

  private onSeed(seed: Img): void {
    seed.disableBody(true, true);
    this.seedsSinceCheckpoint.push(seed);
    this.team.collectSeed();
  }

  private onCheckpoint(sprout: Img): void {
    if (sprout.getData('reached')) return;
    sprout.setData('reached', true).setTexture('tree');
    // A árvore tem 2 tiles de altura: sobe meio tile pra continuar com o pé no chão
    sprout.y -= TILE / 2;
    const bottom = sprout.y + TILE;
    this.leaves.explode(16, sprout.x, sprout.y);
    this.seedsSinceCheckpoint = [];
    this.team.setCheckpoint({ x: sprout.x, bottom });
  }

  private restoreSeeds(): void {
    for (const seed of this.seedsSinceCheckpoint) seed.enableBody(false, 0, 0, true, true);
    this.seedsSinceCheckpoint = [];
  }
}
