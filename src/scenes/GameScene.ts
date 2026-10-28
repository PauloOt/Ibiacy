import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, TILE } from '../config';
import { hash2 } from '../art/rng';
import { cellAt, connectedBreakables, parseLevel, type ParsedLevel } from '../core/levelParser';
import { generateWorld, type Frente, type World, type WorldOptions } from '../core/worldgen';
import type { HeroId } from '../core/TeamState';
import type { Hero, LevelQuery } from '../heroes/Hero';
import { Lontra } from '../heroes/Lontra';
import { Mico } from '../heroes/Mico';
import { Onca } from '../heroes/Onca';
import { Controls } from '../input/Controls';
import { TeamManager } from '../team/TeamManager';
import { LeafCurtain } from '../ui/LeafCurtain';
import { mmss, woodPanel } from '../ui/panel';
import { buildParallax, DEPTH, tileCenter, type Parallax } from './terrain';
import { WorldMap } from './worldmap';

const RECORD_KEY = 'ibiacy-recorde';

export interface GameData {
  /** Veio do hub: começa com a cortina de folhas fechada */
  curtain?: boolean;
  /** Missão do Ubiraçá (volta pro hub com a recompensa dela) */
  missao?: string;
  /** O bicho escolhido no Novo jogo (sem ele vale ?heroi=mico|onca|lontra, ou a onça) */
  heroi?: HeroId;
  /** Semente do mundo (a missão escolhe; sem ela vale ?semente=N ou uma aleatória) */
  seed?: number;
  /** Tamanho e trechos do mundo, por missão */
  world?: Omit<WorldOptions, 'seed'>;
}

type Spr = Phaser.Physics.Arcade.Sprite;

/** Frente de fogo andando pela superfície (todos fogem; o mico também pode subir nas copas). */
interface FrontState {
  f: Frente;
  x: number;
  on: boolean;
  done: boolean;
  col: number;
  flames: Phaser.GameObjects.Sprite[];
  glow: Phaser.GameObjects.Image;
}

const MACHINE_SPEED = 70;
const FRONT_SPEED = 120;
/** Correnteza: quanto ela arrasta por segundo. A lontra nada contra; o resto é levado. */
const DRIFT = { lontra: 60, outros: 170 };
const DISARM_MS = 1000;
type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;

export class GameScene extends Phaser.Scene implements LevelQuery {
  private world!: World;
  private level!: ParsedLevel;
  private map!: WorldMap;
  private metasDone = 0;
  private startedAt = 0;
  private finished = false;
  private missao?: string;
  private wasUp = false;
  private machines: Spr[] = [];
  private traps: Spr[] = [];
  /** Quanto tempo o bicho está segurando ↓ do lado de uma armadilha (desarmar) */
  private disarmMs = 0;
  private fronts: FrontState[] = [];
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

  create(data: GameData = {}): void {
    const fromUrl = Number(new URLSearchParams(location.search).get('semente'));
    const seed = data.seed ?? (fromUrl || Math.floor(Math.random() * 1e9));
    this.world = generateWorld({ ...data.world, seed });
    this.level = parseLevel(this.world.rows);
    this.metasDone = 0;
    this.finished = false;
    this.missao = data.missao;
    this.wasUp = false;
    this.breakables.clear();
    this.machines = [];
    this.traps = [];
    this.disarmMs = 0;
    this.extinguished.clear();
    this.seedsSinceCheckpoint = [];
    console.info(`[ibiacy] mundo da semente ${seed}`);
    const worldW = this.level.width * TILE;
    const worldH = this.level.height * TILE;
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.physics.world.setBounds(0, 0, worldW, worldH + TILE * 4);

    this.buildBackground();
    this.map = new WorldMap(this, this.level, this.world.surface);
    // Paredes invisíveis nas pontas do mundo (no céu também)
    const edges = this.physics.add.staticGroup();
    edges.add(this.add.zone(-TILE / 2, worldH / 2, TILE, worldH * 2));
    edges.add(this.add.zone(worldW + TILE / 2, worldH / 2, TILE, worldH * 2));
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
      this.traps.push(trap);
    }

    // Máquinas de desmatamento: patrulham o chão e viram na beira e na parede
    const machines = this.physics.add.group();
    for (const p of this.level.machines) {
      const m = (machines.create(p.tx * TILE + TILE / 2, (p.ty + 1) * TILE - 28, 'maquina', 0) as Spr).setDepth(DEPTH.object);
      m.body!.setSize(64, 44).setOffset(8, 12);
      m.play({ key: 'maquina-run', startFrame: hash2(p.tx, p.ty) % 4 }).setData('dir', -1);
      this.machines.push(m);
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

    // Um bicho só: o escolhido no Novo jogo
    const heroi = data.heroi ?? ((new URLSearchParams(location.search).get('heroi') as HeroId | null) ?? 'onca');
    const heroes: Hero[] = [heroi === 'mico' ? new Mico(this) : heroi === 'lontra' ? new Lontra(this) : new Onca(this)];
    heroes.forEach((h) => h.setDepth(DEPTH.hero));
    const start = tileCenter(this.level.start);
    this.team = new TeamManager(heroes, { x: start.x, bottom: (this.level.start.ty + 1) * TILE });

    this.physics.add.collider(heroes, edges);
    this.physics.add.collider(heroes, this.map.front, undefined, (h, t) => this.onTerrain(h as Hero, t as Phaser.Tilemaps.Tile));
    this.physics.add.collider(heroes, breakables, undefined, (h, log) => this.onLogContact(h as Hero, log as Spr));
    this.physics.add.overlap(heroes, fires, (h, f) => this.onFire(h as Hero, f as Spr));
    this.physics.add.overlap(heroes, traps, (h, t) => this.onTrap(h as Hero, t as Spr));
    this.physics.add.overlap(heroes, seeds, (_h, s) => this.onSeed(s as Spr));
    this.physics.add.overlap(heroes, checkpoints, (_h, c) => this.onCheckpoint(c as Spr));
    this.physics.add.collider(machines, this.map.front);
    this.physics.add.collider(machines, edges);
    this.physics.add.overlap(heroes, machines, (h, m) => this.onMachine(h as Hero, m as Spr));
    this.buildFronts();
    this.buildCurrents();

    this.team.on('swapped', (x: number, y: number) => {
      this.fx.leaves.explode(14, x, y);
      this.follow();
    });
    this.team.on('respawned', () => {
      this.restoreSeeds();
      this.resetFronts();
    });
    this.team.on('changed', () => this.registry.set('hud', this.team.snapshot()));
    this.registry.set('hud', this.team.snapshot());
    this.registry.set('metas', { done: 0, total: this.world.metas });
    this.startedAt = this.time.now;
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
    const upPressed = input.up && !this.wasUp;
    this.wasUp = input.up;
    if (this.finished) {
      if (upPressed) this.backToHub();
      return;
    }
    if (input.pausePressed) {
      this.scene.pause();
      this.scene.launch('Pause');
      return;
    }
    // Delta limitado: aba voltando do segundo plano não teleporta o herói
    this.team.update(input, time, Math.min(delta, 50), this);
    const hero = this.team.active;
    if (hero.body.top > this.level.height * TILE) this.team.respawn();

    this.updateMachines();
    this.updateFronts(time, delta);
    this.updateCurrents(hero, delta);
    this.updateDisarm(input.down, hero, delta);

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

  /** A onça cava pra baixo (↓ + J): terra sai, pedra não. */
  dig(x: number, y: number): boolean {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (!this.map.dig(tx, ty)) return false;
    this.fx.dust.explode(8, tx * TILE + TILE / 2, ty * TILE + TILE / 2);
    return true;
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

  /** Qualquer bicho molhado apaga; a onça também abafa com a investida. */
  private onFire(hero: Hero, fire: Spr): void {
    if (hero.isWet(this.time.now) || (hero instanceof Onca && hero.isDashing)) {
      this.fx.splash.explode(12, fire.x, fire.y);
      this.fx.dust.explode(10, fire.x, fire.y);
      this.extinguished.add(`${Math.floor(fire.x / TILE)},${Math.floor(fire.y / TILE)}`);
      (fire.getData('glow') as Phaser.GameObjects.Image).destroy();
      fire.destroy();
      this.metaDone();
      return;
    }
    this.team.hurt(this.time.now, fire.x);
  }

  /**
   * Contato com o chão do mundo. Onça em investida atravessa terra cavando o que está na frente
   * (não o chão embaixo dela); pedra, copa e galho seguram normal.
   */
  private onTerrain(hero: Hero, tile: Phaser.Tilemaps.Tile): boolean {
    if (!(hero instanceof Onca) || !hero.isDashing) return true;
    const b = hero.body;
    const ahead = hero.dashDirection > 0 ? tile.pixelX >= b.center.x : tile.pixelX + TILE <= b.center.x;
    const beside = tile.pixelY < b.bottom - 4 && tile.pixelY + TILE > b.top + 4;
    if (!ahead || !beside || !this.map.dig(tile.x, tile.y)) return true;
    this.fx.dust.explode(6, tile.pixelX + TILE / 2, tile.pixelY + TILE / 2);
    return false;
  }

  private onTrap(hero: Hero, trap: Spr): void {
    // A investida quebra até armadilha já fechada
    if (hero instanceof Onca && hero.isDashing) {
      this.fx.dust.explode(6, trap.x, trap.y + 10);
      trap.destroy();
      this.metaDone();
      return;
    }
    if (trap.getData('sprung')) return;
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

  // ---------- máquinas ----------

  private updateMachines(): void {
    for (const m of this.machines) {
      if (m.getData('off') || !m.body) continue;
      const body = m.body as Phaser.Physics.Arcade.Body;
      let dir = m.getData('dir') as 1 | -1;
      // Vira na parede, na beira do chão e antes da água
      const fx = dir > 0 ? body.right + 4 : body.left - 4;
      const below = cellAt(this.level, Math.floor(fx / TILE), Math.floor((body.bottom + 4) / TILE));
      const ahead = cellAt(this.level, Math.floor(fx / TILE), Math.floor((body.bottom - 8) / TILE));
      const blocked = dir > 0 ? body.blocked.right : body.blocked.left;
      if (body.blocked.down && (blocked || !'#S%='.includes(below) || ahead === '~')) dir = (dir * -1) as 1 | -1;
      m.setData('dir', dir).setVelocityX(dir * MACHINE_SPEED).setFlipX(dir > 0);
    }
  }

  /** A investida da onça desliga; qualquer bicho desliga pulando em cima. O resto toma dano. */
  private onMachine(hero: Hero, m: Spr): void {
    if (m.getData('off')) return;
    const stomp = hero.body.velocity.y > 100 && hero.body.bottom <= m.body!.top + 16;
    if ((hero instanceof Onca && hero.isDashing) || stomp) {
      if (stomp) hero.setVelocityY(-420);
      m.setData('off', true).setVelocityX(0).setTint(0x9a9a9a);
      m.anims.stop();
      m.setFrame(4);
      this.fx.dust.explode(14, m.x, m.y);
      this.fx.sparkle.explode(10, m.x - 10, m.y);
      this.cameras.main.shake(140, 0.006);
      this.metaDone();
      return;
    }
    this.team.hurt(this.time.now, m.x);
  }

  // ---------- frente de fogo ----------

  private buildFronts(): void {
    this.fronts = this.world.frentes.map((f) => ({
      f,
      x: f.start * TILE,
      on: false,
      done: false,
      col: f.start,
      flames: Array.from({ length: 8 }, (_, i) => this.add.sprite(0, 0, 'fire').setDepth(DEPTH.object + 0.5).play({ key: 'fire-burn', startFrame: i % 6 }).setVisible(false)),
      glow: this.add.image(0, 0, 'glow').setTint(0xff7a2a).setScale(3).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.light),
    }));
  }

  private resetFronts(): void {
    for (const fr of this.fronts) {
      if (fr.done) continue;
      fr.on = false;
      fr.x = fr.f.start * TILE;
      fr.col = fr.f.start;
      fr.flames.forEach((s) => s.setVisible(false));
      fr.glow.setAlpha(0);
    }
  }

  private updateFronts(time: number, delta: number): void {
    const hero = this.team.active;
    for (const fr of this.fronts) {
      if (fr.done) continue;
      if (!fr.on) {
        if (hero.centerX > fr.f.trigger * TILE) fr.on = true;
        else continue;
      }
      fr.x += (FRONT_SPEED * Math.min(delta, 50)) / 1000;
      const col = Math.floor(fr.x / TILE);
      // Chão queimado atrás da frente
      for (; fr.col < col; fr.col++) this.map.burn(fr.col);
      if (col >= fr.f.stop) {
        fr.done = true;
        this.tweens.add({ targets: [...fr.flames, fr.glow], alpha: 0, duration: 600, onComplete: () => fr.flames.forEach((s) => s.destroy()) });
        continue;
      }
      // Chamas nas 4 colunas da frente, 2 de altura, seguindo o relevo
      fr.flames.forEach((s, i) => {
        const c = col - (i >> 1);
        const top = this.world.surface[Math.max(0, c)];
        s.setVisible(true).setPosition(c * TILE + TILE / 2 + (i % 2) * 4, (top - 1 - (i % 2)) * TILE + TILE / 2 + 6);
      });
      fr.glow.setAlpha(0.6).setPosition(fr.x, (this.world.surface[col] - 1) * TILE);
      if (time % 4 < 1) this.fx.embers.explode(2, fr.x - Phaser.Math.Between(0, 3 * TILE), (this.world.surface[col] - 2) * TILE);
      // Encostou na frente perto do chão: dano e empurrão pra frente (lá em cima nas copas não pega)
      const hc = Math.floor(hero.centerX / TILE);
      const nearGround = hero.body.bottom > (this.world.surface[Math.max(0, hc)] - 3) * TILE;
      if (nearGround && hero.centerX > fr.x - 4 * TILE && hero.centerX < fr.x + TILE / 2) this.team.hurt(this.time.now, fr.x - 6 * TILE);
    }
  }

  // ---------- correnteza ----------

  private buildCurrents(): void {
    for (const c of this.world.correntes) {
      this.add.particles(0, 0, 'p-splash', {
        x: { min: c.x0 * TILE, max: (c.x1 + 1) * TILE },
        y: { min: c.y0 * TILE + 2, max: c.y0 * TILE + 10 },
        speedX: { min: c.dir * 110, max: c.dir * 160 },
        lifespan: 1400,
        alpha: { start: 0.8, end: 0 },
        frequency: 70,
      }).setDepth(DEPTH.water + 0.5);
    }
  }

  private updateCurrents(hero: Hero, delta: number): void {
    if (!this.isWater(hero.centerX, hero.centerY)) return;
    const tx = Math.floor(hero.centerX / TILE);
    const ty = Math.floor(hero.centerY / TILE);
    for (const c of this.world.correntes) {
      if (tx < c.x0 || tx > c.x1 || ty < c.y0 || ty > c.y1) continue;
      hero.x += (c.dir * (hero instanceof Lontra ? DRIFT.lontra : DRIFT.outros) * Math.min(delta, 50)) / 1000;
    }
  }

  // ---------- desarmar armadilha (astúcia: qualquer bicho) ----------

  /** Segurando ↓ parado do lado de uma armadilha por 1 s, ela desarma. */
  private updateDisarm(down: boolean, hero: Hero, delta: number): void {
    const trap = down && hero.grounded
      ? this.traps.find((t) => t.active && Math.abs(t.x - hero.centerX) < TILE * 1.6 && Math.abs(t.y - hero.centerY) < TILE)
      : undefined;
    if (!trap) {
      this.disarmMs = 0;
      return;
    }
    this.disarmMs += delta;
    if (this.disarmMs % 300 < delta) this.fx.dust.explode(2, trap.x, trap.y + 8);
    if (this.disarmMs < DISARM_MS) return;
    this.disarmMs = 0;
    this.fx.sparkle.explode(8, trap.x, trap.y);
    trap.destroy();
    this.metaDone();
  }

  // ---------- metas e fim ----------

  private metaDone(): void {
    this.metasDone++;
    this.registry.set('metas', { done: this.metasDone, total: this.world.metas });
    if (this.metasDone >= this.world.metas) this.finish();
  }

  /** Todas as metas limpas: grava o recorde (se for o melhor tempo) e mostra o painel. */
  private finish(): void {
    this.finished = true;
    const hero = this.team.active;
    hero.setVelocity(0, hero.body.velocity.y);
    const tempoMs = this.time.now - this.startedAt;
    const sementes = this.team.state.seeds;
    const total = this.level.seeds.length;
    let best = true;
    try {
      const old = JSON.parse(localStorage.getItem(RECORD_KEY) ?? 'null') as { tempoMs: number } | null;
      best = !old || tempoMs < old.tempoMs;
      if (best) localStorage.setItem(RECORD_KEY, JSON.stringify({ tempoMs, sementes, total }));
    } catch {
      // Sem localStorage o recorde só não fica guardado
    }
    const panel = woodPanel(this, {
      title: 'A mata está protegida',
      rows: [['Tempo', mmss(tempoMs)], ['Sementes', `${sementes} / ${total}`]],
      note: best ? 'Novo recorde!' : undefined,
      button: '↑  Voltar',
    }).setAlpha(0);
    this.tweens.add({ targets: panel, alpha: 1, duration: 200 });
  }

  /** Volta pro hub com o que foi coletado; o hub dá a recompensa da missão. */
  private backToHub(): void {
    this.finished = false;
    const resultado = { missao: this.missao, sementes: this.team.state.seeds };
    new LeafCurtain(this).close().then(() => {
      this.scene.stop('Hud');
      this.scene.start('Hub', { resultado });
    });
  }
}
