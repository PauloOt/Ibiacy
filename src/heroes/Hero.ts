import Phaser from 'phaser';
import { DROWN_MS, JUMP_CUT, MAX_FALL_SPEED } from '../config';
import type { JumpAssist } from '../core/JumpAssist';
import type { HeroId } from '../core/TeamState';
import type { InputFrame } from '../input/Controls';

export interface HeroStats {
  name: string;
  runSpeed: number;
  /** Aceleração no chão e no ar, em px/s² */
  accel: number;
  airAccel: number;
  jumpVelocity: number;
  width: number;
  height: number;
}

/** Estado do ar que é do time, não do bicho: trocar no ar não devolve pulo duplo nem investida. */
export interface AirState {
  doubleJumpUsed: boolean;
  dashUsed: boolean;
  /** Ainda dá pra cortar o pulo soltando o Espaço */
  canCut: boolean;
}

/** O que o herói pode perguntar sobre o mapa. */
export interface LevelQuery {
  isWater(x: number, y: number): boolean;
  isVine(x: number, y: number): boolean;
  /** Cava o tile em (x, y) do mundo, se for terra. Só existe onde dá pra cavar. */
  dig?(x: number, y: number): boolean;
}

export interface HeroContext {
  now: number;
  dt: number;
  input: InputFrame;
  jump: JumpAssist;
  air: AirState;
  level: LevelQuery;
  /** Preso na armadilha */
  rooted: boolean;
  drown(): void;
}

/**
 * Base dos heróis: andar, pular (coyote, buffer, pulo variável) e afundar na água.
 * Cada bicho sobrescreve useAbility() e, quando precisa, special(), handleWater() e onAirJumpPress().
 */
export abstract class Hero extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  abstract readonly id: HeroId;

  facing: 1 | -1 = 1;
  protected inWater = false;
  private submergedMs = 0;
  private wasGrounded = false;
  private lastVy = 0;

  constructor(scene: Phaser.Scene, texture: string, readonly stats: HeroStats) {
    super(scene, 0, 0, texture, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    // O desenho é maior que a caixa de colisão (cauda, cabeça): a caixa fica centrada e com o pé no chão do frame
    this.body.setSize(stats.width, stats.height, false);
    this.body.setOffset((this.width - stats.width) / 2, this.height - stats.height);
    this.body.setMaxVelocity(2000, MAX_FALL_SPEED);
    this.setDepth(3);
    this.sleep();
  }

  get grounded(): boolean {
    return this.body.blocked.down;
  }

  /** Tira o herói de cena (só o ativo tem corpo ligado). */
  sleep(): void {
    this.setActive(false).setVisible(false);
    this.body.enable = false;
    this.body.setAllowGravity(true);
    this.inWater = false;
    this.submergedMs = 0;
    this.onSleep();
  }

  /** Entra em cena com os pés em (x, bottom), herdando a velocidade de quem saiu. */
  wake(x: number, bottom: number, vx: number, vy: number, facing: 1 | -1): void {
    this.setActive(true).setVisible(true).setAlpha(1);
    this.body.enable = true;
    this.body.reset(x, bottom - this.height / 2);
    this.wasGrounded = false;
    this.lastVy = vy;
    this.setVelocity(vx, vy);
    this.face(facing);
  }

  tick(ctx: HeroContext): void {
    this.step(ctx);

    const grounded = this.grounded;
    if (grounded && !this.wasGrounded && this.lastVy > 260) this.dust(Math.min(1, this.lastVy / 700));
    this.wasGrounded = grounded;
    this.lastVy = this.body.velocity.y;

    const key = this.animKey(ctx);
    this.play(`${this.id}-${key}`, true);
    // Corrida mais devagar quando o bicho está acelerando ou freando
    this.anims.timeScale = key === 'run' ? Phaser.Math.Clamp(Math.abs(this.body.velocity.x) / this.stats.runSpeed, 0.5, 1.2) : 1;
  }

  /** Centro da caixa de colisão (o sprite tem a cauda pra fora, então não é o x/y dele). */
  get centerX(): number {
    return this.body.center.x;
  }

  get centerY(): number {
    return this.body.center.y;
  }

  /** Qual animação tocar neste frame: idle, run, jump, fall ou uma própria do bicho. */
  protected animKey(ctx: HeroContext): string {
    if (ctx.rooted) return 'idle';
    if (!this.grounded) return this.body.velocity.y < 0 ? 'jump' : 'fall';
    return Math.abs(this.body.velocity.x) > 25 ? 'run' : 'idle';
  }

  protected dust(strength: number): void {
    this.scene.events.emit('hero:dust', this.body.center.x, this.body.bottom, strength);
  }

  private step(ctx: HeroContext): void {
    const { now, input, air } = ctx;
    const grounded = this.grounded;
    if (grounded) {
      air.doubleJumpUsed = false;
      air.dashUsed = false;
    }
    if (input.jumpPressed) ctx.jump.press(now);

    const wasInWater = this.inWater;
    this.inWater = ctx.level.isWater(this.centerX, this.centerY);
    if (wasInWater && !this.inWater) {
      this.body.setAllowGravity(true);
      this.submergedMs = 0;
      this.onLeaveWater(ctx);
    }
    ctx.jump.update(now, grounded && !this.inWater);

    if (ctx.rooted) {
      this.setVelocityX(0);
      return;
    }
    if (this.inWater) {
      this.handleWater(ctx);
      return;
    }
    if (this.special(ctx)) return;

    this.run(ctx);
    if (ctx.jump.tryGroundJump(now)) {
      this.jump(ctx, this.stats.jumpVelocity);
      this.dust(0.5);
    }
    else if (input.jumpPressed) this.onAirJumpPress(ctx);

    // Pulo variável: soltou subindo, corta uma vez
    if (air.canCut && !input.jumpHeld && this.body.velocity.y < 0) {
      this.setVelocityY(this.body.velocity.y * JUMP_CUT);
      air.canCut = false;
    }
    if (this.body.velocity.y >= 0) air.canCut = false;

    if (input.abilityPressed) this.useAbility(ctx);
  }

  protected run(ctx: HeroContext): void {
    const dir = this.inputDir(ctx.input);
    if (dir !== 0) this.face(dir);
    const accel = (this.grounded ? this.stats.accel : this.stats.airAccel) * (ctx.dt / 1000);
    this.setVelocityX(approach(this.body.velocity.x, dir * this.stats.runSpeed, accel));
  }

  protected jump(ctx: HeroContext, velocity: number): void {
    this.setVelocityY(-velocity);
    ctx.air.canCut = true;
  }

  protected inputDir(input: InputFrame): -1 | 0 | 1 {
    return ((input.right ? 1 : 0) - (input.left ? 1 : 0)) as -1 | 0 | 1;
  }

  protected face(dir: 1 | -1): void {
    this.facing = dir;
    this.setFlipX(dir < 0);
  }

  /** Padrão: não nada. Afunda devagar e se afoga. A lontra sobrescreve. */
  protected handleWater(ctx: HeroContext): void {
    this.body.setAllowGravity(true);
    this.setVelocityX(this.body.velocity.x * 0.85);
    this.setVelocityY(Math.min(this.body.velocity.y, 120));
    this.submergedMs += ctx.dt;
    if (this.submergedMs >= DROWN_MS) ctx.drown();
  }

  /** Movimento próprio (investida, escalada). true = já cuidou deste frame. */
  protected special(_ctx: HeroContext): boolean {
    return false;
  }

  /** Apertou pulo no ar sem coyote. Padrão: fica no buffer pro próximo pouso. */
  protected onAirJumpPress(_ctx: HeroContext): void {}

  protected onLeaveWater(_ctx: HeroContext): void {}

  protected onSleep(): void {}

  abstract useAbility(ctx: HeroContext): void;
}

export function approach(value: number, target: number, step: number): number {
  if (value < target) return Math.min(value + step, target);
  return Math.max(value - step, target);
}
