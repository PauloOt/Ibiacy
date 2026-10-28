import type Phaser from 'phaser';
import { Hero, type HeroContext } from './Hero';

const DASH_SPEED = 600;
const DASH_MS = 180;
// No chão a investida volta na hora; isto evita metralhar
const DASH_COOLDOWN_MS = 400;

/** Onça-pintada: força. Investida que quebra tronco podre, armadilha e máquina. Pula baixo, não escala. */
export class Onca extends Hero {
  readonly id = 'onca';
  private dashUntil = -Infinity;
  private nextDashAt = 0;
  private dashDir: 1 | -1 = 1;
  private dashing = false;

  constructor(scene: Phaser.Scene) {
    super(scene, 'onca', {
      name: 'Onça-pintada',
      runSpeed: 250,
      accel: 2000,
      airAccel: 1200,
      jumpVelocity: 420,
      width: 38,
      height: 24,
    });
  }

  get isDashing(): boolean {
    return this.dashing;
  }

  useAbility(ctx: HeroContext): void {
    if (ctx.air.dashUsed || ctx.now < this.nextDashAt) return;
    ctx.air.dashUsed = true;
    ctx.air.canCut = false;
    this.dashUntil = ctx.now + DASH_MS;
    this.nextDashAt = ctx.now + DASH_COOLDOWN_MS;
    const dir = this.inputDir(ctx.input);
    this.dashDir = dir !== 0 ? dir : this.facing;
    this.face(this.dashDir);
    this.dashing = true;
  }

  protected special(ctx: HeroContext): boolean {
    if (ctx.now < this.dashUntil) {
      this.body.setAllowGravity(false);
      this.setVelocity(this.dashDir * DASH_SPEED, 0);
      return true;
    }
    if (this.dashing) {
      this.endDash();
      this.setVelocityX(this.dashDir * this.stats.runSpeed);
    }
    return false;
  }

  protected animKey(ctx: HeroContext): string {
    return this.dashing ? 'dash' : super.animKey(ctx);
  }

  protected onSleep(): void {
    this.dashUntil = -Infinity;
    this.endDash();
  }

  private endDash(): void {
    this.dashing = false;
    this.body?.setAllowGravity(true);
  }
}
