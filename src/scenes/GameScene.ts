import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, TILE } from '../config';
import { hash2 } from '../art/rng';
import { cellAt, connectedBreakables, parseLevel, type ParsedLevel } from '../core/levelParser';
import type { Hero, LevelQuery } from '../heroes/Hero';
import { Lontra } from '../heroes/Lontra';
import { Mico } from '../heroes/Mico';
import { Onca } from '../heroes/Onca';
import { Controls } from '../input/Controls';
import { salaDeTeste } from '../levels/salaDeTeste';
import { TeamManager } from '../team/TeamManager';
import { LeafCurtain } from '../ui/LeafCurtain';
import { buildParallax, buildTerrain, DEPTH, tileCenter, type Parallax } from './terrain';

type Spr = Phaser.Physics.Arcade.Sprite;
type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;

export class GameScene extends Phaser.Scene implements LevelQuery {
  private level!: ParsedLevel;
  private team!: TeamManager;
  private controls!: Controls;
  private parallax: Parallax[] = [];
  private fx!: Record<'leaves' | 'dust' | 'embers' | 'petals' | 'sparkle' | 'splash', Emitter>;
  private breakables = new Map<string, Spr>();
  /** Sementes pegas desde o último checkpoint: voltam pro mapa se o time morrer */
  private seedsSinceCheckpoint: Spr[] = [];
  private wasInWater = false;
  /** Fogos que a lontra apagou (param de soltar brasa) */
  private extinguished = new Set<string>();

  constructor() {
    super('Game');
  }

  /** `curtain`: veio do lobby pela trilha, então começa com a cortina de folhas fechada. */
  create(data?: { curtain?: boolean }): void {
    this.level = parseLevel(salaDeTeste);
    const worldW = this.level.width * TILE;
    const worldH = this.level.height * TILE;
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.physics.world.setBounds(0, 0, worldW, worldH + TILE * 4);

    this.buildBackground();
    const solids = buildTerrain(this, this.level);
    this.createEffects();

    const breakables = this.physics.add.staticGroup();
    for (const p of this.level.breakables) {
      const c = tileCenter(p);
      const top = cellAt(this.level, p.tx, p.ty - 1) !== 'L';
      const log = (breakables.create(c.x, c.y, 'log', top ? 0 : 1) as Spr).setDepth(DEPTH.object);
      this.breakables.set(`${p.tx},${p.ty}`, log);
    }

    const fires = this.physics.add.staticGroup();
    for (const p of this.level.fires) {
      const c = tileCenter(p);
      const fire = (fires.create(c.x, c.y, 'fire') as Spr).setDepth(DEPTH.object).play({ key: 'fire-burn', startFrame: hash2(p.tx, p.ty) % 6 });
      // Corpo menor que o tile: encostar na beirada da chama não queima
      fire.body!.setSize(20, 22).setOffset(6, 10);
      const glow = this.addGlow(c.x, c.y + 4, 0xff8a2a, 1.6, 0.55);
      fire.setData('glow', glow);
    }

    const traps = this.physics.add.staticGroup();
    for (const p of this.level.traps) {
      const c = tileCenter(p);
      const trap = (traps.create(c.x, c.y, 'trap', 0) as Spr).setDepth(DEPTH.object);
      trap.body!.setSize(24, 8).setOffset(4, 24);
    }

    const seeds = this.physics.add.staticGroup();
    for (const p of this.level.seeds) {
      const c = tileCenter(p);
      const seed = (seeds.create(c.x, c.y, 'seed') as Spr).setDepth(DEPTH.object).play({ key: 'seed-shine', startFrame: hash2(p.tx, p.ty) % 8 });
      seed.setData('glow', this.addGlow(c.x, c.y, 0xffe08a, 0.45, 0.45));
      this.tweens.add({ targets: seed, y: c.y - 3, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: hash2(p.ty, p.tx) % 900 });
    }

    const checkpoints = this.physics.add.staticGroup();
    for (const p of this.level.checkpoints) {
      const bottom = (p.ty + 1) * TILE;
      const cp = (checkpoints.create(p.tx * TILE + TILE / 2, bottom - TILE, 'sapling', 0) as Spr).setDepth(DEPTH.object);
      cp.play('sapling-idle').setData('reached', false);
      // O frame tem 2 tiles de altura; o gatilho é só o tile de baixo
      cp.body!.setSize(TILE, TILE).setOffset(0, TILE);
    }

    const heroes: Hero[] = [new Mico(this), new Onca(this), new Lontra(this)];
    heroes.forEach((h) => h.setDepth(DEPTH.hero));
    const start = tileCenter(this.level.start);
    this.team = new TeamManager(heroes, { x: start.x, bottom: (this.level.start.ty + 1) * TILE });

    this.physics.add.collider(heroes, solids);
    this.physics.add.collider(heroes, breakables, undefined, (h, log) => this.onLogContact(h as Hero, log as Spr));
    this.physics.add.overlap(heroes, fires, (h, f) => this.onFire(h as Hero, f as Spr));
    this.physics.add.overlap(heroes, traps, (h, t) => this.onTrap(h as Hero, t as Spr));
    this.physics.add.overlap(heroes, seeds, (_h, s) => this.onSeed(s as Spr));
    this.physics.add.overlap(heroes, checkpoints, (_h, c) => this.onCheckpoint(c as Spr));

    this.team.on('swapped', (x: number, y: number) => {
      this.fx.leaves.explode(14, x, y);
      this.follow();
    });
    this.team.on('respawned', () => this.restoreSeeds());
    this.team.on('changed', () => this.registry.set('hud', this.team.snapshot()));
    this.registry.set('hud', this.team.snapshot());
    this.events.on('hero:dust', (x: number, y: number, strength: number) => this.fx.dust.explode(Math.round(3 + strength * 6), x, y - 2));
    this.follow();

    this.controls = new Controls(this);
    this.events.on(Phaser.Scenes.Events.RESUME, () => this.controls.reset());
    if (data?.curtain) {
      // A HUD entra quando a cortina termina de abrir, pra não ficar boiando em cima das folhas
      new LeafCurtain(this).cover().open().then(() => this.scene.launch('Hud'));
    } else {
      this.scene.launch('Hud');
    }

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
    const hero = this.team.active;
    if (hero.body.top > this.level.height * TILE) this.team.respawn();

    // Respingo ao entrar ou sair da água
    const inWater = this.isWater(hero.centerX, hero.centerY);
    if (inWater !== this.wasInWater) this.fx.splash.explode(10, hero.centerX, Math.floor(hero.centerY / TILE) * TILE + (inWater ? 0 : TILE));
    this.wasInWater = inWater;

    const cam = this.cameras.main;
    for (const { layer, factor } of this.parallax) layer.tilePositionX = cam.scrollX * factor;
  }

  isWater(x: number, y: number): boolean {
    return cellAt(this.level, Math.floor(x / TILE), Math.floor(y / TILE)) === '~';
  }

  isVine(x: number, y: number): boolean {
    return cellAt(this.level, Math.floor(x / TILE), Math.floor(y / TILE)) === 'V';
  }

  // ---------- montagem ----------

  private buildBackground(): void {
    this.parallax = buildParallax(this);
    // Raios de sol entre as copas, respirando devagar
    const rays = this.add.image(0, 0, 'rays').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.bg + 5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.22);
    this.tweens.add({ targets: rays, alpha: 0.1, duration: 4000, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    // Poeirinha de luz flutuando
    this.add.particles(0, 0, 'p-mote', {
      x: { min: 0, max: GAME_WIDTH },
      y: { min: 0, max: GAME_HEIGHT },
      lifespan: 6000,
      speedX: { min: -8, max: 8 },
      speedY: { min: -12, max: -3 },
      alpha: { start: 0.9, end: 0, ease: 'Sine.In' },
      quantity: 1,
      frequency: 220,
      blendMode: Phaser.BlendModes.ADD,
    }).setScrollFactor(0).setDepth(DEPTH.bg + 6);
  }

  private createEffects(): void {
    const burst = (texture: string, cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig) =>
      this.add.particles(0, 0, texture, { emitting: false, ...cfg }).setDepth(DEPTH.fx);
    this.fx = {
      leaves: burst('p-leaf', { speed: { min: 60, max: 180 }, angle: { min: 0, max: 360 }, rotate: { min: 0, max: 360 }, lifespan: 600, gravityY: 260, scale: { start: 1, end: 0.4 } }),
      dust: burst('p-dust', { speed: { min: 20, max: 70 }, angle: { min: 190, max: 350 }, lifespan: 380, gravityY: -40, alpha: { start: 0.8, end: 0 }, scale: { start: 1, end: 0.3 } }),
      embers: burst('p-ember', { speed: { min: 10, max: 30 }, angle: { min: 250, max: 290 }, lifespan: 900, alpha: { start: 1, end: 0 } }),
      petals: burst('p-petal', { speed: { min: 40, max: 140 }, angle: { min: 200, max: 340 }, rotate: { min: 0, max: 360 }, lifespan: 1400, gravityY: 90 }),
      sparkle: burst('p-sparkle', { speed: { min: 30, max: 90 }, angle: { min: 0, max: 360 }, lifespan: 450, scale: { start: 1, end: 0 }, blendMode: Phaser.BlendModes.ADD }),
      splash: burst('p-splash', { speed: { min: 60, max: 160 }, angle: { min: 230, max: 310 }, lifespan: 500, gravityY: 600, alpha: { start: 1, end: 0.2 } }),
    };
    // Brasas subindo de todos os fogos
    this.time.addEvent({
      delay: 180,
      loop: true,
      callback: () => {
        for (const p of this.level.fires) {
          const key = `${p.tx},${p.ty}`;
          if (this.extinguished.has(key)) continue;
          const c = tileCenter(p);
          this.fx.embers.explode(1, c.x + Phaser.Math.Between(-8, 8), c.y - 6);
        }
      },
    });
  }

  /** Luz suave somada por cima (fogo, semente), pulsando. */
  private addGlow(x: number, y: number, color: number, scale: number, alpha: number): Phaser.GameObjects.Image {
    const glow = this.add.image(x, y, 'glow').setTint(color).setScale(scale).setAlpha(alpha).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.light);
    this.tweens.add({ targets: glow, alpha: alpha * 0.6, scale: scale * 0.9, duration: 500 + (hash2(x, y) % 400), yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    return glow;
  }

  private follow(): void {
    this.cameras.main.startFollow(this.team.active, true, 0.15, 0.15);
  }

  // ---------- contatos ----------

  /** Onça em investida atravessa e quebra o tronco inteiro; pros outros é parede. */
  private onLogContact(hero: Hero, log: Spr): boolean {
    if (!(hero instanceof Onca) || !hero.isDashing) return true;
    const p = { tx: Math.floor(log.x / TILE), ty: Math.floor(log.y / TILE) };
    for (const piece of connectedBreakables(this.level, p)) {
      const key = `${piece.tx},${piece.ty}`;
      const spr = this.breakables.get(key);
      if (spr) {
        this.fx.leaves.explode(6, spr.x, spr.y);
        this.fx.dust.explode(8, spr.x, spr.y);
        spr.destroy();
      }
      this.breakables.delete(key);
      // Tira do grid pra não quebrar de novo
      const row = this.level.grid[piece.ty];
      this.level.grid[piece.ty] = row.slice(0, piece.tx) + '.' + row.slice(piece.tx + 1);
    }
    this.cameras.main.shake(140, 0.007);
    return false;
  }

  private onFire(hero: Hero, fire: Spr): void {
    if (hero instanceof Lontra && hero.isWet(this.time.now)) {
      this.fx.splash.explode(12, fire.x, fire.y);
      this.fx.dust.explode(10, fire.x, fire.y);
      this.extinguished.add(`${Math.floor(fire.x / TILE)},${Math.floor(fire.y / TILE)}`);
      (fire.getData('glow') as Phaser.GameObjects.Image).destroy();
      fire.destroy();
      return;
    }
    this.team.hurt(this.time.now, fire.x);
  }

  private onTrap(hero: Hero, trap: Spr): void {
    if (trap.getData('sprung')) return;
    if (hero instanceof Onca && hero.isDashing) {
      this.fx.dust.explode(6, trap.x, trap.y + 10);
      trap.destroy();
      return;
    }
    if (this.team.trap(this.time.now, trap.x)) {
      trap.setData('sprung', true).setFrame(1);
    }
  }

  private onSeed(seed: Spr): void {
    seed.disableBody(true, true);
    (seed.getData('glow') as Phaser.GameObjects.Image).setVisible(false);
    this.fx.sparkle.explode(8, seed.x, seed.y);
    this.seedsSinceCheckpoint.push(seed);
    this.team.collectSeed();
  }

  private onCheckpoint(cp: Spr): void {
    if (cp.getData('reached')) return;
    cp.setData('reached', true);
    cp.play('sapling-grow').once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => cp.play('tree-idle'));
    this.fx.leaves.explode(10, cp.x, cp.y + TILE / 2);
    this.time.delayedCall(450, () => this.fx.petals.explode(18, cp.x, cp.y - 8));
    this.seedsSinceCheckpoint = [];
    this.team.setCheckpoint({ x: cp.x, bottom: cp.y + TILE });
  }

  private restoreSeeds(): void {
    for (const seed of this.seedsSinceCheckpoint) {
      seed.enableBody(false, 0, 0, true, true);
      (seed.getData('glow') as Phaser.GameObjects.Image).setVisible(true);
    }
    this.seedsSinceCheckpoint = [];
  }
}
