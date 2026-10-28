import type Phaser from 'phaser';
import { WET_MS } from '../config';
import { approach, Hero, type HeroContext } from './Hero';

const SWIM_SPEED = 200;
const SWIM_ACCEL = 900;
const DIVE_SPEED = 380;
// Parada na água, a lontra boia devagar pra cima
const FLOAT_SPEED = -30;

/** Lontra-neotropical: água. Nada e mergulha sem se afogar; lenta em terra. */
export class Lontra extends Hero {
  readonly id = 'lontra';
  private wetUntil = -Infinity;

  constructor(scene: Phaser.Scene) {
    super(scene, 'lontra', {
      name: 'Lontra-neotropical',
      runSpeed: 150,
      accel: 1600,
      airAccel: 1000,
      jumpVelocity: 470,
      width: 32,
      height: 18,
    });
  }

  isWet(now: number): boolean {
    return now < this.wetUntil;
  }

  protected handleWater(ctx: HeroContext): void {
    const { input } = ctx;
    this.body.setAllowGravity(false);
    const step = SWIM_ACCEL * (ctx.dt / 1000);

    const dir = this.inputDir(input);
    if (dir !== 0) this.face(dir);
    this.setVelocityX(approach(this.body.velocity.x, dir * SWIM_SPEED, step));

    const vertical = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    const targetY = vertical === 0 ? FLOAT_SPEED : vertical * SWIM_SPEED;
    this.setVelocityY(approach(this.body.velocity.y, targetY, step));

    // Cabeça fora d'água: dá pra pular pra margem
    const headOut = !ctx.level.isWater(this.centerX, this.body.top + 2);
    if (headOut && ctx.jump.hasBufferedPress(ctx.now)) {
      ctx.jump.consumePress();
      this.body.setAllowGravity(true);
      this.jump(ctx, this.stats.jumpVelocity);
    }

    if (input.abilityPressed) this.setVelocityY(DIVE_SPEED);
  }

  protected animKey(ctx: HeroContext): string {
    return this.inWater ? 'swim' : super.animKey(ctx);
  }

  protected onLeaveWater(ctx: HeroContext): void {
    this.wetUntil = ctx.now + WET_MS;
  }

  useAbility(): void {
    // Fora d'água não faz nada; dentro, o mergulho sai em handleWater().
  }

  protected onSleep(): void {
    this.wetUntil = -Infinity;
  }
}
