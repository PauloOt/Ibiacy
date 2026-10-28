import type Phaser from 'phaser';
import { Hero, type HeroContext } from './Hero';

const CLIMB_SPEED = 150;
// Impulso quando o cipó acaba no alto, pra subir na borda
const LEDGE_HOP = 260;

/** Mico-leão-dourado: agilidade. Pulo duplo e escala cipó. Não quebra nada e afunda na água. */
export class Mico extends Hero {
  readonly id = 'mico';
  private climbing = false;

  constructor(scene: Phaser.Scene) {
    super(scene, 'mico', {
      name: 'Mico-leão-dourado',
      runSpeed: 230,
      accel: 2400,
      airAccel: 1600,
      jumpVelocity: 520,
      width: 20,
      height: 26,
    });
  }

  protected onAirJumpPress(ctx: HeroContext): void {
    if (ctx.air.doubleJumpUsed) return;
    ctx.air.doubleJumpUsed = true;
    ctx.jump.consumePress();
    this.jump(ctx, this.stats.jumpVelocity * 0.9);
  }

  protected special(ctx: HeroContext): boolean {
    const { input } = ctx;
    const onVine = ctx.level.isVine(this.x, this.y);

    // Agarra com ↑ ou com a habilidade; agarrar devolve o pulo duplo
    if (!this.climbing && onVine && (input.up || input.abilityPressed)) {
      this.climbing = true;
      ctx.air.doubleJumpUsed = false;
      ctx.jump.reset();
    }
    if (!this.climbing) return false;

    if (!onVine) {
      this.stopClimbing();
      if (input.up) this.setVelocityY(-LEDGE_HOP);
      return false;
    }
    if (input.jumpPressed) {
      this.stopClimbing();
      ctx.jump.consumePress();
      this.setVelocityX(this.inputDir(input) * this.stats.runSpeed);
      this.jump(ctx, this.stats.jumpVelocity);
      return true;
    }

    this.body.setAllowGravity(false);
    this.setVelocity(0, input.up ? -CLIMB_SPEED : input.down ? CLIMB_SPEED : 0);
    return true;
  }

  useAbility(): void {
    // A habilidade do mico (agarrar) é tratada em special(); o pulo duplo sai no Espaço.
  }

  protected onSleep(): void {
    this.stopClimbing();
  }

  private stopClimbing(): void {
    this.climbing = false;
    this.body?.setAllowGravity(true);
  }
}
