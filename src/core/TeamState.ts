import { INVULNERABLE_MS, MAX_HEARTS, SWAP_COOLDOWN_MS } from '../config';

export type HeroId = 'mico' | 'onca' | 'lontra';
export type HurtResult = 'ignored' | 'hurt' | 'dead';

/** Regras do time sem Phaser: vida compartilhada, troca com cooldown e sementes por checkpoint. */
export class TeamState {
  hearts = MAX_HEARTS;
  seeds = 0;
  activeIndex = 0;

  private seedsAtCheckpoint = 0;
  private invulnerableUntil = -Infinity;
  private lastSwapAt = -Infinity;

  constructor(public readonly roster: readonly HeroId[]) {
    if (roster.length === 0) throw new Error('O time precisa de pelo menos um herói');
  }

  get active(): HeroId {
    return this.roster[this.activeIndex];
  }

  isInvulnerable(now: number): boolean {
    return now < this.invulnerableUntil;
  }

  hurt(now: number, amount = 1): HurtResult {
    if (this.isInvulnerable(now)) return 'ignored';
    this.hearts = Math.max(0, this.hearts - amount);
    if (this.hearts === 0) return 'dead';
    this.invulnerableUntil = now + INVULNERABLE_MS;
    return 'hurt';
  }

  canSwap(now: number): boolean {
    return now - this.lastSwapAt >= SWAP_COOLDOWN_MS;
  }

  /** Devolve true se trocou. Mesmo herói, índice inválido ou cooldown não contam. */
  swapTo(index: number, now: number): boolean {
    if (index < 0 || index >= this.roster.length) return false;
    if (index === this.activeIndex || !this.canSwap(now)) return false;
    this.activeIndex = index;
    this.lastSwapAt = now;
    return true;
  }

  cycle(direction: 1 | -1, now: number): boolean {
    const n = this.roster.length;
    return this.swapTo((this.activeIndex + direction + n) % n, now);
  }

  collectSeed(): void {
    this.seeds++;
  }

  reachCheckpoint(): void {
    this.seedsAtCheckpoint = this.seeds;
  }

  /** Volta no checkpoint com vida cheia; sementes pegas depois dele se perdem. */
  respawn(): void {
    this.hearts = MAX_HEARTS;
    this.seeds = this.seedsAtCheckpoint;
    this.invulnerableUntil = -Infinity;
  }
}
