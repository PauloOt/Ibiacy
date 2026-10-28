import { COYOTE_MS, JUMP_BUFFER_MS } from '../config';

/**
 * Coyote time + jump buffer, sem Phaser (dá pra testar no Node).
 * Fica no time, não no herói: trocar de bicho no ar mantém a janela de pulo.
 */
export class JumpAssist {
  private lastGroundedAt = -Infinity;
  private lastPressedAt = -Infinity;

  constructor(
    private readonly coyoteMs = COYOTE_MS,
    private readonly bufferMs = JUMP_BUFFER_MS,
  ) {}

  /** Chamar todo frame. */
  update(now: number, grounded: boolean): void {
    if (grounded) this.lastGroundedAt = now;
  }

  press(now: number): void {
    this.lastPressedAt = now;
  }

  hasBufferedPress(now: number): boolean {
    return now - this.lastPressedAt <= this.bufferMs;
  }

  /** Pulo de chão: aperto recente + chão recente. Consome os dois pra não pular duas vezes. */
  tryGroundJump(now: number): boolean {
    const canGround = now - this.lastGroundedAt <= this.coyoteMs;
    if (this.hasBufferedPress(now) && canGround) {
      this.reset();
      return true;
    }
    return false;
  }

  /** O aperto virou outra coisa (pulo duplo, sair do cipó, sair da água). */
  consumePress(): void {
    this.lastPressedAt = -Infinity;
  }

  /** Esquece tudo (respawn, agarrou no cipó). */
  reset(): void {
    this.lastPressedAt = -Infinity;
    this.lastGroundedAt = -Infinity;
  }
}
